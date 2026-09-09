import { db, FieldValue } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import {
  holderRoleLabel,
  settlementLabel,
  verifyCustody,
  type VerificationInput,
} from "../lib/custody";
import { hashWithSalt, randomDigits, randomId } from "../lib/crypto";
import { remember, requireIdempotencyKey, shortCircuit } from "../lib/idempotency";
import { notify, notifyMany } from "../lib/notify";
import { sendSms, sendVoiceOtp } from "../lib/sms";
import { addHours, nowIso } from "../lib/time";
import { exactlyOne, requireNonEmpty } from "../lib/validate";
import { PENDING_REPAYMENT_RELIEF_CEILING_HOURS } from "../runtime";

export async function resendHandoverCode(ctx: CallContext) {
  const caller = await requireCaller(ctx);
  const targetKey = exactlyOne(ctx.data, ["orderId", "merchantOrderId", "custodyTransferId", "settlementId"]);
  const channel = ctx.data.channel as string;
  if (channel !== "sms" && channel !== "voice") fail("INVALID_ARGUMENT");
  const id = String(ctx.data[targetKey]);
  let parent: FirebaseFirestore.DocumentSnapshot;
  let privateRef: FirebaseFirestore.DocumentReference;
  let ownerId: string;
  let ownerPhone: string | undefined;
  let supplierId: string | undefined;

  if (targetKey === "orderId") {
    parent = await db.collection(Col.Orders).doc(id).get();
    if (!parent.exists) fail("NOT_FOUND");
    if (["delivered", "cancelled"].includes(String(parent.data()?.deliveryStatus))) fail("INVALID_STATE");
    privateRef = parent.ref.collection("private").doc("pickup");
    ownerId = String(parent.data()?.buyer);
    supplierId = String(parent.data()?.supplierId);
  } else if (targetKey === "merchantOrderId") {
    parent = await db.collection(Col.MerchantOrders).doc(id).get();
    if (!parent.exists) fail("NOT_FOUND");
    if (["delivered", "cancelled"].includes(String(parent.data()?.status))) fail("INVALID_STATE");
    privateRef = parent.ref.collection("private").doc("handover");
    ownerId = String(parent.data()?.merchantId);
    supplierId = String(parent.data()?.supplierId);
  } else if (targetKey === "settlementId") {
    parent = await db.collection(Col.CashSettlements).doc(id).get();
    if (!parent.exists) fail("NOT_FOUND");
    if (["settled", "written_off"].includes(String(parent.data()?.status))) fail("INVALID_STATE");
    privateRef = parent.ref.collection("private").doc("code");
    ownerId = String(parent.data()?.supplierId);
    supplierId = ownerId;
  } else {
    parent = await db.collection(Col.CustodyTransfers).doc(id).get();
    if (!parent.exists) fail("NOT_FOUND");
    privateRef = parent.ref.collection("private").doc("code");
    ownerId = String(parent.data()?.fromPartyId);
    supplierId = String(parent.data()?.supplierId);
  }

  const owner = await db.collection(Col.UserProfiles).doc(ownerId).get();
  ownerPhone = owner.data()?.phone as string | undefined;
  const party =
    caller.id === ownerId ||
    caller.role === "support" ||
    caller.role === "vehicle" ||
    (caller.role === "supplier" && caller.id === supplierId);
  if (!party) fail("PERMISSION_DENIED");

  const codeSnap = await privateRef.get();
  if (!codeSnap.exists) fail("NOT_FOUND", "code record not found");
  const rec = codeSnap.data() as { code: string; sendCount: number; lastSentAt?: string };
  if (rec.sendCount >= 3 && rec.lastSentAt && Date.now() - new Date(rec.lastSentAt).getTime() < 60 * 60 * 1000) {
    fail("RESEND_LIMIT_EXCEEDED");
  }
  if (ownerPhone) {
    if (channel === "voice") await sendVoiceOtp(ownerPhone, rec.code);
    else await sendSms(ownerPhone, `Logikchain code: ${rec.code}`);
  }
  const sendCount = rec.sendCount + 1;
  await privateRef.update({ sendCount, lastSentAt: nowIso() });
  if (targetKey === "orderId") await parent.ref.update({ pickupCodeLastSentAt: nowIso() });
  if (targetKey === "merchantOrderId") await parent.ref.update({ handoverCodeLastSentAt: nowIso() });
  await notify({
    userId: ownerId,
    category: "verification",
    title: "Handover code re-sent",
    body: `Sent via ${channel}`,
  });
  const sentTo = ownerPhone ? `******${ownerPhone.replace(/\D/g, "").slice(-4)}` : "****";
  return {
    success: true,
    sentTo,
    sendCount,
    nextResendAvailableAt: addHours(nowIso(), sendCount >= 3 ? 1 : 0),
  };
}

