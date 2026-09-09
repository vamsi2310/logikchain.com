import { db, FieldValue } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { verifyCustody, type VerificationInput } from "../lib/custody";
import { randomDigits, randomId } from "../lib/crypto";
import { remember, requireIdempotencyKey, shortCircuit } from "../lib/idempotency";
import { notify } from "../lib/notify";
import {
  assertPeriodOpen,
  loadEffectiveTaxProfile,
  nextDocumentNumber,
  resolveRecipientState,
  splitGst,
} from "../lib/tax";
import { nowIso } from "../lib/time";
import { requireNonEmpty } from "../lib/validate";
import { createPaymentIntentInternal } from "../lib/paymentIntent";

async function applyDiscount(code: string | undefined, subTotal: number): Promise<number> {
  if (!code) return subTotal;
  const snap = await db.collection(Col.Discounts).doc(code).get();
  if (!snap.exists) fail("INVALID_DISCOUNT");
  const d = snap.data() as { status?: string; expiresAt?: string; valueType?: string; value?: number };
  if (d.status && d.status !== "active") fail("INVALID_DISCOUNT");
  if (d.expiresAt && new Date(d.expiresAt).getTime() < Date.now()) fail("INVALID_DISCOUNT");
  if (d.valueType === "percent") return Math.max(0, subTotal - (subTotal * Number(d.value ?? 0)) / 100);
  return Math.max(0, subTotal - Number(d.value ?? 0));
}

