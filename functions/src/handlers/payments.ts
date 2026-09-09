import { db } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { appendAudit } from "../lib/audit";
import { randomId } from "../lib/crypto";
import { remember, requireIdempotencyKey, shortCircuit } from "../lib/idempotency";
import { notify, notifyMany } from "../lib/notify";
import { createGatewayRefund, verifyPaymentSignature } from "../lib/razorpay";
import { loadEffectiveTaxProfile, nextDocumentNumber, splitGst } from "../lib/tax";
import { nowIso } from "../lib/time";
import { requireNonEmpty } from "../lib/validate";
import { REFUND_DUAL_APPROVAL_THRESHOLD_PAISE } from "../runtime";
import { rupeesToPaise } from "../lib/money";
import { createPaymentIntentInternal } from "../lib/paymentIntent";

export { createPaymentIntentInternal };

export async function createPaymentIntent(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["buyer", "merchant", "supplier"] });
  const purpose = requireNonEmpty(ctx.data.purpose, "purpose");
  let amount = 0;
  let supplierId: string | undefined;
  let duesTargeted: string[] | undefined;

  if (purpose === "buyer_order") {
    if (ctx.data.amount !== undefined) fail("INVALID_ARGUMENT", "amount must not be supplied");
    const orderId = requireNonEmpty(ctx.data.orderId, "orderId");
    const order = await db.collection(Col.Orders).doc(orderId).get();
    if (!order.exists) fail("NOT_FOUND");
    const o = order.data() as {
      buyer: string;
      paymentMode: string;
      paymentStatus: string;
      totalPrice: number;
      supplierId: string;
    };
    if (o.buyer !== caller.id) fail("PERMISSION_DENIED");
    if (o.paymentMode !== "online" || o.paymentStatus !== "pending") fail("INVALID_STATE");
    amount = o.totalPrice;
    supplierId = o.supplierId;
    return createPaymentIntentInternal(ctx, {
      purpose,
      orderId,
      amount,
      payerId: caller.id,
      supplierId,
    });
  }

  if (purpose === "merchant_order") {
    if (ctx.data.amount !== undefined) fail("INVALID_ARGUMENT", "amount must not be supplied");
    const merchantOrderId = requireNonEmpty(ctx.data.merchantOrderId, "merchantOrderId");
    const order = await db.collection(Col.MerchantOrders).doc(merchantOrderId).get();
    if (!order.exists) fail("NOT_FOUND");
    const o = order.data() as {
      merchantId: string;
      paymentMode: string;
      totalPrice: number;
      supplierId: string;
      paymentIntentId?: string;
    };
    if (o.merchantId !== caller.id) fail("PERMISSION_DENIED");
    if (o.paymentMode !== "online") fail("INVALID_STATE");
    amount = o.totalPrice;
    supplierId = o.supplierId;
    return createPaymentIntentInternal(ctx, {
      purpose,
      merchantOrderId,
      amount,
      payerId: caller.id,
      supplierId,
    });
  }

  if (purpose === "merchant_credit_repayment") {
    const profile = await db.collection(Col.CreditProfiles).doc(caller.id).get();
    if (!profile.exists) fail("NOT_FOUND");
    const c = profile.data() as {
      creditUsed: number;
      inTransitRepayments?: number;
      pendingRepayments?: number;
      supplierId: string;
      paymentsDue?: Array<{ id?: string; merchantOrderId?: string; status?: string; amount: number }>;
    };
    const max = c.creditUsed - Number(c.inTransitRepayments ?? c.pendingRepayments ?? 0);
    if (max <= 0) fail("INVALID_STATE", "No outstanding credit to repay");
    amount = typeof ctx.data.amount === "number" ? ctx.data.amount : max;
    if (amount > max) fail("AMOUNT_MISMATCH");
    supplierId = c.supplierId;
    duesTargeted = (ctx.data.duesTargeted as string[] | undefined) ??
      (c.paymentsDue ?? []).filter((d) => d.status !== "paid").map((d) => d.merchantOrderId ?? d.id ?? "");
    return createPaymentIntentInternal(ctx, {
      purpose,
      amount,
      payerId: caller.id,
      supplierId,
      duesTargeted,
    });
  }

  if (purpose === "subscription") {
    const subscriptionId = requireNonEmpty(ctx.data.subscriptionId, "subscriptionId");
    const sub = await db.collection(Col.PlatformSubscriptions).doc(subscriptionId).get();
    if (!sub.exists) fail("NOT_FOUND");
    const s = sub.data() as { subscriberId: string; billedAmount?: number; gstAmount?: number };
    if (s.subscriberId !== caller.id && caller.role !== "support") fail("PERMISSION_DENIED");
    amount = Number(s.billedAmount ?? 0) + Number(s.gstAmount ?? 0);
    return createPaymentIntentInternal(ctx, {
      purpose,
      subscriptionId,
      amount,
      payerId: s.subscriberId,
    });
  }

  fail("INVALID_ARGUMENT", "Unrecognized purpose");
}