export async function issueOfflineCodeBatch(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["merchant", "supplier"] });
  const purpose = requireNonEmpty(ctx.data.purpose, "purpose");
  if (caller.role === "merchant" && !["bulk_order_handover", "credit_repayment"].includes(purpose)) {
    fail("PERMISSION_DENIED");
  }
  if (caller.role === "supplier" && purpose !== "cash_settlement") fail("PERMISSION_DENIED");
  const count = Number(ctx.data.count ?? 20);
  if (!Number.isInteger(count) || count <= 0 || count > 50) fail("INVALID_ARGUMENT");

  const existing = await db
    .collection(Col.VerificationCodeBatches)
    .where("ownerId", "==", caller.id)
    .where("purpose", "==", purpose)
    .where("status", "==", "active")
    .get();
  const batchWrite = db.batch();
  for (const doc of existing.docs) batchWrite.update(doc.ref, { status: "revoked" });
  await batchWrite.commit();

  const salt = randomId("salt");
  const codes: Array<{ counter: number; code: string }> = [];
  const codeHashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomDigits(6);
    codes.push({ counter: i, code });
    codeHashes.push(hashWithSalt(code, salt));
  }
  const batchId = randomId("vcb");
  const expiresAt = addHours(nowIso(), 24 * 30);
  await db.collection(Col.VerificationCodeBatches).doc(batchId).set({
    ownerId: caller.id,
    purpose,
    codeHashes,
    salt,
    usedCounters: [],
    issuedAt: nowIso(),
    expiresAt,
    status: "active",
  });
  return { success: true, batchId, codes, expiresAt };
}

export async function authorizeVerificationFallback(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const grantedTo = requireNonEmpty(ctx.data.grantedTo, "grantedTo");
  const transferKind = requireNonEmpty(ctx.data.transferKind, "transferKind");
  exactlyOne(ctx.data, ["orderId", "merchantOrderId", "custodyTransferId", "settlementId"]);
  const grantee = await db.collection(Col.UserProfiles).doc(grantedTo).get();
  if (!grantee.exists) fail("NOT_FOUND");
  if (!["vehicle", "merchant"].includes(String(grantee.data()?.role))) fail("INVALID_ARGUMENT");

  const live = await db
    .collection(Col.VerificationFallbackAuthorizations)
    .where("grantedTo", "==", grantedTo)
    .where("status", "==", "active")
    .where("transferKind", "==", transferKind)
    .limit(5)
    .get();
  if (!live.empty) fail("ALREADY_EXISTS");

  const authorizationId = randomId("vfa");
  const expiresAt = addHours(nowIso(), 2);
  await db.collection(Col.VerificationFallbackAuthorizations).doc(authorizationId).set({
    status: "active",
    transferKind,
    orderId: ctx.data.orderId ?? null,
    merchantOrderId: ctx.data.merchantOrderId ?? null,
    custodyTransferId: ctx.data.custodyTransferId ?? null,
    settlementId: ctx.data.settlementId ?? null,
    grantedTo,
    grantedBy: caller.id,
    grantedByRole: caller.role,
    reason,
    expiresAt,
    createdAt: nowIso(),
  });
  if (ctx.data.requestId) {
    const req = await db.collection(Col.VerificationFallbackRequests).doc(String(ctx.data.requestId)).get();
    if (req.exists && req.data()?.status === "pending") {
      await req.ref.update({ status: "granted", authorizationId });
    }
  }
  await notifyMany([grantedTo], {
    category: "verification",
    title: "Verification fallback granted",
    body: reason,
  });
  return { success: true, authorizationId, expiresAt };
}

