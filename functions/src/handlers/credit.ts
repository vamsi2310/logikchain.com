import { db } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { appendAudit } from "../lib/audit";
import { randomId } from "../lib/crypto";
import { notify } from "../lib/notify";
import { nowIso } from "../lib/time";
import { requireNonEmpty } from "../lib/validate";

export async function requestCreditIncrease(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["merchant"] });
  const requestedAmount = Number(ctx.data.requestedAmount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) fail("INVALID_AMOUNT");
  requireNonEmpty(ctx.data.reason, "reason");
  const pending = await db
    .collection(Col.CreditIncreaseRequests)
    .where("merchantId", "==", caller.id)
    .where("status", "==", "pending_supplier_approval")
    .limit(1)
    .get();
  if (!pending.empty) fail("DUPLICATE_PENDING_REQUEST");
  const requestId = randomId("cir");
  await db.collection(Col.CreditIncreaseRequests).doc(requestId).set({
    merchantId: caller.id,
    supplierId: caller.supplierId ?? null,
    requestedAmount,
    reason: ctx.data.reason,
    status: "pending_supplier_approval",
    createdAt: nowIso(),
  });
  if (caller.supplierId) {
    await notify({
      userId: caller.supplierId,
      category: "credit",
      title: "Credit increase requested",
      body: `${caller.name ?? "Merchant"} requested ₹${requestedAmount}`,
    });
  }
  return { success: true, requestId };
}

export async function setMerchantCreditLimit(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const merchantId = requireNonEmpty(ctx.data.merchantId, "merchantId");
  const creditLimit = Number(ctx.data.creditLimit);
  if (!Number.isFinite(creditLimit) || creditLimit < 0) fail("INVALID_ARGUMENT");
  const merchant = await db.collection(Col.UserProfiles).doc(merchantId).get();
  if (!merchant.exists) fail("NOT_FOUND");
  const m = merchant.data() as { role: string; status: string; supplierId?: string };
  if (m.role !== "merchant" || m.status !== "approved") fail("INVALID_STATE");
  if (caller.role === "supplier" && m.supplierId !== caller.id) fail("PERMISSION_DENIED");

  let creditAvailable = 0;
  await db.runTransaction(async (tx) => {
    const ref = db.collection(Col.CreditProfiles).doc(merchantId);
    const snap = await tx.get(ref);
    if (!snap.exists) fail("NOT_FOUND", "credit profile not found");
    const c = snap.data() as { creditUsed: number; creditLimit: number };
    if (creditLimit < c.creditUsed) fail("INVALID_STATE", "New limit is below creditUsed");
    creditAvailable = creditLimit - c.creditUsed;
    const txnId = randomId("ctxn");
    tx.update(ref, { creditLimit, creditAvailable, lastTransactionId: txnId, updatedAt: nowIso() });
    tx.set(db.collection(Col.CreditTransactions).doc(txnId), {
      type: "limit_change",
      amount: Math.abs(creditLimit - c.creditLimit),
      creditLimitAfter: creditLimit,
      creditUsedAfter: c.creditUsed,
      creditAvailableAfter: creditAvailable,
      actorId: caller.id,
      actorRole: caller.role,
      reason: ctx.data.note ?? null,
      recordedAt: nowIso(),
    });
  });
  await notify({
    userId: merchantId,
    category: "credit",
    title: "Credit limit updated",
    body: ctx.data.note ? String(ctx.data.note) : `New limit ₹${creditLimit}`,
  });
  return { success: true, creditLimit, creditAvailable };
}

