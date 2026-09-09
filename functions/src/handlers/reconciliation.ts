import { db } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { randomId } from "../lib/crypto";
import { notify } from "../lib/notify";
import { nowIso, periodIdFor } from "../lib/time";
import { requireNonEmpty } from "../lib/validate";
import { WRITE_OFF_CEILING_PAISE } from "../runtime";
import { rupeesToPaise } from "../lib/money";

export async function runReconciliation(ctx: CallContext) {
  if (ctx.uid) await requireCaller(ctx, { roles: ["support"] });
  const date = String(ctx.data.date ?? nowIso().slice(0, 10));
  const scope = String(ctx.data.scope ?? "platform");
  const existing = await db
    .collection(Col.ReconciliationRuns)
    .where("date", "==", date)
    .where("scope", "==", scope)
    .where("status", "==", "running")
    .limit(1)
    .get();
  if (!existing.empty) fail("INVALID_STATE", "A run for this date is already in progress");
  const runId = randomId("rr");
  await db.collection(Col.ReconciliationRuns).doc(runId).set({
    status: "running",
    date,
    scope,
    startedAt: nowIso(),
    startedBy: ctx.uid ?? "scheduler",
  });
  const payments = await db.collection(Col.PaymentTransactions).where("reconciliation.status", "==", "unreconciled").limit(200).get();
  const payouts = await db.collection(Col.PayoutTransactions).where("reconciliation.status", "==", "unreconciled").limit(200).get();
  let exceptions = 0;
  for (const doc of [...payments.docs, ...payouts.docs]) {
    if (!doc.data().gatewayPaymentId && !doc.data().providerTransferId && !doc.data().utr) {
      const exceptionId = randomId("rex");
      await db.collection(Col.ReconciliationExceptions).doc(exceptionId).set({
        runId,
        kind: "stale_pending",
        status: "open",
        recordId: doc.id,
        amount: doc.data().amount ?? doc.data().netAmount ?? 0,
        createdAt: nowIso(),
      });
      exceptions += 1;
    }
  }
  await db.collection(Col.ReconciliationRuns).doc(runId).update({
    status: "completed",
    completedAt: nowIso(),
    matched: payments.size + payouts.size - exceptions,
    unmatched: exceptions,
  });
  if (exceptions > 0 && ctx.uid) {
    await notify({
      userId: ctx.uid,
      category: "finance",
      title: "Reconciliation exceptions",
      body: `${exceptions} open breaks on ${date}`,
    });
  }
  return { success: true, runId, exceptionCount: exceptions };
}

export async function resolveReconciliationException(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support"] });
  const exceptionId = requireNonEmpty(ctx.data.exceptionId, "exceptionId");
  const resolution = requireNonEmpty(ctx.data.resolution, "resolution");
  const resolutionNote = requireNonEmpty(ctx.data.resolutionNote, "resolutionNote");
  const snap = await db.collection(Col.ReconciliationExceptions).doc(exceptionId).get();
  if (!snap.exists) fail("NOT_FOUND");
  if (["resolved", "written_off"].includes(String(snap.data()?.status))) fail("INVALID_STATE");
  if (resolution === "written_off") {
    const amount = Number(snap.data()?.amount ?? 0);
    if (rupeesToPaise(amount) > WRITE_OFF_CEILING_PAISE && !ctx.data.secondApproverId) {
      fail("PERMISSION_DENIED", "Write-off exceeds per-actor ceiling");
    }
  }
  const status = resolution === "written_off" ? "written_off" : resolution === "no_action_required" ? "escalated" : "resolved";
  await snap.ref.update({
    status,
    resolution,
    resolutionNote,
    resolvedBy: caller.id,
    resolvedAt: nowIso(),
  });
  return { success: true, exceptionId, status };
}

export async function closeAccountingPeriod(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support"] });
  const periodId = (ctx.data.periodId as string) || periodIdFor();
  const ref = db.collection(Col.AccountingPeriods).doc(periodId);
  const snap = await ref.get();
  const status = snap.data()?.status ?? "open";
  if (!["open", "reopened"].includes(status)) fail("INVALID_STATE");
  await ref.set({ status: "closing", periodId }, { merge: true });
  const open = await db
    .collection(Col.ReconciliationExceptions)
    .where("status", "in", ["open", "investigating", "escalated"])
    .limit(20)
    .get();
  const acknowledged = new Set((ctx.data.acknowledgedExceptionIds as string[]) ?? []);
  const unnamed = open.docs.filter((d) => !acknowledged.has(d.id)).map((d) => d.id);
  if (unnamed.length) fail("UNACKNOWLEDGED_EXCEPTIONS", "Open breaks exist", { ids: unnamed });
  const cash = await db.collection(Col.CashLedgerEntries).where("status", "==", "in_custody").limit(1).get();
  if (!cash.empty) fail("INVALID_STATE", "Cash still in custody");
  const pack = { closedAt: nowIso(), closedBy: caller.id, acknowledged: [...acknowledged] };
  await ref.set({
    status: "closed",
    closedBy: caller.id,
    closedAt: nowIso(),
    pack,
    packHash: randomId("hash"),
  }, { merge: true });
  return { success: true, periodId, status: "closed" };
}

export async function reopenAccountingPeriod(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support"] });
  const periodId = requireNonEmpty(ctx.data.periodId, "periodId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const ref = db.collection(Col.AccountingPeriods).doc(periodId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.status !== "closed") fail("INVALID_STATE");
  await ref.update({
    status: "reopened",
    reopenHistory: [...((snap.data()?.reopenHistory as unknown[]) ?? []), {
      by: caller.id,
      reason,
      at: nowIso(),
    }],
  });
  return { success: true, periodId, status: "reopened" };
}
