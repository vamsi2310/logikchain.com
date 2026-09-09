import { getFunctions } from "firebase-admin/functions";
import { db, FieldValue } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { appendAudit } from "../lib/audit";
import { encryptSecret, decryptSecret } from "../lib/kms";
import { fingerprint, randomId } from "../lib/crypto";
import { remember, requireIdempotencyKey, shortCircuit } from "../lib/idempotency";
import { notify } from "../lib/notify";
import { initiatePayoutOnRail, verifyWebhookSignature } from "../lib/razorpay";
import { addHours, nowIso } from "../lib/time";
import { requireNonEmpty, validateIfsc, validateVpa } from "../lib/validate";
import {
  BENEFICIARY_COOLING_HOURS,
  IMPS_CEILING_PAISE,
  PAYOUT_PER_REQUEST_CEILING_PAISE,
  isEmulator,
} from "../runtime";
import { rupeesToPaise } from "../lib/money";

function maskedBeneficiary(b: Record<string, unknown>) {
  return {
    beneficiaryId: b.id ?? b.beneficiaryId,
    type: b.type,
    maskedLabel: b.maskedLabel,
    accountNumberLast4: b.accountNumberLast4 ?? null,
    vpaHandle: b.vpaHandle ?? null,
  };
}

export async function requestPayout(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  const key = requireIdempotencyKey(ctx.data);
  const amount = Number(ctx.data.amount);
  if (amount <= 0 || rupeesToPaise(amount) > PAYOUT_PER_REQUEST_CEILING_PAISE) fail("INVALID_AMOUNT");
  const cached = await shortCircuit<Record<string, unknown>>(key, String(amount));
  if (cached) return cached;

  const earnRef = db.collection(Col.DriverEarnings).doc(caller.id);
  const profile = await db.collection(Col.UserProfiles).doc(caller.id).get();
  const beneficiaryId = profile.data()?.activeBeneficiaryId as string | undefined;
  if (!beneficiaryId) fail("BENEFICIARY_NOT_PAYABLE");
  const ben = await db.collection(Col.BeneficiaryAccounts).doc(beneficiaryId).get();
  if (!ben.exists) fail("BENEFICIARY_NOT_PAYABLE");
  const b = ben.data() as {
    status: string;
    verificationStatus: string;
    coolingPeriodEndsAt?: string;
    maskedLabel?: string;
    type?: string;
  };
  if (b.status !== "active" || b.verificationStatus !== "verified") fail("BENEFICIARY_NOT_PAYABLE");

  const payoutRequestId = randomId("prq");
  let pendingDues = 0;
  let reservedForPayout = 0;
  await db.runTransaction(async (tx) => {
    const earn = await tx.get(earnRef);
    if (!earn.exists) fail("NOT_FOUND");
    const e = earn.data() as {
      pendingDues: number;
      reservedForPayout?: number;
      cashInCustody?: number;
      payoutRequests?: Array<Record<string, unknown>>;
    };
    if (Number(e.cashInCustody ?? 0) > 0) fail("CASH_IN_CUSTODY_OUTSTANDING");
    if (e.pendingDues < amount) fail("INSUFFICIENT_DUES");
    pendingDues = e.pendingDues - amount;
    reservedForPayout = Number(e.reservedForPayout ?? 0) + amount;
    tx.update(earnRef, {
      pendingDues,
      reservedForPayout,
      payoutRequests: [
        ...(e.payoutRequests ?? []),
        {
          payoutRequestId,
          amount,
          status: "pending",
          cashInCustodyAtRequest: e.cashInCustody ?? 0,
          destination: { ...maskedBeneficiary({ id: beneficiaryId, ...b }), beneficiaryId },
          idempotencyKey: key,
          createdAt: nowIso(),
        },
      ],
    });
  });
  await notify({
    userId: String(profile.data()?.supplierId ?? ""),
    category: "payout",
    title: "Payout requested",
    body: `₹${amount} to ${b.maskedLabel}`,
  });
  await appendAudit({
    category: "payout",
    actorId: caller.id,
    actorRole: "vehicle",
    subjectId: payoutRequestId,
    after: { amount },
    idempotencyKey: key,
    correlationId: ctx.correlationId,
  });
  const result = {
    success: true,
    payoutRequestId,
    amount,
    destination: maskedBeneficiary({ id: beneficiaryId, ...b }),
    pendingDues,
    reservedForPayout,
    beneficiaryCoolingUntil: b.coolingPeriodEndsAt && new Date(b.coolingPeriodEndsAt) > new Date()
      ? b.coolingPeriodEndsAt
      : undefined,
  };
  return remember(key, String(amount), result);
}