export async function initiateCreditRepayment(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  const key = requireIdempotencyKey(ctx.data);
  const merchantId = requireNonEmpty(ctx.data.merchantId, "merchantId");
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const amount = Number(ctx.data.amount);
  if (amount <= 0) fail("INVALID_AMOUNT");
  const cached = await shortCircuit<Record<string, unknown>>(key, `${merchantId}:${amount}`);
  if (cached) return cached;

  const gig = await db.collection(Col.Gigs).doc(gigId).get();
  if (!gig.exists) fail("NOT_FOUND");
  const g = gig.data() as { status: string; vehicleId: string; merchantIds?: string[]; supplierId: string };
  if (g.status !== "started" || g.vehicleId !== caller.id || !(g.merchantIds ?? []).includes(merchantId)) {
    fail("PERMISSION_DENIED");
  }
  const credit = await db.collection(Col.CreditProfiles).doc(merchantId).get();
  if (!credit.exists) fail("NOT_FOUND");
  const c = credit.data() as { creditUsed: number; pendingRepayments?: number; supplierId: string };
  const payable = c.creditUsed - Number(c.pendingRepayments ?? 0);
  if (payable <= 0) fail("INVALID_STATE");
  if (amount > payable) fail("AMOUNT_MISMATCH");

  const custodyTransferId = randomId("ct");
  const challengeExpiresAt = addHours(nowIso(), 0.5);
  await db.collection(Col.CustodyTransfers).doc(custodyTransferId).set({
    kind: "credit_repayment",
    status: "pending",
    gigId,
    supplierId: c.supplierId,
    fromPartyId: merchantId,
    fromRole: "merchant",
    toPartyId: caller.id,
    toRole: "vehicle",
    cashAmount: amount,
    duesTargeted: ctx.data.duesTargeted ?? [],
    idempotencyKey: key,
    initiatedAt: nowIso(),
    challengeExpiresAt,
  });
  const code = randomDigits(6);
  await db.collection(Col.CustodyTransfers).doc(custodyTransferId).collection("private").doc("code").set({
    code,
    sendCount: 1,
    failedAttempts: 0,
    lastSentAt: nowIso(),
  });
  const merchant = await db.collection(Col.UserProfiles).doc(merchantId).get();
  const phone = merchant.data()?.phone as string | undefined;
  if (phone) await sendSms(phone, `Logikchain repayment code: ${code}`);
  await notify({
    userId: merchantId,
    category: "verification",
    title: "Credit repayment requested",
    body: `Driver is collecting ₹${amount}`,
  });
  const result = {
    success: true,
    custodyTransferId,
    amount,
    outstandingBefore: c.creditUsed,
    challengeExpiresAt,
    codeSentTo: phone ? `******${phone.replace(/\D/g, "").slice(-4)}` : "****",
  };
  return remember(key, `${merchantId}:${amount}`, result);
}