export async function applySuccessfulPayment(params: {
  paymentIntentId: string;
  paymentTransactionId: string;
  gatewayPaymentId: string;
  eventId?: string;
  amount?: number;
  instrument?: string;
}) {
  const intentSnap = await db.collection(Col.PaymentIntents).doc(params.paymentIntentId).get();
  if (!intentSnap.exists) fail("NOT_FOUND");
  const intent = intentSnap.data() as {
    status: string;
    amount: number;
    purpose: string;
    payerId: string;
    orderId?: string;
    merchantOrderId?: string;
    subscriptionId?: string;
    supplierId?: string;
    duesTargeted?: string[];
    gatewayEventIds?: string[];
  };
  if (params.eventId && (intent.gatewayEventIds ?? []).includes(params.eventId)) {
    return { success: true, transactionStatus: intent.status, applied: false, reason: "duplicate_event" };
  }
  if (["paid", "failed", "reversed"].includes(intent.status)) {
    return { success: true, transactionStatus: intent.status, paymentTransactionId: params.paymentTransactionId, paymentTransactionStatus: "succeeded" };
  }
  if (params.amount !== undefined && params.amount !== intent.amount) {
    await intentSnap.ref.update({ status: "failed", failureReason: "amount_mismatch", updatedAt: nowIso() });
    fail("AMOUNT_MISMATCH");
  }
  const dup = await db
    .collection(Col.PaymentTransactions)
    .where("gatewayPaymentId", "==", params.gatewayPaymentId)
    .limit(1)
    .get();
  if (!dup.empty && dup.docs[0].id !== params.paymentTransactionId) {
    fail("DUPLICATE_PROVIDER_REFERENCE");
  }

  let creditTransactionId: string | undefined;
  let creditUsed: number | undefined;
  let creditAvailable: number | undefined;
  let activatedEntitlements: string[] | undefined;

  await db.runTransaction(async (tx) => {
    tx.update(db.collection(Col.PaymentTransactions).doc(params.paymentTransactionId), {
      status: "succeeded",
      capturedAmount: intent.amount,
      gatewayPaymentId: params.gatewayPaymentId,
      succeededAt: nowIso(),
      instrument: params.instrument ?? "upi",
      reconciliation: { status: "unreconciled" },
    });
    tx.update(intentSnap.ref, {
      status: "paid",
      latestPaymentTransactionId: params.paymentTransactionId,
      gatewayEventIds: [...(intent.gatewayEventIds ?? []), params.eventId].filter(Boolean),
      updatedAt: nowIso(),
    });
    if (intent.purpose === "buyer_order" && intent.orderId) {
      tx.update(db.collection(Col.Orders).doc(intent.orderId), {
        paymentStatus: "paid",
        paymentTransactionId: params.paymentTransactionId,
      });
    }
    if (intent.purpose === "merchant_order" && intent.merchantOrderId) {
      tx.update(db.collection(Col.MerchantOrders).doc(intent.merchantOrderId), {
        paymentTransactionId: params.paymentTransactionId,
      });
    }
    if (intent.purpose === "merchant_credit_repayment") {
      const creditRef = db.collection(Col.CreditProfiles).doc(intent.payerId);
      const credit = await tx.get(creditRef);
      if (!credit.exists) fail("NOT_FOUND");
      const c = credit.data() as {
        creditUsed: number;
        creditLimit: number;
        paymentsDue?: Array<Record<string, unknown>>;
        paymentsMade?: Array<Record<string, unknown>>;
      };
      creditUsed = Math.max(0, c.creditUsed - intent.amount);
      creditAvailable = c.creditLimit - creditUsed;
      creditTransactionId = randomId("ctxn");
      const dues = (c.paymentsDue ?? []).map((d) =>
        (intent.duesTargeted ?? []).includes(String(d.merchantOrderId ?? d.id))
          ? { ...d, status: "paid" }
          : d
      );
      tx.update(creditRef, {
        creditUsed,
        creditAvailable,
        paymentsDue: dues,
        paymentsMade: [
          ...(c.paymentsMade ?? []),
          {
            method: "online",
            settled: true,
            amount: intent.amount,
            paymentIntentId: params.paymentIntentId,
            paymentTransactionId: params.paymentTransactionId,
            at: nowIso(),
          },
        ],
        lastTransactionId: creditTransactionId,
        updatedAt: nowIso(),
      });
      tx.set(db.collection(Col.CreditTransactions).doc(creditTransactionId), {
        type: "repayment_online",
        amount: intent.amount,
        creditLimitAfter: c.creditLimit,
        creditUsedAfter: creditUsed,
        creditAvailableAfter: creditAvailable,
        paymentIntentId: params.paymentIntentId,
        duesSettled: intent.duesTargeted ?? [],
        inTransit: false,
        actorId: intent.payerId,
        actorRole: "merchant",
        recordedAt: nowIso(),
      });
    }
    if (intent.purpose === "subscription" && intent.subscriptionId) {
      const subRef = db.collection(Col.PlatformSubscriptions).doc(intent.subscriptionId);
      const sub = await tx.get(subRef);
      const planId = sub.data()?.planId as string | undefined;
      let entitlements: string[] = [];
      if (planId) {
        const plan = await tx.get(db.collection(Col.SubscriptionPlans).doc(planId));
        entitlements = (plan.data()?.entitlements as string[]) ?? [];
      }
      activatedEntitlements = entitlements;
      tx.update(subRef, {
        status: "active",
        gracePeriodEndsAt: null,
        activeEntitlements: entitlements,
        lastPaymentTransactionId: params.paymentTransactionId,
        updatedAt: nowIso(),
      });
      const invoices = await db
        .collection(Col.SubscriptionInvoices)
        .where("subscriptionId", "==", intent.subscriptionId)
        .where("status", "==", "issued")
        .limit(1)
        .get();
      if (!invoices.empty) {
        tx.update(invoices.docs[0].ref, { status: "paid", paidAt: nowIso() });
      }
    }
  });

  if (intent.purpose === "merchant_credit_repayment") {
    await notifyMany([intent.payerId, intent.supplierId], {
      category: "credit",
      title: "Credit repayment received",
      body: `₹${intent.amount} applied. Outstanding: ₹${creditUsed}`,
    });
  }
  return {
    success: true,
    transactionStatus: "paid",
    paymentTransactionId: params.paymentTransactionId,
    paymentTransactionStatus: "succeeded",
    gatewayPaymentId: params.gatewayPaymentId,
    creditTransactionId,
    creditUsed,
    creditAvailable,
    activatedEntitlements,
  };
}