export async function reviewPayoutRequest(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const driverId = requireNonEmpty(ctx.data.driverId, "driverId");
  const payoutRequestId = requireNonEmpty(ctx.data.payoutRequestId, "payoutRequestId");
  if (caller.id === driverId) fail("SEGREGATION_OF_DUTIES_VIOLATION");
  const driver = await db.collection(Col.UserProfiles).doc(driverId).get();
  if (!driver.exists) fail("NOT_FOUND");
  if (caller.role === "supplier" && driver.data()?.supplierId !== caller.id) fail("PERMISSION_DENIED");
  const decision = ctx.data.decision as string;
  const earnRef = db.collection(Col.DriverEarnings).doc(driverId);
  let payoutTransactionId: string | undefined;
  let netAmount: number | undefined;
  let recoveryAmount = 0;
  let tdsAmount = 0;
  let pendingDues = 0;
  let reservedForPayout = 0;

  await db.runTransaction(async (tx) => {
    const earn = await tx.get(earnRef);
    if (!earn.exists) fail("NOT_FOUND");
    const e = earn.data() as {
      payoutRequests?: Array<Record<string, unknown>>;
      pendingDues: number;
      reservedForPayout?: number;
      cashRecoverable?: number;
    };
    const reqs = e.payoutRequests ?? [];
    const idx = reqs.findIndex((r) => r.payoutRequestId === payoutRequestId);
    if (idx < 0) fail("NOT_FOUND");
    const req = reqs[idx];
    if (req.status !== "pending") fail("INVALID_STATE");
    const amount = Number(req.amount);
    pendingDues = e.pendingDues;
    reservedForPayout = Number(e.reservedForPayout ?? 0);
    if (decision === "reject") {
      requireNonEmpty(ctx.data.rejectionReason, "rejectionReason");
      reqs[idx] = {
        ...req,
        status: "rejected",
        rejectionReason: ctx.data.rejectionReason,
        reviewedBy: caller.id,
        reviewedAt: nowIso(),
      };
      pendingDues += amount;
      reservedForPayout -= amount;
      tx.update(earnRef, { payoutRequests: reqs, pendingDues, reservedForPayout });
      return;
    }
    const dest = req.destination as { maskedLabel?: string; beneficiaryId?: string };
    if (ctx.data.acknowledgedBeneficiaryLabel && ctx.data.acknowledgedBeneficiaryLabel !== dest.maskedLabel) {
      fail("STALE_APPROVAL_CONTEXT");
    }
    recoveryAmount = Number(e.cashRecoverable ?? 0);
    netAmount = amount - recoveryAmount - tdsAmount;
    if (netAmount <= 0) fail("INVALID_STATE", "net amount is not positive");
    payoutTransactionId = randomId("potx");
    reqs[idx] = {
      ...req,
      status: "approved",
      payoutTransactionId,
      reviewedBy: caller.id,
      reviewedAt: nowIso(),
      reviewNote: ctx.data.approvalNote ?? null,
    };
    tx.update(earnRef, { payoutRequests: reqs });
    tx.set(db.collection(Col.PayoutTransactions).doc(payoutTransactionId), {
      status: "approved",
      driverId,
      beneficiaryUserId: driverId,
      approvedBySupplierId: caller.role === "supplier" ? caller.id : driver.data()?.supplierId,
      grossAmount: amount,
      recoveryAmount,
      tdsAmount,
      netAmount,
      beneficiary: dest,
      approvedBy: caller.id,
      approvedByRole: caller.role,
      approvedAt: nowIso(),
      approvalNote: ctx.data.approvalNote ?? null,
      rail: dest ? "upi" : "imps",
      reconciliation: { status: "unreconciled" },
      createdAt: nowIso(),
    });
  });

  if (payoutTransactionId && !isEmulator()) {
    try {
      const queue = getFunctions().taskQueue("initiatePayoutTransfer");
      await queue.enqueue({ payoutTransactionId });
    } catch {
      // Queue may be unavailable on first deploy; scheduled drain retries.
    }
  }
  await notify({
    userId: driverId,
    category: "payout",
    title: decision === "approve" ? "Payout approved — sending" : "Payout rejected",
    body: decision === "approve" ? `Sending ₹${netAmount}` : String(ctx.data.rejectionReason),
  });
  return {
    success: true,
    status: decision === "approve" ? "approved" : "rejected",
    payoutTransactionId,
    netAmount,
    recoveryAmount,
    tdsAmount,
    pendingDues,
    reservedForPayout,
  };
}