export async function confirmCreditRepayment(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  const key = requireIdempotencyKey(ctx.data);
  const custodyTransferId = requireNonEmpty(ctx.data.custodyTransferId, "custodyTransferId");
  const cached = await shortCircuit<Record<string, unknown>>(key, custodyTransferId);
  if (cached) return cached;
  const transferSnap = await db.collection(Col.CustodyTransfers).doc(custodyTransferId).get();
  if (!transferSnap.exists) fail("NOT_FOUND");
  const t = transferSnap.data() as {
    kind: string;
    status: string;
    toPartyId: string;
    fromPartyId: string;
    cashAmount: number;
    gigId: string;
    supplierId: string;
    challengeExpiresAt: string;
    duesTargeted?: string[];
  };
  if (t.kind !== "credit_repayment" || t.toPartyId !== caller.id) fail("PERMISSION_DENIED");
  if (t.status !== "pending") fail("INVALID_STATE");
  if (new Date(t.challengeExpiresAt).getTime() < Date.now()) {
    await transferSnap.ref.update({ status: "expired" });
    fail("CUSTODY_TRANSFER_EXPIRED");
  }
  const merchant = await db.collection(Col.UserProfiles).doc(t.fromPartyId).get();
  const verification = await verifyCustody({
    ctx,
    proof: ctx.data.proof as VerificationInput,
    kind: "credit_repayment",
    callerId: caller.id,
    counterpartyId: t.fromPartyId,
    counterpartyPhone: merchant.data()?.phone as string | undefined,
    privateRef: transferSnap.ref.collection("private").doc("code"),
    target: { custodyTransferId },
  });

  const creditTransactionId = randomId("ctxn");
  const cashLedgerEntryId = randomId("cle");
  let creditUsed = 0;
  let creditAvailable = 0;
  let pendingRepayments = 0;
  let provisionalCreditGranted = 0;
  const reliefDueBy = addHours(nowIso(), PENDING_REPAYMENT_RELIEF_CEILING_HOURS);
  let cashInCustody = 0;

  await db.runTransaction(async (tx) => {
    const creditRef = db.collection(Col.CreditProfiles).doc(t.fromPartyId);
    const credit = await tx.get(creditRef);
    if (!credit.exists) fail("NOT_FOUND");
    const c = credit.data() as {
      creditUsed: number;
      creditLimit: number;
      pendingRepayments?: number;
      provisionalCreditEnabled?: boolean;
      provisionalCreditCap?: number;
      paymentsDue?: Array<Record<string, unknown>>;
      paymentsMade?: Array<Record<string, unknown>>;
    };
    creditUsed = c.creditUsed;
    pendingRepayments = Number(c.pendingRepayments ?? 0) + t.cashAmount;
    provisionalCreditGranted = c.provisionalCreditEnabled
      ? Math.min(pendingRepayments, Number(c.provisionalCreditCap ?? 0))
      : 0;
    creditAvailable = c.creditLimit - creditUsed + provisionalCreditGranted;
    const dues = (c.paymentsDue ?? []).map((d) =>
      (t.duesTargeted ?? []).includes(String(d.merchantOrderId ?? d.id)) ? { ...d, status: "paid" } : d
    );
    tx.update(creditRef, {
      pendingRepayments,
      provisionalCreditGranted,
      creditAvailable,
      paymentsDue: dues,
      paymentsMade: [
        ...(c.paymentsMade ?? []),
        {
          method: "cash_to_driver",
          settled: false,
          amount: t.cashAmount,
          custodyTransferId,
          reliefDueBy,
          at: nowIso(),
        },
      ],
      lastTransactionId: creditTransactionId,
      updatedAt: nowIso(),
    });
    tx.set(db.collection(Col.CreditTransactions).doc(creditTransactionId), {
      type: "repayment_cash_pending",
      amount: t.cashAmount,
      creditLimitAfter: c.creditLimit,
      creditUsedAfter: creditUsed,
      creditAvailableAfter: creditAvailable,
      pendingRepaymentsAfter: pendingRepayments,
      provisionalCreditGrantedAfter: provisionalCreditGranted,
      custodyTransferId,
      actorId: caller.id,
      actorRole: "vehicle",
      recordedAt: nowIso(),
    });
    tx.set(db.collection(Col.CashLedgerEntries).doc(cashLedgerEntryId), {
      direction: "collected",
      source: "merchant_credit_repayment",
      status: "in_custody",
      amount: t.cashAmount,
      supplierId: t.supplierId,
      holderId: caller.id,
      holderRole: "vehicle",
      gigId: t.gigId,
      merchantId: t.fromPartyId,
      custodyTransferId,
      capturedAt: verification.capturedAt,
      recordedAt: nowIso(),
      recordedBy: caller.id,
    });
    const earnRef = db.collection(Col.DriverEarnings).doc(caller.id);
    const earn = await tx.get(earnRef);
    cashInCustody = Number(earn.data()?.cashInCustody ?? 0) + t.cashAmount;
    tx.set(earnRef, { cashInCustody }, { merge: true });
    tx.update(transferSnap.ref, {
      status: "verified",
      verification,
      verifiedAt: nowIso(),
      capturedAt: verification.capturedAt,
      cashLedgerEntryId,
      creditTransactionId,
    });
  });

  await notifyMany([t.fromPartyId, t.supplierId, caller.id], {
    category: "cash_custody",
    title: "Cash repayment recorded",
    body: `₹${t.cashAmount} is in driver custody. Credit restores at settlement or by ${reliefDueBy}.`,
  });
  const result = {
    success: true,
    creditTransactionId,
    cashLedgerEntryId,
    creditUsed,
    creditAvailable,
    pendingRepayments,
    provisionalCreditGranted,
    reliefDueBy,
    cashInCustody,
  };
  return remember(key, custodyTransferId, result);
}