export async function processPayment(ctx: CallContext) {
  const caller = ctx.uid ? await requireCaller(ctx) : null;
  const paymentIntentId = requireNonEmpty(ctx.data.paymentIntentId, "paymentIntentId");
  const paymentTransactionId = requireNonEmpty(ctx.data.paymentTransactionId, "paymentTransactionId");
  const gatewayPaymentId = requireNonEmpty(ctx.data.gatewayPaymentId, "gatewayPaymentId");
  const gatewaySignature = requireNonEmpty(ctx.data.gatewaySignature, "gatewaySignature");
  const intent = await db.collection(Col.PaymentIntents).doc(paymentIntentId).get();
  if (!intent.exists) fail("NOT_FOUND");
  if (caller && intent.data()?.payerId !== caller.id) fail("PERMISSION_DENIED");
  if (!verifyPaymentSignature(String(intent.data()?.gatewayOrderId), gatewayPaymentId, gatewaySignature)) {
    fail("INVALID_SIGNATURE");
  }
  return applySuccessfulPayment({
    paymentIntentId,
    paymentTransactionId,
    gatewayPaymentId,
    eventId: ctx.data.eventId as string | undefined,
  });
}

export async function refundOrder(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["buyer", "supplier", "support"] });
  const orderId = requireNonEmpty(ctx.data.orderId, "orderId");
  const key = requireIdempotencyKey(ctx.data);
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const reasonCode = requireNonEmpty(ctx.data.reasonCode, "reasonCode");
  const cached = await shortCircuit<Record<string, unknown>>(key, `refund:${orderId}`);
  if (cached) return cached;

  const orderSnap = await db.collection(Col.Orders).doc(orderId).get();
  if (!orderSnap.exists) fail("NOT_FOUND");
  const order = orderSnap.data() as {
    buyer: string;
    supplierId: string;
    paymentStatus: string;
    deliveryStatus: string;
    totalPrice: number;
    paymentTransactionId?: string;
    refundedAmount?: number;
    invoiceNumber?: string;
  };
  const allowed =
    caller.role === "support" ||
    order.buyer === caller.id ||
    (caller.role === "supplier" && order.supplierId === caller.id);
  if (!allowed) fail("PERMISSION_DENIED");
  if (order.paymentStatus !== "paid") fail("INVALID_STATE");
  if (!["cancelled", "suspended"].includes(order.deliveryStatus)) fail("INVALID_STATE");
  if (!order.paymentTransactionId) fail("NOT_FOUND", "No successful payment transaction behind this order");

  const ptx = await db.collection(Col.PaymentTransactions).doc(order.paymentTransactionId).get();
  if (!ptx.exists) fail("NOT_FOUND");
  const txn = ptx.data() as {
    status: string;
    capturedAmount?: number;
    amount: number;
    refundedAmount?: number;
    gatewayPaymentId?: string;
  };
  if (!["succeeded", "partially_refunded"].includes(txn.status)) fail("NOT_FOUND");
  const remaining = Number(txn.capturedAmount ?? txn.amount) - Number(txn.refundedAmount ?? 0);
  const refundedAmount = typeof ctx.data.amount === "number" ? ctx.data.amount : remaining;
  if (refundedAmount <= 0 || refundedAmount > remaining) fail("INVALID_ARGUMENT");

  const isPartial = refundedAmount < remaining;
  const goodwill = reasonCode === "support_goodwill";
  const above = rupeesToPaise(refundedAmount) > REFUND_DUAL_APPROVAL_THRESHOLD_PAISE;
  if ((isPartial || goodwill || above) && caller.role === "support" && ctx.data.approvedBy === undefined) {
    const refundTransactionId = randomId("rfd");
    await db.collection(Col.RefundTransactions).doc(refundTransactionId).set({
      status: "requested",
      paymentTransactionId: order.paymentTransactionId,
      orderId,
      reasonCode,
      reasonNote: reason,
      amount: refundedAmount,
      isPartial,
      idempotencyKey: key,
      requestedBy: caller.id,
      requestedByRole: caller.role,
      requiresApproval: true,
      createdAt: nowIso(),
    });
    const result = {
      success: true,
      refundTransactionId,
      refundId: refundTransactionId,
      refundedAmount,
      cumulativeRefundedAmount: Number(order.refundedAmount ?? 0),
      isPartial,
      requiresApproval: true,
      paymentStatus: "refund_pending" as const,
    };
    return remember(key, `refund:${orderId}`, result);
  }

  const refundTransactionId = randomId("rfd");
  const { gatewayRefundId } = await createGatewayRefund({
    gatewayPaymentId: String(txn.gatewayPaymentId),
    amountRupees: refundedAmount,
    idempotencyKey: `refund:${refundTransactionId}`,
  });
  const creditNoteId = randomId("cn");
  try {
    const tax = await loadEffectiveTaxProfile(order.supplierId);
    const number = await nextDocumentNumber({
      supplierId: order.supplierId,
      kind: "credit_note",
      prefix: String(tax.creditNoteNumberPrefix ?? "CN"),
    });
    const heads = splitGst({
      subTotal: refundedAmount / 1.18,
      gstRate: 18,
      registeredStateCode: String(tax.registeredStateCode),
      recipientStateCode: String(tax.registeredStateCode),
      placeOfSupply: String(tax.registeredStateName ?? "Andhra Pradesh"),
      basis: "invoice",
    });
    await db.collection(Col.CreditNotes).doc(creditNoteId).set({
      againstInvoiceNumber: order.invoiceNumber,
      number,
      amount: refundedAmount,
      ...heads,
      issuedBy: caller.id,
      issuedAt: nowIso(),
      orderId,
    });
  } catch {
    // Credit note is issued when a tax profile exists; refund still proceeds.
  }

  await db.collection(Col.RefundTransactions).doc(refundTransactionId).set({
    status: "processing",
    paymentTransactionId: order.paymentTransactionId,
    orderId,
    reasonCode,
    reasonNote: reason,
    amount: refundedAmount,
    isPartial,
    idempotencyKey: key,
    requestedBy: caller.id,
    requestedByRole: caller.role,
    gatewayRefundId,
    creditNoteId,
    createdAt: nowIso(),
  });
  await orderSnap.ref.update({
    refundId: refundTransactionId,
    refundTransactionIds: [...(((await orderSnap.ref.get()).data()?.refundTransactionIds as string[]) ?? []), refundTransactionId],
    refundedAmount: Number(order.refundedAmount ?? 0) + refundedAmount,
    refundedAt: nowIso(),
    paymentStatus: "refund_pending",
    creditNoteId,
  });
  await notify({
    userId: order.buyer,
    category: "order_status",
    title: "Refund requested",
    body: `₹${refundedAmount} is being returned.`,
  });
  const result = {
    success: true,
    refundTransactionId,
    refundId: gatewayRefundId,
    refundedAmount,
    cumulativeRefundedAmount: Number(order.refundedAmount ?? 0) + refundedAmount,
    isPartial,
    creditNoteId,
    requiresApproval: false,
    paymentStatus: "refund_pending" as const,
  };
  return remember(key, `refund:${orderId}`, result);
}