export async function reviewCreditIncreaseRequest(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const requestId = requireNonEmpty(ctx.data.requestId, "requestId");
  const decision = ctx.data.decision as string;
  const reqSnap = await db.collection(Col.CreditIncreaseRequests).doc(requestId).get();
  if (!reqSnap.exists) fail("NOT_FOUND");
  const req = reqSnap.data() as {
    status: string;
    merchantId: string;
    requestedAmount: number;
  };
  const merchant = await db.collection(Col.UserProfiles).doc(req.merchantId).get();
  if (caller.role === "supplier" && merchant.data()?.supplierId !== caller.id) {
    fail("PERMISSION_DENIED");
  }
  if (req.status !== "pending_supplier_approval") fail("INVALID_STATE");

  let creditLimit = 0;
  let creditAvailable = 0;
  if (decision === "approve") {
    const approvedAmount = Number(ctx.data.approvedAmount ?? req.requestedAmount);
    if (approvedAmount <= 0 || approvedAmount > req.requestedAmount) fail("INVALID_ARGUMENT");
    await db.runTransaction(async (tx) => {
      const creditRef = db.collection(Col.CreditProfiles).doc(req.merchantId);
      const credit = await tx.get(creditRef);
      if (!credit.exists) fail("NOT_FOUND");
      const c = credit.data() as { creditLimit: number; creditUsed: number };
      creditLimit = c.creditLimit + approvedAmount;
      creditAvailable = creditLimit - c.creditUsed;
      const txnId = randomId("ctxn");
      tx.update(creditRef, {
        creditLimit,
        creditAvailable,
        lastTransactionId: txnId,
        updatedAt: nowIso(),
      });
      tx.set(db.collection(Col.CreditTransactions).doc(txnId), {
        type: "limit_change",
        amount: approvedAmount,
        creditLimitAfter: creditLimit,
        creditUsedAfter: c.creditUsed,
        creditAvailableAfter: creditAvailable,
        creditIncreaseRequestId: requestId,
        actorId: caller.id,
        actorRole: caller.role,
        recordedAt: nowIso(),
      });
      tx.update(reqSnap.ref, {
        status: "approved",
        approvedAmount,
        reviewedBy: caller.id,
        reviewedAt: nowIso(),
      });
    });
  } else if (decision === "reject") {
    const rejectionReason = requireNonEmpty(ctx.data.rejectionReason, "rejectionReason");
    const credit = await db.collection(Col.CreditProfiles).doc(req.merchantId).get();
    creditLimit = Number(credit.data()?.creditLimit ?? 0);
    creditAvailable = Number(credit.data()?.creditAvailable ?? 0);
    await reqSnap.ref.update({
      status: "rejected",
      rejectionReason,
      reviewedBy: caller.id,
      reviewedAt: nowIso(),
    });
  } else {
    fail("INVALID_ARGUMENT");
  }
  await notify({
    userId: req.merchantId,
    category: "credit",
    title: decision === "approve" ? "Credit increase approved" : "Credit increase rejected",
    body: decision === "approve" ? `New limit ₹${creditLimit}` : String(ctx.data.rejectionReason),
  });
  return { success: true, status: decision === "approve" ? "approved" : "rejected", creditLimit, creditAvailable };
}

export async function setProvisionalCreditPolicy(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const merchantId = requireNonEmpty(ctx.data.merchantId, "merchantId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const enabled = Boolean(ctx.data.enabled);
  const cap = Number(ctx.data.cap);
  if (cap < 0 || (!enabled && cap !== 0)) fail("INVALID_AMOUNT");
  const creditRef = db.collection(Col.CreditProfiles).doc(merchantId);
  const snap = await creditRef.get();
  if (!snap.exists) fail("NOT_FOUND");
  const c = snap.data() as {
    supplierId: string;
    creditLimit: number;
    creditUsed: number;
    pendingRepayments?: number;
    provisionalCreditGranted?: number;
  };
  if (caller.role === "supplier" && c.supplierId !== caller.id) fail("PERMISSION_DENIED");
  if (cap > c.creditLimit) fail("INVALID_AMOUNT");
  const pending = Number(c.pendingRepayments ?? 0);
  const provisionalCreditGranted = enabled ? Math.min(pending, cap) : 0;
  const creditAvailable = c.creditLimit - c.creditUsed + provisionalCreditGranted;
  let creditTransactionId: string | undefined;
  const delta = provisionalCreditGranted - Number(c.provisionalCreditGranted ?? 0);
  if (delta !== 0) {
    creditTransactionId = randomId("ctxn");
    await db.collection(Col.CreditTransactions).doc(creditTransactionId).set({
      type: delta > 0 ? "provisional_grant" : "provisional_release",
      amount: Math.abs(delta),
      creditLimitAfter: c.creditLimit,
      creditUsedAfter: c.creditUsed,
      creditAvailableAfter: creditAvailable,
      actorId: caller.id,
      reason,
      recordedAt: nowIso(),
    });
  }
  await creditRef.update({
    provisionalCreditEnabled: enabled,
    provisionalCreditCap: cap,
    provisionalCreditGranted,
    creditAvailable,
    updatedAt: nowIso(),
  });
  await notify({
    userId: merchantId,
    category: "credit",
    title: "Provisional credit updated",
    body: `Provisional ceiling ₹${cap}`,
  });
  await appendAudit({
    category: "credit",
    actorId: caller.id,
    subjectId: merchantId,
    reason,
    after: { enabled, cap },
    correlationId: ctx.correlationId,
  });
  return {
    success: true,
    merchantId,
    provisionalCreditEnabled: enabled,
    provisionalCreditCap: cap,
    provisionalCreditGranted,
    creditAvailable,
    creditTransactionId,
  };
}