export async function getCashCustodySummary(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle", "merchant", "supplier", "support"] });
  let scope = (ctx.data.scope as string | undefined) ??
    (ctx.data.settlementId ? "settlement" : ctx.data.driverId ? "driver" : ctx.data.merchantId ? "merchant" : ctx.data.gigId ? "gig" : "gig");
  if ((caller.role === "vehicle" || caller.role === "merchant") && ["supplier", "platform"].includes(scope)) {
    fail("PERMISSION_DENIED");
  }
  if (caller.role === "supplier" && scope === "platform") fail("PERMISSION_DENIED");
  if (caller.role === "vehicle") {
    if (ctx.data.driverId && ctx.data.driverId !== caller.id) fail("PERMISSION_DENIED");
  }
  if (caller.role === "merchant") {
    if (ctx.data.merchantId && ctx.data.merchantId !== caller.id) fail("PERMISSION_DENIED");
  }

  const holderId =
    scope === "driver" ? String(ctx.data.driverId ?? caller.id) :
    scope === "merchant" ? String(ctx.data.merchantId ?? caller.id) :
    undefined;

  if (ctx.data.settlementId) {
    const s = await db.collection(Col.CashSettlements).doc(String(ctx.data.settlementId)).get();
    if (!s.exists) fail("NOT_FOUND");
    const settlement = s.data() as {
      expectedAmount: number;
      breakdown: unknown[];
      status: string;
      ledgerEntryIds?: string[];
      driverId: string;
      supplierId: string;
      gigId?: string;
    };
    if (caller.role === "vehicle" && settlement.driverId !== caller.id) fail("PERMISSION_DENIED");
    if (caller.role === "supplier" && settlement.supplierId !== caller.id) fail("PERMISSION_DENIED");
    const entries = [];
    for (const id of settlement.ledgerEntryIds ?? []) {
      const e = await db.collection(Col.CashLedgerEntries).doc(id).get();
      if (e.exists) entries.push({ id: e.id, ...e.data() });
    }
    return {
      scope: "settlement",
      settlementId: s.id,
      settlementStatus: settlement.status,
      gigId: settlement.gigId,
      driverId: settlement.driverId,
      supplierId: settlement.supplierId,
      expectedAmount: settlement.expectedAmount,
      weakProofAmount: 0,
      breakdown: settlement.breakdown,
      entries,
      openSettlementCount: settlement.status === "settled" ? 0 : 1,
      openDiscrepancyCount: 0,
      asOf: nowIso(),
    };
  }

  let query: FirebaseFirestore.Query = db.collection(Col.CashLedgerEntries).where("status", "==", "in_custody");
  if (holderId) query = query.where("holderId", "==", holderId);
  if (ctx.data.gigId) query = query.where("gigId", "==", ctx.data.gigId);
  if (caller.role === "supplier" && scope !== "platform") query = query.where("supplierId", "==", caller.id);
  const snaps = await query.limit(500).get();
  const breakdownMap = new Map<string, number>();
  const holdersMap = new Map<string, number>();
  let expectedAmount = 0;
  const entries: Array<Record<string, unknown>> = [];
  for (const doc of snaps.docs) {
    const e = doc.data();
    if (caller.role === "supplier" && e.supplierId && e.supplierId !== caller.id) continue;
    expectedAmount += Number(e.amount ?? 0);
    const source = String(e.source ?? "other");
    breakdownMap.set(source, (breakdownMap.get(source) ?? 0) + Number(e.amount ?? 0));
    holdersMap.set(String(e.holderId), (holdersMap.get(String(e.holderId)) ?? 0) + Number(e.amount ?? 0));
    if (scope !== "supplier" && scope !== "platform") entries.push({ id: doc.id, ...e });
  }
  const breakdown = [...breakdownMap.entries()].map(([source, amount]) => ({
    source,
    amount,
    label: scope === "supplier" || scope === "platform" ? holderRoleLabel(source) : settlementLabel(source),
  }));
  return {
    scope,
    expectedAmount,
    weakProofAmount: 0,
    breakdown,
    entries,
    holders: ["supplier", "platform"].includes(scope)
      ? [...holdersMap.entries()].map(([id, amountInCustody]) => ({ holderId: id, amountInCustody }))
      : undefined,
    openSettlementCount: 0,
    openDiscrepancyCount: 0,
    asOf: nowIso(),
  };
}

export async function declareCashHandover(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  const key = requireIdempotencyKey(ctx.data);
  const settlementId = requireNonEmpty(ctx.data.settlementId, "settlementId");
  const cached = await shortCircuit<Record<string, unknown>>(key, settlementId);
  if (cached) return cached;
  const declaredAmount = Number(ctx.data.declaredAmount);
  if (declaredAmount < 0) fail("INVALID_AMOUNT");
  const snap = await db.collection(Col.CashSettlements).doc(settlementId).get();
  if (!snap.exists) fail("NOT_FOUND");
  const s = snap.data() as { driverId: string; status: string; expectedAmount: number };
  if (s.driverId !== caller.id) fail("PERMISSION_DENIED");
  if (["settled", "written_off"].includes(s.status)) fail("INVALID_STATE");
  if (declaredAmount !== s.expectedAmount) requireNonEmpty(ctx.data.varianceNote, "varianceNote");
  const challengeExpiresAt = addHours(nowIso(), 24);
  await snap.ref.update({
    status: "declared",
    declaredAmount,
    declaredAt: nowIso(),
    varianceNote: ctx.data.varianceNote ?? null,
    challengeExpiresAt,
  });
  await notify({
    userId: String((await snap.ref.get()).data()?.supplierId),
    category: "cash_custody",
    title: "Driver declared handover",
    body: `Expected ₹${s.expectedAmount}, declared ₹${declaredAmount}`,
  });
  const result = {
    success: true,
    settlementId,
    status: "declared",
    expectedAmount: s.expectedAmount,
    declaredAmount,
    variance: declaredAmount - s.expectedAmount,
    challengeExpiresAt,
  };
  return remember(key, settlementId, result);
}