export async function placeOrder(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["buyer"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const village = requireNonEmpty(ctx.data.village, "village");
  const merchantId = requireNonEmpty(ctx.data.merchantId, "merchantId");
  const items = ctx.data.items as Array<{ productId: string; quantity: number }>;
  const paymentMode = ctx.data.paymentMode as string;
  if (paymentMode !== "online" && paymentMode !== "cash_on_pickup") {
    fail("INVALID_ARGUMENT", 'paymentMode is not "online" or "cash_on_pickup"');
  }
  if (!Array.isArray(items) || items.length === 0) fail("INVALID_ARGUMENT", "items required");

  const orderId = randomId("ord");
  const pickupCode = randomDigits(6);

  const result = await db.runTransaction(async (tx) => {
    const gigSnap = await tx.get(db.collection(Col.Gigs).doc(gigId));
    if (!gigSnap.exists) fail("NOT_FOUND", "Gig not found");
    const gig = gigSnap.data() as {
      status: string;
      supplierId: string;
      supplierName?: string;
      pamphletId: string;
      villages?: Array<{ villageId: string }>;
      merchantIds?: string[];
    };
    if (gig.status !== "created" && gig.status !== "started") fail("NOT_SERVICEABLE");
    if (!(gig.villages ?? []).some((v) => v.villageId === village)) fail("NOT_SERVICEABLE");
    if (caller.villageId !== village) fail("NOT_SERVICEABLE");

    const merchantSnap = await tx.get(db.collection(Col.UserProfiles).doc(merchantId));
    if (!merchantSnap.exists) fail("NOT_FOUND");
    const merchant = merchantSnap.data() as {
      role: string;
      status: string;
      villageId?: string;
      shopDetails?: string;
      address?: string;
      gstin?: string;
      name?: string;
    };
    if (
      merchant.role !== "merchant" ||
      merchant.status !== "approved" ||
      !(gig.merchantIds ?? []).includes(merchantId) ||
      merchant.villageId !== village
    ) {
      fail("NOT_SERVICEABLE");
    }

    const pamphletSnap = await tx.get(db.collection(Col.Pamphlets).doc(gig.pamphletId));
    if (!pamphletSnap.exists) fail("NOT_SERVICEABLE");
    const pamphlet = pamphletSnap.data() as {
      supplierId: string;
      promotedProducts?: Array<{ productId: string; discountedPrice: number; name?: string }>;
    };
    if (pamphlet.supplierId !== gig.supplierId) fail("NOT_SERVICEABLE");

    const supplierSnap = await tx.get(db.collection(Col.UserProfiles).doc(gig.supplierId));
    const supplier = supplierSnap.data() as { gstin?: string; address?: string; name?: string };
    if (!supplier.gstin) fail("INVALID_STATE", "Supplier does not have a registered GSTIN");

    let base = 0;
    const orderItems: Array<Record<string, unknown>> = [];
    let gstRate = 18;
    for (const line of items) {
      const promo = (pamphlet.promotedProducts ?? []).find((p) => p.productId === line.productId);
      if (!promo) fail("NOT_SERVICEABLE");
      const productSnap = await tx.get(db.collection(Col.Products).doc(line.productId));
      if (!productSnap.exists) fail("NOT_FOUND", "Product not found");
      const product = productSnap.data() as {
        supplierId: string;
        stock: number;
        hsnCode?: string;
        unit?: string;
        gstRate?: number;
        name?: string;
      };
      if (product.supplierId !== gig.supplierId) fail("NOT_SERVICEABLE");
      if (product.stock < line.quantity) fail("OUT_OF_STOCK");
      tx.update(productSnap.ref, { stock: product.stock - line.quantity });
      base += promo.discountedPrice * line.quantity;
      if (product.gstRate) gstRate = product.gstRate;
      orderItems.push({
        productId: line.productId,
        name: promo.name ?? product.name,
        quantity: line.quantity,
        price: promo.discountedPrice,
        hsnCode: product.hsnCode,
        unit: product.unit,
      });
    }
    return { gig, merchant, supplier, orderItems, base, gstRate };
  });

  const taxProfile = await loadEffectiveTaxProfile(result.gig.supplierId);
  await assertPeriodOpen();
  const subTotal = await applyDiscount(ctx.data.discountCode as string | undefined, result.base);
  const villageSnap = await db.collection(Col.Villages).doc(village).get();
  const resolved = resolveRecipientState({
    basis: (taxProfile.placeOfSupplyBasis as { buyerOrder?: string } | undefined)?.buyerOrder,
    recipientGstin: result.merchant.gstin,
    deliveryStateCode: villageSnap.data()?.stateCode ?? String(taxProfile.registeredStateCode),
    supplierStateCode: String(taxProfile.registeredStateCode),
    deliveryStateName: villageSnap.data()?.state,
    supplierStateName: String(taxProfile.registeredStateName ?? taxProfile.registeredStateCode),
  });
  const tax = splitGst({
    subTotal,
    gstRate: Number(taxProfile.defaultGstRate ?? result.gstRate),
    registeredStateCode: String(taxProfile.registeredStateCode),
    recipientStateCode: resolved.stateCode,
    placeOfSupply: resolved.placeOfSupply,
    basis: resolved.basis,
  });
  const totalPrice = subTotal + tax.gstAmount;
  const invoiceNumber = await nextDocumentNumber({
    supplierId: result.gig.supplierId,
    kind: "invoice",
    prefix: String(taxProfile.invoiceNumberPrefix ?? "INV"),
  });

  let paymentIntentId: string | undefined;
  if (paymentMode === "online") {
    const intent = await createPaymentIntentInternal(ctx, {
      purpose: "buyer_order",
      orderId,
      amount: totalPrice,
      payerId: caller.id,
      supplierId: result.gig.supplierId,
    });
    paymentIntentId = intent.paymentIntentId;
  }

  await db.collection(Col.Orders).doc(orderId).set({
    gigId,
    village,
    merchantId,
    buyer: caller.id,
    supplierId: result.gig.supplierId,
    items: result.orderItems,
    subTotal,
    gstRate: tax.gstRate,
    gstAmount: tax.gstAmount,
    cgstAmount: tax.cgstAmount,
    sgstAmount: tax.sgstAmount,
    igstAmount: tax.igstAmount,
    totalPrice,
    supplierGstNumber: result.supplier.gstin,
    paymentMode,
    paymentStatus: "pending",
    deliveryStatus: "placed",
    pickupCodeIssuedAt: nowIso(),
    paymentIntentId: paymentIntentId ?? null,
    invoiceNumber,
    invoiceDate: nowIso(),
    supplierName: result.supplier.name ?? result.gig.supplierName,
    supplierAddress: result.supplier.address,
    recipientName: caller.name,
    recipientAddress: result.merchant.shopDetails ?? result.merchant.address,
    recipientShippingAddress: caller.address,
    recipientGstNumber: result.merchant.gstin ?? null,
    placeOfSupply: tax.placeOfSupply,
    placeOfSupplyStateCode: tax.placeOfSupplyStateCode,
    supplyType: tax.supplyType,
    authorizedSignatory: taxProfile.authorizedSignatory ?? null,
    createdAt: nowIso(),
  });
  await db.collection(Col.Orders).doc(orderId).collection("private").doc("pickup").set({
    code: pickupCode,
    sendCount: 1,
    failedAttempts: 0,
    lastSentAt: nowIso(),
  });
  return {
    success: true,
    orderId,
    subTotal,
    gstAmount: tax.gstAmount,
    totalPrice,
    pickupCode,
    paymentIntentId,
  };
}

export async function cancelOrder(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["buyer", "merchant", "supplier", "support"] });
  const orderId = requireNonEmpty(ctx.data.orderId, "orderId");
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection(Col.Orders).doc(orderId));
    if (!snap.exists) fail("NOT_FOUND", "Order not found");
    const order = snap.data() as {
      buyer: string;
      merchantId: string;
      supplierId: string;
      deliveryStatus: string;
      items: Array<{ productId: string; quantity: number }>;
    };
    const allowed =
      caller.role === "support" ||
      (caller.role === "buyer" && order.buyer === caller.id) ||
      (caller.role === "merchant" && order.merchantId === caller.id) ||
      (caller.role === "supplier" && order.supplierId === caller.id);
    if (!allowed) fail("PERMISSION_DENIED");
    if (!["placed", "reached_merchant", "suspended"].includes(order.deliveryStatus)) {
      fail("ORDER_UNALTERABLE");
    }
    for (const item of order.items ?? []) {
      tx.update(db.collection(Col.Products).doc(item.productId), {
        stock: FieldValue.increment(item.quantity),
      });
    }
    tx.update(snap.ref, { deliveryStatus: "cancelled", cancelledAt: nowIso() });
  });
  return { success: true };
}