export async function registerPayoutBeneficiary(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  if (!ctx.data.stepUpToken) fail("STEP_UP_REQUIRED");
  const type = requireNonEmpty(ctx.data.type, "type") as "upi" | "bank";
  let normalized = "";
  let maskedLabel = "";
  let accountNumberLast4: string | undefined;
  let vpaHandle: string | undefined;
  let encrypted = "";
  if (type === "upi") {
    const vpa = requireNonEmpty(ctx.data.vpa, "vpa");
    validateVpa(vpa);
    normalized = vpa.toLowerCase();
    vpaHandle = vpa.split("@")[1];
    maskedLabel = `${vpa.slice(0, 2)}***@${vpaHandle}`;
    encrypted = encryptSecret(vpa);
  } else {
    const accountNumber = requireNonEmpty(ctx.data.accountNumber, "accountNumber");
    const confirm = requireNonEmpty(ctx.data.accountNumberConfirm, "accountNumberConfirm");
    if (accountNumber !== confirm) fail("INVALID_ARGUMENT", "account numbers do not match");
    const ifsc = requireNonEmpty(ctx.data.ifsc, "ifsc");
    validateIfsc(ifsc);
    requireNonEmpty(ctx.data.accountHolderName, "accountHolderName");
    normalized = `${accountNumber}:${ifsc.toUpperCase()}`;
    accountNumberLast4 = accountNumber.slice(-4);
    maskedLabel = `****${accountNumberLast4} ${ifsc.toUpperCase()}`;
    encrypted = encryptSecret(accountNumber);
  }
  const fp = fingerprint(normalized, "beneficiary");
  const dup = await db.collection(Col.BeneficiaryAccounts).where("fingerprint", "==", fp).where("status", "==", "active").limit(1).get();
  const beneficiaryId = randomId("ben");
  const coolingPeriodEndsAt = addHours(nowIso(), BENEFICIARY_COOLING_HOURS);
  if (!dup.empty && dup.docs[0].data()?.ownerId !== caller.id) {
    await db.collection(Col.BeneficiaryAccounts).doc(beneficiaryId).set({
      ownerId: caller.id,
      type,
      fingerprint: fp,
      status: "pending_verification",
      verificationStatus: "pending_verification",
      duplicateOfBeneficiaryId: dup.docs[0].id,
      maskedLabel,
      createdAt: nowIso(),
    });
    fail("DUPLICATE_BENEFICIARY");
  }
  const prev = caller.activeBeneficiaryId;
  if (prev) {
    await db.collection(Col.BeneficiaryAccounts).doc(prev).update({
      status: "superseded",
      supersededByBeneficiaryId: beneficiaryId,
    });
  }
  await db.collection(Col.BeneficiaryAccounts).doc(beneficiaryId).set({
    ownerId: caller.id,
    type,
    fingerprint: fp,
    status: "active",
    verificationStatus: "verified",
    maskedLabel,
    accountNumberLast4: accountNumberLast4 ?? null,
    vpaHandle: vpaHandle ?? null,
    vpaEncrypted: type === "upi" ? encrypted : null,
    accountNumberEncrypted: type === "bank" ? encrypted : null,
    ifscEncrypted: type === "bank" ? encryptSecret(String(ctx.data.ifsc)) : null,
    coolingPeriodEndsAt,
    createdAt: nowIso(),
  });
  await db.collection(Col.UserProfiles).doc(caller.id).update({
    activeBeneficiaryId: beneficiaryId,
    payoutMethod: { type, maskedLabel },
  });
  await notify({
    userId: caller.id,
    category: "payout",
    title: "Payout destination updated",
    body: `New destination ${maskedLabel}. Cooling until ${coolingPeriodEndsAt}.`,
  });
  await appendAudit({
    category: "beneficiary",
    actorId: caller.id,
    subjectId: beneficiaryId,
    after: { maskedLabel },
    correlationId: ctx.correlationId,
  });
  return {
    success: true,
    beneficiaryId,
    maskedLabel,
    coolingPeriodEndsAt,
    verificationStatus: "verified",
  };
}

