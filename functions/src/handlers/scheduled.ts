import { db } from "../admin";
import { Col } from "../collections";
import { randomId } from "../lib/crypto";
import { notify, notifyMany } from "../lib/notify";
import { nowIso } from "../lib/time";

export async function postDueCreditRelief() {
  const profiles = await db.collection(Col.CreditProfiles).limit(200).get();
  let profilesRelieved = 0;
  let amountRelieved = 0;
  const discrepanciesOpened: string[] = [];
  for (const doc of profiles.docs) {
    const c = doc.data() as {
      paymentsMade?: Array<Record<string, unknown>>;
      creditUsed: number;
      creditLimit: number;
      pendingRepayments?: number;
      supplierId?: string;
      provisionalCreditEnabled?: boolean;
      provisionalCreditCap?: number;
    };
    const due = (c.paymentsMade ?? []).filter(
      (p) => p.method === "cash_to_driver" && p.settled === false && p.reliefDueBy && new Date(String(p.reliefDueBy)) < new Date()
    );
    if (due.length === 0) continue;
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      const data = fresh.data() as typeof c;
      let creditUsed = data.creditUsed;
      let pendingRepayments = Number(data.pendingRepayments ?? 0);
      const paymentsMade = (data.paymentsMade ?? []).map((p) => {
        if (p.method === "cash_to_driver" && p.settled === false && p.reliefDueBy && new Date(String(p.reliefDueBy)) < new Date()) {
          const amt = Number(p.amount ?? 0);
          creditUsed = Math.max(0, creditUsed - amt);
          pendingRepayments = Math.max(0, pendingRepayments - amt);
          amountRelieved += amt;
          return { ...p, settled: true, settledAt: nowIso(), reliefReason: "relief_ceiling_elapsed" };
        }
        return p;
      });
      const provisionalCreditGranted = data.provisionalCreditEnabled
        ? Math.min(pendingRepayments, Number(data.provisionalCreditCap ?? 0))
        : 0;
      const txnId = randomId("ctxn");
      tx.update(doc.ref, {
        creditUsed,
        pendingRepayments,
        provisionalCreditGranted,
        creditAvailable: data.creditLimit - creditUsed + provisionalCreditGranted,
        paymentsMade,
        lastTransactionId: txnId,
        updatedAt: nowIso(),
      });
      tx.set(db.collection(Col.CreditTransactions).doc(txnId), {
        type: "repayment_cash_settled",
        amount: due.reduce((s, p) => s + Number(p.amount ?? 0), 0),
        reason: "relief_ceiling_elapsed",
        actorId: "system",
        actorKind: "system",
        merchantId: doc.id,
        recordedAt: nowIso(),
      });
    });
    const discrepancyId = randomId("cdp");
    const holderId = String(due[0].custodyTransferId ?? "unknown");
    await db.collection(Col.CashDiscrepancies).doc(discrepancyId).set({
      kind: "unsettled_repayment",
      amount: due.reduce((s, p) => s + Number(p.amount ?? 0), 0),
      status: "open",
      merchantId: doc.id,
      supplierId: c.supplierId ?? null,
      againstPartyId: holderId,
      createdAt: nowIso(),
    });
    discrepanciesOpened.push(discrepancyId);
    profilesRelieved += 1;
    await notify({
      userId: doc.id,
      category: "credit",
      title: "Credit restored",
      body: "Relief ceiling elapsed; your line is restored.",
    });
    if (c.supplierId) {
      await notifyMany([c.supplierId], {
        category: "cash_custody",
        title: "Unsettled repayment claim opened",
        body: discrepancyId,
      });
    }
  }
  return { profilesRelieved, amountRelieved, discrepanciesOpened };
}