export async function markOrderDelivered(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle", "merchant"] });
  const orderId = requireNonEmpty(ctx.data.orderId, "orderId");
  const key = requireIdempotencyKey(ctx.data);
  const cached = await shortCircuit<Record<string, unknown>>(key, `deliver:${orderId}`);
  if (cached) return cached;
  const proof = ctx.data.proof as VerificationInput;
  const cashCollected = ctx.data.cashCollected as number | undefined;

  const orderSnap = await db.collection(Col.Orders).doc(orderId).get();
  if (!orderSnap.exists) fail("NOT_FOUND", "Order not found");
  const order = orderSnap.data() as {
    gigId: string;
    merchantId: string;
    buyer: string;
    supplierId: string;
    deliveryStatus: string;
    paymentMode: string;
    paymentStatus: string;
    totalPrice: number;
  };
  if (caller.role === "vehicle") {
    const gig = await db.collection(Col.Gigs).doc(order.gigId).get();
    if (!gig.exists) fail("NOT_FOUND", "associated Gig not found");
    if (gig.data()?.vehicleId !== caller.id) fail("PERMISSION_DENIED");
  } else if (order.merchantId !== caller.id) {
    fail("PERMISSION_DENIED");
  }
  if (order.deliveryStatus !== "reached_merchant") fail("INVALID_STATE");

  const buyer = await db.collection(Col.UserProfiles).doc(order.buyer).get();
  const verification = await verifyCustody({
    ctx,
    proof,
    kind: "order_handover",
    callerId: caller.id,
    counterpartyId: order.buyer,
    counterpartyPhone: buyer.data()?.phone as string | undefined,
    privateRef: db.collection(Col.Orders).doc(orderId).collection("private").doc("pickup"),
    target: { orderId },
  });

  if (order.paymentMode === "cash_on_pickup") {
    if (cashCollected === undefined) fail("INVALID_ARGUMENT", "cashCollected is required");
    if (cashCollected !== order.totalPrice) fail("AMOUNT_MISMATCH");
  } else {
    if (order.paymentStatus !== "paid") fail("INVALID_STATE");
    if (cashCollected !== undefined) fail("INVALID_ARGUMENT", "cashCollected is supplied on an online order");
  }

  const transferId = randomId("ct");
  const deliveredAt = nowIso();
  let cashLedgerEntryId: string | undefined;
  let cashInCustody = 0;

  await db.runTransaction(async (tx) => {
    tx.set(db.collection(Col.CustodyTransfers).doc(transferId), {
      kind: "order_handover",
      status: "verified",
      gigId: order.gigId,
      supplierId: order.supplierId,
      fromPartyId: caller.id,
      fromRole: caller.role,
      toPartyId: order.buyer,
      toRole: "buyer",
      orderId,
      cashAmount: cashCollected ?? null,
      verification,
      idempotencyKey: key,
      initiatedAt: deliveredAt,
      verifiedAt: deliveredAt,
      capturedAt: verification.capturedAt,
      correlationId: ctx.correlationId,
    });
    const orderPatch: Record<string, unknown> = {
      deliveryStatus: "delivered",
      deliveryProof: verification,
      custodyTransferId: transferId,
      deliveredAt,
    };
    if (cashCollected !== undefined) {
      cashLedgerEntryId = randomId("cle");
      tx.set(db.collection(Col.CashLedgerEntries).doc(cashLedgerEntryId), {
        direction: "collected",
        source: "buyer_cod",
        status: "in_custody",
        amount: cashCollected,
        supplierId: order.supplierId,
        holderId: caller.id,
        holderRole: caller.role,
        gigId: order.gigId,
        orderId,
        buyerId: order.buyer,
        custodyTransferId: transferId,
        capturedAt: verification.capturedAt,
        recordedAt: deliveredAt,
        recordedBy: caller.id,
        correlationId: ctx.correlationId,
      });
      orderPatch.paymentStatus = "paid";
      orderPatch.cashCollectedAmount = cashCollected;
      orderPatch.cashLedgerEntryId = cashLedgerEntryId;
      if (caller.role === "vehicle") {
        const earnRef = db.collection(Col.DriverEarnings).doc(caller.id);
        const earn = await tx.get(earnRef);
        cashInCustody = Number(earn.data()?.cashInCustody ?? 0) + cashCollected;
        tx.set(earnRef, { cashInCustody }, { merge: true });
      }
    }
    tx.update(orderSnap.ref, orderPatch);
  });

  await notify({
    userId: order.buyer,
    category: "order_status",
    title: "Order delivered",
    body: "Your pickup has been confirmed.",
  });
  if (cashCollected !== undefined) {
    await notify({
      userId: order.supplierId,
      category: "cash_custody",
      title: "Cash collected",
      body: `₹${cashCollected} in custody for order ${orderId}`,
    });
  }
  const result = {
    success: true,
    deliveredAt,
    custodyTransferId: transferId,
    cashLedgerEntryId,
    cashInCustody,
  };
  return remember(key, `deliver:${orderId}`, result);
}