export async function blockPayoutBeneficiary(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const beneficiaryId = requireNonEmpty(ctx.data.beneficiaryId, "beneficiaryId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const ben = await db.collection(Col.BeneficiaryAccounts).doc(beneficiaryId).get();
  if (!ben.exists) fail("NOT_FOUND");
  const ownerId = String(ben.data()?.ownerId);
  const owner = await db.collection(Col.UserProfiles).doc(ownerId).get();
  if (caller.role === "supplier" && owner.data()?.supplierId !== caller.id) fail("PERMISSION_DENIED");
  await ben.ref.update({ status: "blocked", blockedReason: reason, blockedBy: caller.id, blockedAt: nowIso() });
  const approved = await db
    .collection(Col.PayoutTransactions)
    .where("beneficiaryUserId", "==", ownerId)
    .where("status", "==", "approved")
    .get();
  const batch = db.batch();
  for (const doc of approved.docs) {
    batch.update(doc.ref, { status: "cancelled", failureCategory: "beneficiary_blocked" });
    const amt = Number(doc.data().grossAmount ?? 0);
    batch.set(
      db.collection(Col.DriverEarnings).doc(ownerId),
      { reservedForPayout: FieldValue.increment(-amt), pendingDues: FieldValue.increment(amt) },
      { merge: true }
    );
  }
  await batch.commit();
  await notify({ userId: ownerId, category: "payout", title: "Payout destination blocked", body: reason });
  return { success: true, beneficiaryId, blockedCount: approved.size };
}

export async function initiatePayoutTransfer(data: { payoutTransactionId: string }) {
  const payoutTransactionId = data.payoutTransactionId;
  const snap = await db.collection(Col.PayoutTransactions).doc(payoutTransactionId).get();
  if (!snap.exists) fail("NOT_FOUND");
  const p = snap.data() as {
    status: string;
    netAmount: number;
    driverId: string;
    beneficiary?: { beneficiaryId?: string };
  };
  if (p.status !== "approved") fail("INVALID_STATE");
  const benId = p.beneficiary?.beneficiaryId;
  if (!benId) fail("BENEFICIARY_NOT_PAYABLE");
  const ben = await db.collection(Col.BeneficiaryAccounts).doc(benId).get();
  const b = ben.data() as {
    status: string;
    verificationStatus: string;
    coolingPeriodEndsAt?: string;
    type?: string;
    vpaEncrypted?: string;
    accountNumberEncrypted?: string;
    ifscEncrypted?: string;
    maskedLabel?: string;
  };
  if (
    !ben.exists ||
    b.status !== "active" ||
    b.verificationStatus !== "verified" ||
    (b.coolingPeriodEndsAt && new Date(b.coolingPeriodEndsAt) > new Date())
  ) {
    await snap.ref.update({ status: "cancelled", failureCategory: "beneficiary_blocked" });
    fail("BENEFICIARY_NOT_PAYABLE");
  }
  const rail = b.type === "upi" ? "upi" : rupeesToPaise(p.netAmount) <= IMPS_CEILING_PAISE ? "imps" : "neft";
  const result = await initiatePayoutOnRail({
    amountRupees: p.netAmount,
    idempotencyKey: `payout:${payoutTransactionId}`,
    vpa: b.vpaEncrypted ? decryptSecret(b.vpaEncrypted) : undefined,
    accountNumber: b.accountNumberEncrypted ? decryptSecret(b.accountNumberEncrypted) : undefined,
    ifsc: b.ifscEncrypted ? decryptSecret(b.ifscEncrypted) : undefined,
    name: String(b.maskedLabel ?? "driver"),
  });
  if (!result.accepted) {
    await snap.ref.update({ status: "failed", failureReason: result.reason, failedAt: nowIso() });
    await db.collection(Col.DriverEarnings).doc(p.driverId).set(
      { reservedForPayout: FieldValue.increment(-p.netAmount), pendingDues: FieldValue.increment(p.netAmount), duesRestoredAt: nowIso() },
      { merge: true }
    );
    return { success: false, status: "failed", payoutTransactionId };
  }
  await snap.ref.update({
    status: "initiated",
    rail,
    providerTransferId: result.providerTransferId,
    initiatedAt: nowIso(),
  });
  return { success: true, status: "initiated", payoutTransactionId, providerTransferId: result.providerTransferId };
}

export async function recordPayoutSettlement(ctx: CallContext) {
  const isWebhook = Boolean(ctx.rawBody);
  if (isWebhook) {
    const sig = String(ctx.headers["x-razorpay-signature"] ?? ctx.data.providerSignature ?? "");
    if (!verifyWebhookSignature(ctx.rawBody ?? Buffer.from(""), sig)) fail("INVALID_SIGNATURE");
  } else {
    await requireCaller(ctx, { roles: ["support"] });
  }
  const payoutTransactionId = requireNonEmpty(
    ctx.data.payoutTransactionId ?? ctx.data.providerTransferId,
    "payoutTransactionId"
  );
  const outcome = requireNonEmpty(ctx.data.outcome ?? ctx.data.eventType ?? "success", "outcome");
  const snap = await db.collection(Col.PayoutTransactions).doc(payoutTransactionId).get();
  if (!snap.exists) fail("NOT_FOUND");
  const p = snap.data() as {
    status: string;
    netAmount: number;
    driverId: string;
    rail?: string;
    gatewayEventIds?: string[];
    utrEnteredBy?: string;
  };
  const eventId = ctx.data.providerEventId as string | undefined;
  if (eventId && (p.gatewayEventIds ?? []).includes(eventId)) {
    return { success: true, applied: false, reason: "duplicate_event", status: p.status };
  }
  if (["completed", "failed", "reversed"].includes(p.status)) {
    return { success: true, applied: false, status: p.status };
  }
  if (outcome === "success" || outcome === "payout.processed") {
    const utr = requireNonEmpty(ctx.data.utr, "utr");
    if (!isWebhook && p.rail === "manual_bank_transfer") {
      await snap.ref.update({
        status: "processing",
        utr,
        utrSource: "manual_entry",
        utrEnteredBy: ctx.uid,
        updatedAt: nowIso(),
      });
      return { success: true, applied: true, status: "processing" };
    }
    await snap.ref.update({
      status: "completed",
      utr,
      utrSource: "provider",
      completedAt: nowIso(),
      gatewayEventIds: [...(p.gatewayEventIds ?? []), eventId].filter(Boolean),
    });
    await db.collection(Col.DriverEarnings).doc(p.driverId).set(
      {
        reservedForPayout: FieldValue.increment(-p.netAmount),
        lifetimePaidOut: FieldValue.increment(p.netAmount),
      },
      { merge: true }
    );
    await notify({ userId: p.driverId, category: "payout", title: "Payout completed", body: `UTR ${utr}` });
    return { success: true, applied: true, status: "completed" };
  }
  if (outcome === "failure" || outcome === "payout.rejected") {
    await snap.ref.update({
      status: "failed",
      failureCategory: ctx.data.failureCategory ?? "provider_rejected",
      failureReason: ctx.data.failureReason ?? null,
      failedAt: nowIso(),
    });
    await db.collection(Col.DriverEarnings).doc(p.driverId).set(
      {
        reservedForPayout: FieldValue.increment(-p.netAmount),
        pendingDues: FieldValue.increment(p.netAmount),
        duesRestoredAt: nowIso(),
      },
      { merge: true }
    );
    await notify({ userId: p.driverId, category: "payout", title: "Payout failed", body: String(ctx.data.failureReason ?? "") });
    return { success: true, applied: true, status: "failed" };
  }
  await snap.ref.update({ status: "reversed", reversalReference: ctx.data.reversalReference ?? null });
  await db.collection(Col.DriverEarnings).doc(p.driverId).set(
    {
      reservedForPayout: FieldValue.increment(-p.netAmount),
      pendingDues: FieldValue.increment(p.netAmount),
      duesRestoredAt: nowIso(),
    },
    { merge: true }
  );
  return { success: true, applied: true, status: "reversed" };
}

export async function verifyManualPayout(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support"] });
  const payoutTransactionId = requireNonEmpty(ctx.data.payoutTransactionId, "payoutTransactionId");
  requireNonEmpty(ctx.data.note, "note");
  const utr = requireNonEmpty(ctx.data.utr, "utr");
  const snap = await db.collection(Col.PayoutTransactions).doc(payoutTransactionId).get();
  if (!snap.exists) fail("NOT_FOUND");
  const p = snap.data() as {
    status: string;
    rail?: string;
    utrSource?: string;
    utr?: string;
    utrEnteredBy?: string;
    netAmount: number;
    driverId: string;
  };
  if (p.status !== "processing" || p.rail !== "manual_bank_transfer" || p.utrSource !== "manual_entry") {
    fail("INVALID_STATE");
  }
  if (caller.id === p.utrEnteredBy) fail("SEGREGATION_OF_DUTIES_VIOLATION");
  if (utr !== p.utr) fail("INVALID_ARGUMENT", "Re-entered UTR does not match");
  await snap.ref.update({
    status: "completed",
    verifiedBy: caller.id,
    verifiedAt: nowIso(),
  });
  await db.collection(Col.DriverEarnings).doc(p.driverId).set(
    { reservedForPayout: FieldValue.increment(-p.netAmount), lifetimePaidOut: FieldValue.increment(p.netAmount) },
    { merge: true }
  );
  await notify({ userId: p.driverId, category: "payout", title: "Payout verified", body: `UTR ${utr}` });
  return { success: true, status: "completed", payoutTransactionId };
}

export async function retryPayout(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const payoutTransactionId = requireNonEmpty(ctx.data.payoutTransactionId, "payoutTransactionId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const original = await db.collection(Col.PayoutTransactions).doc(payoutTransactionId).get();
  if (!original.exists) fail("NOT_FOUND");
  const p = original.data() as {
    status: string;
    driverId: string;
    grossAmount: number;
    netAmount: number;
    retryOfPayoutTransactionId?: string;
    retriedByPayoutTransactionId?: string;
  };
  if (p.status !== "failed") fail("INVALID_STATE");
  if (p.retriedByPayoutTransactionId) fail("INVALID_STATE");
  const driver = await db.collection(Col.UserProfiles).doc(p.driverId).get();
  if (caller.role === "supplier" && driver.data()?.supplierId !== caller.id) fail("PERMISSION_DENIED");
  const earn = await db.collection(Col.DriverEarnings).doc(p.driverId).get();
  if (Number(earn.data()?.cashInCustody ?? 0) > 0) fail("CASH_IN_CUSTODY_OUTSTANDING");
  if (Number(earn.data()?.pendingDues ?? 0) < p.grossAmount) fail("INSUFFICIENT_DUES");
  const newId = randomId("potx");
  await db.runTransaction(async (tx) => {
    tx.set(earn.ref, {
      pendingDues: FieldValue.increment(-p.grossAmount),
      reservedForPayout: FieldValue.increment(p.grossAmount),
    }, { merge: true });
    tx.set(db.collection(Col.PayoutTransactions).doc(newId), {
      status: "approved",
      driverId: p.driverId,
      beneficiaryUserId: p.driverId,
      grossAmount: p.grossAmount,
      netAmount: p.netAmount,
      retryOfPayoutTransactionId: payoutTransactionId,
      approvedBy: caller.id,
      approvedAt: nowIso(),
      reason,
      createdAt: nowIso(),
    });
    tx.update(original.ref, { retriedByPayoutTransactionId: newId });
  });
  return initiatePayoutTransfer({ payoutTransactionId: newId }).then((r) => ({
    success: true,
    payoutTransactionId: newId,
    status: r.status,
  }));
}