export async function confirmCashSettlement(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle", "supplier", "support"] });
  const key = requireIdempotencyKey(ctx.data);
  const settlementId = requireNonEmpty(ctx.data.settlementId, "settlementId");
  const cached = await shortCircuit<Record<string, unknown>>(key, settlementId);
  if (cached) return cached;
  const countedAmount = Number(ctx.data.countedAmount);
  if (countedAmount < 0) fail("INVALID_AMOUNT");
  const snap = await db.collection(Col.CashSettlements).doc(settlementId).get();
  if (!snap.exists) fail("NOT_FOUND");
  const s = snap.data() as {
    status: string;
    driverId: string;
    supplierId: string;
    expectedAmount: number;
    ledgerEntryIds?: string[];
    gigId?: string;
  };
  if (s.status === "settled") fail("SETTLEMENT_ALREADY_CONFIRMED");
  if (!["pending", "declared", "disputed"].includes(s.status)) fail("INVALID_STATE");
  if (caller.role === "vehicle" && caller.id !== s.driverId) fail("PERMISSION_DENIED");
  if (caller.role === "supplier" && caller.id !== s.supplierId) fail("PERMISSION_DENIED");

  const supplier = await db.collection(Col.UserProfiles).doc(s.supplierId).get();
  const proof = (caller.role === "supplier"
    ? { method: "otp", capturedAt: nowIso() }
    : ctx.data.proof) as VerificationInput;
  const verification = await verifyCustody({
    ctx,
    proof,
    kind: "cash_settlement",
    callerId: caller.id,
    counterpartyId: s.supplierId,
    counterpartyPhone: supplier.data()?.phone as string | undefined,
    privateRef: snap.ref.collection("private").doc("code"),
    target: { settlementId },
  });

  const variance = countedAmount - s.expectedAmount;
  const varianceKind = variance === 0 ? "none" : variance < 0 ? "shortfall" : "overage";
  if (varianceKind !== "none") {
    requireNonEmpty(ctx.data.varianceResolution, "varianceResolution");
    requireNonEmpty(ctx.data.varianceNote, "varianceNote");
  }
  const resolution = ctx.data.varianceResolution as string | undefined;
  if (resolution === "waive" && caller.role === "vehicle") fail("INVALID_ARGUMENT");

  let ledgerSum = 0;
  const entrySnaps: FirebaseFirestore.DocumentSnapshot[] = [];
  for (const id of s.ledgerEntryIds ?? []) {
    const e = await db.collection(Col.CashLedgerEntries).doc(id).get();
    if (!e.exists) fail("NOT_FOUND");
    ledgerSum += Number(e.data()?.amount ?? 0);
    entrySnaps.push(e);
  }
  if (Math.abs(ledgerSum - s.expectedAmount) > 0.01) fail("LEDGER_IMBALANCE");

  const transferId = randomId("ct");
  let discrepancyId: string | undefined;
  let cashInCustody = 0;
  const escalate = resolution === "escalate_to_support";

  await db.runTransaction(async (tx) => {
    if (!escalate) {
      for (const e of entrySnaps) {
        tx.update(e.ref, { status: "settled", settlementId });
      }
      tx.set(db.collection(Col.CashLedgerEntries).doc(randomId("cle")), {
        direction: "settled",
        source: "settlement",
        status: "settled",
        amount: countedAmount,
        supplierId: s.supplierId,
        holderId: s.supplierId,
        holderRole: "supplier",
        settlementId,
        custodyTransferId: transferId,
        recordedAt: nowIso(),
        recordedBy: caller.id,
      });
    }
    const earnRef = db.collection(Col.DriverEarnings).doc(s.driverId);
    const earn = await tx.get(earnRef);
    cashInCustody = Math.max(0, Number(earn.data()?.cashInCustody ?? 0) - s.expectedAmount);
    const open = ((earn.data()?.openSettlementIds as string[]) ?? []).filter((id) => id !== settlementId);
    tx.set(earnRef, { cashInCustody, openSettlementIds: open }, { merge: true });

    for (const e of entrySnaps) {
      if (e.data()?.source !== "merchant_credit_repayment") continue;
      const merchantId = String(e.data()?.merchantId);
      const amount = Number(e.data()?.amount ?? 0);
      const creditRef = db.collection(Col.CreditProfiles).doc(merchantId);
      const credit = await tx.get(creditRef);
      if (!credit.exists) continue;
      const c = credit.data() as {
        creditUsed: number;
        creditLimit: number;
        pendingRepayments?: number;
        provisionalCreditGranted?: number;
        provisionalCreditEnabled?: boolean;
        provisionalCreditCap?: number;
        paymentsMade?: Array<Record<string, unknown>>;
      };
      const creditUsed = Math.max(0, c.creditUsed - amount);
      const pendingRepayments = Math.max(0, Number(c.pendingRepayments ?? 0) - amount);
      const provisionalCreditGranted = c.provisionalCreditEnabled
        ? Math.min(pendingRepayments, Number(c.provisionalCreditCap ?? 0))
        : 0;
      const creditAvailable = c.creditLimit - creditUsed + provisionalCreditGranted;
      const txnId = randomId("ctxn");
      tx.update(creditRef, {
        creditUsed,
        pendingRepayments,
        provisionalCreditGranted,
        creditAvailable,
        paymentsMade: (c.paymentsMade ?? []).map((p) =>
          p.custodyTransferId === e.data()?.custodyTransferId
            ? { ...p, settled: true, settledAt: nowIso(), settledCreditTransactionId: txnId }
            : p
        ),
        lastTransactionId: txnId,
        updatedAt: nowIso(),
      });
      tx.set(db.collection(Col.CreditTransactions).doc(txnId), {
        type: "repayment_cash_settled",
        amount,
        creditUsedAfter: creditUsed,
        creditAvailableAfter: creditAvailable,
        settlementId,
        settlesTransactionId: e.data()?.creditTransactionId ?? null,
        actorId: caller.id,
        recordedAt: nowIso(),
      });
    }

    if (varianceKind === "shortfall" && resolution === "recover_from_earnings") {
      tx.set(earnRef, { cashRecoverable: FieldValue.increment(Math.abs(variance)) }, { merge: true });
    }
    if (escalate) {
      discrepancyId = randomId("cdp");
      tx.set(db.collection(Col.CashDiscrepancies).doc(discrepancyId), {
        kind: varianceKind,
        amount: Math.abs(variance),
        status: "open",
        settlementId,
        raisedBy: caller.id,
        againstPartyId: s.driverId,
        supplierId: s.supplierId,
        createdAt: nowIso(),
      });
      tx.update(snap.ref, { status: "disputed", discrepancyId, countedAmount, variance, varianceKind });
    } else {
      tx.update(snap.ref, {
        status: "settled",
        countedAmount,
        variance,
        varianceKind,
        varianceResolution: resolution ?? "none",
        confirmedAt: nowIso(),
        confirmedBy: caller.id,
        custodyTransferId: transferId,
      });
    }
    tx.set(db.collection(Col.CustodyTransfers).doc(transferId), {
      kind: "cash_settlement",
      status: escalate ? "disputed" : "verified",
      fromPartyId: s.driverId,
      toPartyId: s.supplierId,
      toRole: "supplier",
      settlementId,
      cashAmount: countedAmount,
      verification,
      idempotencyKey: key,
      initiatedAt: nowIso(),
      verifiedAt: nowIso(),
    });
  });

  await notifyMany([s.driverId, s.supplierId], {
    category: "cash_custody",
    title: escalate ? "Settlement disputed" : "Settlement confirmed",
    body: `Counted ₹${countedAmount} against expected ₹${s.expectedAmount}`,
  });
  const result = {
    success: true,
    settlementId,
    status: escalate ? "disputed" : "settled",
    expectedAmount: s.expectedAmount,
    countedAmount,
    variance,
    varianceKind,
    discrepancyId,
    cashInCustody,
  };
  return remember(key, settlementId, result);
}