export async function issueCreditNote(ctx: CallContext) {
  const caller = ctx.uid ? await requireCaller(ctx, { roles: ["support"] }) : { id: "system", role: "system" };
  const invoiceRef = requireNonEmpty(
    (ctx.data.orderId as string) || (ctx.data.merchantOrderId as string) || (ctx.data.subscriptionInvoiceId as string),
    "invoice target"
  );
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  let source: FirebaseFirestore.DocumentSnapshot;
  let supplierId: string;
  let invoiceNumber: string;
  let taxable = 0;
  if (ctx.data.orderId) {
    source = await db.collection(Col.Orders).doc(String(ctx.data.orderId)).get();
    if (!source.exists) fail("NOT_FOUND");
    supplierId = String(source.data()?.supplierId);
    invoiceNumber = String(source.data()?.invoiceNumber);
    taxable = Number(source.data()?.subTotal ?? 0);
  } else if (ctx.data.merchantOrderId) {
    source = await db.collection(Col.MerchantOrders).doc(String(ctx.data.merchantOrderId)).get();
    if (!source.exists) fail("NOT_FOUND");
    supplierId = String(source.data()?.supplierId);
    invoiceNumber = String(source.data()?.invoiceNumber);
    taxable = Number(source.data()?.subTotal ?? 0);
  } else {
    source = await db.collection(Col.SubscriptionInvoices).doc(invoiceRef).get();
    if (!source.exists) fail("NOT_FOUND");
    supplierId = "platform";
    invoiceNumber = String(source.data()?.invoiceNumber);
    taxable = Number(source.data()?.billedAmount ?? 0);
  }
  const amount = typeof ctx.data.amount === "number" ? ctx.data.amount : taxable;
  if (amount <= 0 || amount > taxable) fail("INVALID_AMOUNT");
  const tax = supplierId === "platform"
    ? { creditNoteNumberPrefix: "SUBCN", registeredStateCode: "37", registeredStateName: "Andhra Pradesh" }
    : await loadEffectiveTaxProfile(supplierId);
  const number = await nextDocumentNumber({
    supplierId,
    kind: "credit_note",
    prefix: String(tax.creditNoteNumberPrefix ?? "CN"),
  });
  const creditNoteId = randomId("cn");
  const heads = splitGst({
    subTotal: amount,
    gstRate: Number(source.data()?.gstRate ?? 18),
    registeredStateCode: String(source.data()?.placeOfSupplyStateCode ?? tax.registeredStateCode),
    recipientStateCode: String(source.data()?.placeOfSupplyStateCode ?? tax.registeredStateCode),
    placeOfSupply: String(source.data()?.placeOfSupply ?? tax.registeredStateName),
    basis: "invoice",
  });
  await db.collection(Col.CreditNotes).doc(creditNoteId).set({
    number,
    againstInvoiceNumber: invoiceNumber,
    amount,
    reason,
    issuedBy: caller.id,
    issuedAt: nowIso(),
    ...heads,
    placeOfSupply: source.data()?.placeOfSupply ?? heads.placeOfSupply,
    placeOfSupplyStateCode: source.data()?.placeOfSupplyStateCode ?? heads.placeOfSupplyStateCode,
    supplyType: source.data()?.supplyType ?? heads.supplyType,
  });
  await source.ref.update({ creditNoteId, creditNoteStatus: amount >= taxable ? "credited" : "partial" });
  await appendAudit({
    category: "payment",
    actorId: caller.id,
    subjectId: creditNoteId,
    reason,
    after: { invoiceNumber, amount },
    correlationId: ctx.correlationId,
  });
  return { success: true, creditNoteId, number };
}