export async function placeMerchantOrder(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["merchant"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const supplierId = requireNonEmpty(ctx.data.supplierId, "supplierId");
  const items = ctx.data.items as Array<{ productId: string; quantity: number }>;
  const paymentMode = ctx.data.paymentMode as string;
  const payWithCredit = Boolean(ctx.data.payWithCredit);
  if (!["credit", "online", "cash_on_delivery"].includes(paymentMode)) {
    fail("INVALID_ARGUMENT", "paymentMode is unrecognized");
  }
  if (payWithCredit !== (paymentMode === "credit")) {
    fail("INVALID_ARGUMENT", "payWithCredit disagrees with paymentMode");
  }
  if (paymentMode === "credit" && caller.supplierId !== supplierId) {
    fail("INVALID_ARGUMENT", "Credit is only a rail with the managing supplier");
  }

  const merchantOrderId = randomId("mord");
  const handoverCode = randomDigits(6);

  const gigSnap = await db.collection(Col.Gigs).doc(gigId).get();
  if (!gigSnap.exists) fail("NOT_FOUND", "Gig not found");
  const gig = gigSnap.data() as {
    status: string;
    supplierId: string;
    merchantIds?: string[];
    villageIds?: string[];
  };
  if (
    (gig.status !== "created" && gig.status !== "started") ||
    gig.supplierId !== supplierId ||
    !(gig.merchantIds ?? []).includes(caller.id) ||
    !caller.villageId ||
    !(gig.villageIds ?? []).includes(caller.villageId)
  ) {
    fail("NOT_SERVICEABLE");
  }

  const supplierSnap = await db.collection(Col.UserProfiles).doc(supplierId).get();
  const supplier = supplierSnap.data() as { gstin?: string; name?: string; address?: string };
  if (!supplier.gstin) fail("INVALID_STATE");
  const taxProfile = await loadEffectiveTaxProfile(supplierId);
  await assertPeriodOpen();

  let base = 0;
  const orderItems: Array<Record<string, unknown>> = [];
  await db.runTransaction(async (tx) => {
    for (const line of items) {
      const productSnap = await tx.get(db.collection(Col.Products).doc(line.productId));
      if (!productSnap.exists) fail("NOT_FOUND", "Product not found");
      const product = productSnap.data() as {
        supplierId: string;
        stock: number;
        price?: number;
        hsnCode?: string;
        unit?: string;
        name?: string;
      };
      if (product.supplierId !== gig.supplierId) fail("NOT_SERVICEABLE");
      if (product.stock < line.quantity) fail("OUT_OF_STOCK");
      tx.update(productSnap.ref, { stock: product.stock - line.quantity });
      base += Number(product.price ?? 0) * line.quantity;
      orderItems.push({
        productId: line.productId,
        name: product.name,
        quantity: line.quantity,
        price: product.price,
        hsnCode: product.hsnCode,
        unit: product.unit,
      });
    }
  });

  const subTotal = await applyDiscount(ctx.data.discountCode as string | undefined, base);
  const resolved = resolveRecipientState({
    basis: (taxProfile.placeOfSupplyBasis as { merchantOrder?: string } | undefined)?.merchantOrder,
    recipientGstin: caller.gstin,
    supplierStateCode: String(taxProfile.registeredStateCode),
    supplierStateName: String(taxProfile.registeredStateName ?? taxProfile.registeredStateCode),
  });
  const tax = splitGst({
    subTotal,
    gstRate: Number(taxProfile.defaultGstRate ?? 18),
    registeredStateCode: String(taxProfile.registeredStateCode),
    recipientStateCode: resolved.stateCode,
    placeOfSupply: resolved.placeOfSupply,
    basis: resolved.basis,
  });
  const totalPrice = subTotal + tax.gstAmount;

  let creditTransactionId: string | undefined;
  let paymentIntentId: string | undefined;
  let creditAvailable = 0;

  if (paymentMode === "credit") {
    const creditRef = db.collection(Col.CreditProfiles).doc(caller.id);
    creditTransactionId = randomId("ctxn");
    await db.runTransaction(async (tx) => {
      const c = await tx.get(creditRef);
      if (!c.exists) fail("NOT_FOUND", "merchant credit profile not found");
      const profile = c.data() as {
        creditAvailable: number;
        creditUsed: number;
        creditLimit: number;
      };
      if (profile.creditAvailable < totalPrice) fail("INSUFFICIENT_CREDIT");
      const creditUsed = profile.creditUsed + totalPrice;
      creditAvailable = profile.creditLimit - creditUsed;
      tx.update(creditRef, {
        creditUsed,
        creditAvailable,
        lastTransactionId: creditTransactionId,
        updatedAt: nowIso(),
      });
      tx.set(db.collection(Col.CreditTransactions).doc(creditTransactionId!), {
        type: "draw",
        amount: totalPrice,
        creditLimitAfter: profile.creditLimit,
        creditUsedAfter: creditUsed,
        creditAvailableAfter: creditAvailable,
        merchantId: caller.id,
        merchantOrderId,
        actorId: caller.id,
        actorRole: "merchant",
        recordedAt: nowIso(),
        correlationId: ctx.correlationId,
      });
    });
  } else if (paymentMode === "online") {
    const intent = await createPaymentIntentInternal(ctx, {
      purpose: "merchant_order",
      merchantOrderId,
      amount: totalPrice,
      payerId: caller.id,
      supplierId,
    });
    paymentIntentId = intent.paymentIntentId;
  }

  const invoiceNumber = await nextDocumentNumber({
    supplierId,
    kind: "invoice",
    prefix: String(taxProfile.invoiceNumberPrefix ?? "INV"),
  });
  await db.collection(Col.MerchantOrders).doc(merchantOrderId).set({
    gigId,
    supplierId,
    merchantId: caller.id,
    items: orderItems,
    subTotal,
    gstRate: tax.gstRate,
    gstAmount: tax.gstAmount,
    cgstAmount: tax.cgstAmount,
    sgstAmount: tax.sgstAmount,
    igstAmount: tax.igstAmount,
    totalPrice,
    supplierGstNumber: supplier.gstin,
    paymentMode,
    paidWithCredit: payWithCredit,
    creditTransactionId: creditTransactionId ?? null,
    paymentIntentId: paymentIntentId ?? null,
    handoverCodeIssuedAt: nowIso(),
    status: "placed",
    invoiceNumber,
    invoiceDate: nowIso(),
    supplierName: supplier.name,
    supplierAddress: supplier.address,
    recipientName: caller.name,
    recipientAddress: caller.shopDetails ?? caller.address,
    recipientShippingAddress: caller.address,
    recipientGstNumber: caller.gstin ?? null,
    placeOfSupply: tax.placeOfSupply,
    placeOfSupplyStateCode: tax.placeOfSupplyStateCode,
    supplyType: tax.supplyType,
    authorizedSignatory: taxProfile.authorizedSignatory ?? null,
    createdAt: nowIso(),
  });
  await db
    .collection(Col.MerchantOrders)
    .doc(merchantOrderId)
    .collection("private")
    .doc("handover")
    .set({ code: handoverCode, sendCount: 1, failedAttempts: 0, lastSentAt: nowIso() });

  return {
    success: true,
    merchantOrderId,
    subTotal,
    gstAmount: tax.gstAmount,
    totalPrice,
    handoverCode,
    creditTransactionId,
    paymentIntentId,
    creditAvailable,
  };
}

export async function updateMerchantOrderStatus(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle", "merchant", "supplier", "support"] });
  const merchantOrderId = requireNonEmpty(ctx.data.merchantOrderId, "merchantOrderId");
  const status = ctx.data.status as string;
  if (status !== "reached" && status !== "delivered") fail("INVALID_ARGUMENT");
  const key = status === "delivered" ? requireIdempotencyKey(ctx.data) : undefined;
  if (key) {
    const cached = await shortCircuit<Record<string, unknown>>(key, `mord:${merchantOrderId}`);
    if (cached) return cached;
  }

  const snap = await db.collection(Col.MerchantOrders).doc(merchantOrderId).get();
  if (!snap.exists) fail("NOT_FOUND", "Merchant order not found");
  const order = snap.data() as {
    status: string;
    supplierId: string;
    merchantId: string;
    gigId: string;
    paymentMode: string;
    totalPrice: number;
    paymentIntentId?: string;
  };
  if (["cancelled", "suspended"].includes(order.status)) fail("INVALID_STATE");
  if (status === "reached" && order.status !== "placed") fail("INVALID_STATE");
  if (status === "delivered" && order.status !== "reached") fail("INVALID_STATE");

  if (caller.role === "supplier" && order.supplierId !== caller.id) fail("PERMISSION_DENIED");
  if (caller.role === "merchant") {
    if (order.merchantId !== caller.id || status !== "delivered") fail("PERMISSION_DENIED");
  }
  if (caller.role === "vehicle") {
    const gigs = await db
      .collection(Col.Gigs)
      .where("vehicleId", "==", caller.id)
      .where("status", "==", "started")
      .get();
    const serving = gigs.docs.some((d) => (d.data().merchantIds ?? []).includes(order.merchantId));
    if (!serving) fail("PERMISSION_DENIED");
  }

  const updatedAt = nowIso();
  if (status === "reached") {
    await snap.ref.update({ status: "reached", updatedAt });
    return { success: true, status, updatedAt };
  }

  const proof = (caller.role === "merchant"
    ? { method: "otp", capturedAt: nowIso() }
    : ctx.data.proof) as VerificationInput;
  if (!proof) fail("INVALID_ARGUMENT", "proof is missing");
  const merchant = await db.collection(Col.UserProfiles).doc(order.merchantId).get();
  const verification = await verifyCustody({
    ctx,
    proof,
    kind: "bulk_order_handover",
    callerId: caller.id,
    counterpartyId: order.merchantId,
    counterpartyPhone: merchant.data()?.phone as string | undefined,
    privateRef: db.collection(Col.MerchantOrders).doc(merchantOrderId).collection("private").doc("handover"),
    target: { merchantOrderId },
  });

  const cashCollected = ctx.data.cashCollected as number | undefined;
  if (order.paymentMode === "cash_on_delivery") {
    if (cashCollected !== order.totalPrice) fail("AMOUNT_MISMATCH");
  }
  if (order.paymentMode === "online" && order.paymentIntentId) {
    const intent = await db.collection(Col.PaymentIntents).doc(order.paymentIntentId).get();
    if (intent.data()?.status !== "paid") fail("INVALID_STATE");
  }

  const transferId = randomId("ct");
  let cashLedgerEntryId: string | undefined;
  let cashInCustody: number | undefined;
  await db.runTransaction(async (tx) => {
    tx.set(db.collection(Col.CustodyTransfers).doc(transferId), {
      kind: "bulk_order_handover",
      status: "verified",
      fromPartyId: caller.id,
      fromRole: caller.role,
      toPartyId: order.merchantId,
      toRole: "merchant",
      merchantOrderId,
      supplierId: order.supplierId,
      gigId: order.gigId,
      cashAmount: cashCollected ?? null,
      verification,
      idempotencyKey: key,
      initiatedAt: updatedAt,
      verifiedAt: updatedAt,
      capturedAt: verification.capturedAt,
    });
    const patch: Record<string, unknown> = {
      status: "delivered",
      custodyTransferId: transferId,
      deliveryProof: { ...verification, capturedBy: caller.id },
      updatedAt,
    };
    if (cashCollected !== undefined) {
      cashLedgerEntryId = randomId("cle");
      const holderId = caller.role === "vehicle" ? caller.id : order.gigId;
      tx.set(db.collection(Col.CashLedgerEntries).doc(cashLedgerEntryId), {
        direction: "collected",
        source: "merchant_bulk_cash",
        status: "in_custody",
        amount: cashCollected,
        supplierId: order.supplierId,
        holderId: caller.role === "vehicle" ? caller.id : holderId,
        holderRole: caller.role === "vehicle" ? "vehicle" : caller.role,
        gigId: order.gigId,
        merchantId: order.merchantId,
        merchantOrderId,
        custodyTransferId: transferId,
        capturedAt: verification.capturedAt,
        recordedAt: updatedAt,
        recordedBy: caller.id,
      });
      patch.cashCollectedAmount = cashCollected;
      patch.cashLedgerEntryId = cashLedgerEntryId;
      if (caller.role === "vehicle") {
        const earnRef = db.collection(Col.DriverEarnings).doc(caller.id);
        const earn = await tx.get(earnRef);
        cashInCustody = Number(earn.data()?.cashInCustody ?? 0) + cashCollected;
        tx.set(earnRef, { cashInCustody }, { merge: true });
      }
    }
    if (order.paymentMode === "credit") {
      const creditRef = db.collection(Col.CreditProfiles).doc(order.merchantId);
      const credit = await tx.get(creditRef);
      const dues = (credit.data()?.paymentsDue as Array<Record<string, unknown>> | undefined) ?? [];
      if (!dues.some((d) => d.merchantOrderId === merchantOrderId)) {
        dues.push({
          merchantOrderId,
          amount: order.totalPrice,
          dueAt: nowIso(),
          status: "open",
        });
        tx.update(creditRef, { paymentsDue: dues, updatedAt });
      }
    }
    tx.update(snap.ref, patch);
  });
  await notify({
    userId: order.merchantId,
    category: "order_status",
    title: "Bulk order delivered",
    body: merchantOrderId,
  });
  const result = {
    success: true,
    status: "delivered" as const,
    updatedAt,
    custodyTransferId: transferId,
    cashLedgerEntryId,
    cashInCustody,
  };
  if (key) return remember(key, `mord:${merchantOrderId}`, result);
  return result;
}

export async function cancelMerchantOrder(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["merchant", "supplier", "support"] });
  const merchantOrderId = requireNonEmpty(ctx.data.merchantOrderId, "merchantOrderId");
  let creditReleased = 0;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection(Col.MerchantOrders).doc(merchantOrderId));
    if (!snap.exists) fail("NOT_FOUND");
    const order = snap.data() as {
      status: string;
      merchantId: string;
      supplierId: string;
      paymentMode: string;
      totalPrice: number;
      items: Array<{ productId: string; quantity: number }>;
    };
    const allowed =
      caller.role === "support" ||
      (caller.role === "merchant" && order.merchantId === caller.id) ||
      (caller.role === "supplier" && order.supplierId === caller.id);
    if (!allowed) fail("PERMISSION_DENIED");
    if (caller.role === "merchant" && order.status !== "placed") {
      fail("INVALID_STATE", "Merchant attempted to cancel an order that has already reached them");
    }
    if (!["placed", "reached", "suspended"].includes(order.status)) fail("ORDER_UNALTERABLE");
    for (const item of order.items ?? []) {
      tx.update(db.collection(Col.Products).doc(item.productId), {
        stock: FieldValue.increment(item.quantity),
      });
    }
    if (order.paymentMode === "credit") {
      const creditRef = db.collection(Col.CreditProfiles).doc(order.merchantId);
      const credit = await tx.get(creditRef);
      if (!credit.exists) fail("NOT_FOUND", "credit profile not found");
      const profile = credit.data() as {
        creditUsed: number;
        creditLimit: number;
        paymentsDue?: Array<{ merchantOrderId?: string }>;
      };
      const creditUsed = Math.max(0, profile.creditUsed - order.totalPrice);
      const creditAvailable = profile.creditLimit - creditUsed;
      creditReleased = order.totalPrice;
      const txnId = randomId("ctxn");
      tx.update(creditRef, {
        creditUsed,
        creditAvailable,
        paymentsDue: (profile.paymentsDue ?? []).filter((d) => d.merchantOrderId !== merchantOrderId),
        lastTransactionId: txnId,
        updatedAt: nowIso(),
      });
      tx.set(db.collection(Col.CreditTransactions).doc(txnId), {
        type: "release",
        amount: order.totalPrice,
        creditLimitAfter: profile.creditLimit,
        creditUsedAfter: creditUsed,
        creditAvailableAfter: creditAvailable,
        merchantOrderId,
        actorId: caller.id,
        actorRole: caller.role,
        recordedAt: nowIso(),
      });
    }
    tx.update(snap.ref, {
      status: "cancelled",
      suspensionReason: ctx.data.reason ?? null,
      cancelledAt: nowIso(),
    });
  });
  return { success: true, creditReleased };
}