export async function raiseCashDiscrepancy(ctx: CallContext) {
  const caller = await requireCaller(ctx);
  const kind = requireNonEmpty(ctx.data.kind, "kind");
  const description = requireNonEmpty(ctx.data.description, "description");
  const amount = Number(ctx.data.amount);
  if (amount <= 0) fail("INVALID_AMOUNT");
  const againstPartyId = requireNonEmpty(ctx.data.againstPartyId, "againstPartyId");
  if (
    !ctx.data.gigId &&
    !ctx.data.settlementId &&
    !ctx.data.custodyTransferId &&
    !ctx.data.orderId &&
    !ctx.data.merchantOrderId &&
    !ctx.data.payoutTransactionId
  ) {
    fail("INVALID_ARGUMENT", "At least one entity reference is required");
  }
  const discrepancyId = randomId("cdp");
  let supplierId = caller.supplierId;
  if (ctx.data.settlementId) {
    const s = await db.collection(Col.CashSettlements).doc(String(ctx.data.settlementId)).get();
    if (!s.exists) fail("NOT_FOUND");
    supplierId = String(s.data()?.supplierId);
    await s.ref.update({ status: "disputed", discrepancyId });
  }
  await db.collection(Col.CashDiscrepancies).doc(discrepancyId).set({
    kind,
    amount,
    againstPartyId,
    gigId: ctx.data.gigId ?? null,
    settlementId: ctx.data.settlementId ?? null,
    custodyTransferId: ctx.data.custodyTransferId ?? null,
    orderId: ctx.data.orderId ?? null,
    merchantOrderId: ctx.data.merchantOrderId ?? null,
    payoutTransactionId: ctx.data.payoutTransactionId ?? null,
    description,
    evidenceUrls: ctx.data.evidenceUrls ?? [],
    status: "open",
    raisedBy: caller.id,
    raisedByRole: caller.role,
    supplierId: supplierId ?? null,
    createdAt: nowIso(),
  });
  await notifyMany([againstPartyId, supplierId], {
    category: "cash_custody",
    title: "Cash discrepancy raised",
    body: description,
  });
  return { success: true, discrepancyId, status: "open" };
}

export async function resolveCashDiscrepancy(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const discrepancyId = requireNonEmpty(ctx.data.discrepancyId, "discrepancyId");
  const resolution = requireNonEmpty(ctx.data.resolution, "resolution");
  const resolutionNote = requireNonEmpty(ctx.data.resolutionNote, "resolutionNote");
  if (resolution === "escalate_to_support" && caller.role !== "support") fail("PERMISSION_DENIED");
  const snap = await db.collection(Col.CashDiscrepancies).doc(discrepancyId).get();
  if (!snap.exists) fail("NOT_FOUND");
  const d = snap.data() as {
    status: string;
    supplierId?: string;
    amount: number;
    kind: string;
    againstPartyId?: string;
    raisedBy?: string;
    settlementId?: string;
  };
  if (caller.role === "supplier" && d.supplierId !== caller.id) fail("PERMISSION_DENIED");
  if (!["open", "under_review"].includes(d.status)) fail("INVALID_STATE");
  const adjustedAmount = Number(ctx.data.adjustedAmount ?? d.amount);
  if (adjustedAmount <= 0 || adjustedAmount > d.amount) fail("INVALID_AMOUNT");
  if (resolution === "recover_from_earnings" && d.kind === "overage") fail("INVALID_ARGUMENT");
  if (resolution === "waive" && d.kind === "overage" && caller.role !== "support") fail("PERMISSION_DENIED");

  const cashLedgerEntryId = randomId("cle");
  const status = resolution === "waive" ? "written_off" : resolution === "escalate_to_support" ? "under_review" : "resolved";
  if (resolution !== "escalate_to_support") {
    await db.collection(Col.CashLedgerEntries).doc(cashLedgerEntryId).set({
      direction: "adjustment",
      source: resolution === "waive" ? (d.kind === "overage" ? "overage" : "waiver") : "shortfall",
      status: resolution === "carry_forward" ? "in_custody" : "settled",
      amount: adjustedAmount,
      supplierId: d.supplierId ?? null,
      holderId: d.againstPartyId ?? null,
      recordedAt: nowIso(),
      recordedBy: caller.id,
      discrepancyId,
    });
    if (resolution === "recover_from_earnings" && d.againstPartyId) {
      await db.collection(Col.DriverEarnings).doc(d.againstPartyId).set(
        { cashRecoverable: FieldValue.increment(adjustedAmount) },
        { merge: true }
      );
    }
  }
  await snap.ref.update({
    status,
    resolution,
    resolutionNote,
    resolvedBy: caller.id,
    resolvedAt: nowIso(),
    adjustedAmount,
  });
  if (d.settlementId && status !== "under_review") {
    const others = await db
      .collection(Col.CashDiscrepancies)
      .where("settlementId", "==", d.settlementId)
      .where("status", "in", ["open", "under_review"])
      .get();
    if (others.empty) {
      await db.collection(Col.CashSettlements).doc(d.settlementId).update({ status: "settled" });
    }
  }
  await notifyMany([d.raisedBy, d.againstPartyId], {
    category: "cash_custody",
    title: "Discrepancy resolved",
    body: resolutionNote,
  });
  return { success: true, discrepancyId, status, cashLedgerEntryId };
}
