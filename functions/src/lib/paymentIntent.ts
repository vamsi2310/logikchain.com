import { db } from "../admin";
import type { CallContext } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { appendAudit } from "./audit";
import { randomId } from "./crypto";
import { createGatewayOrder } from "./razorpay";
import { nowIso } from "./time";

export interface PaymentIntentInput {
  purpose: string;
  amount: number;
  payerId: string;
  supplierId?: string;
  orderId?: string;
  merchantOrderId?: string;
  subscriptionId?: string;
  duesTargeted?: string[];
}

interface IntentRecord extends PaymentIntentInput {
  status: string;
  gatewayOrderId: string;
  attemptCount?: number;
}

function targetKey(input: PaymentIntentInput): string {
  return (
    input.orderId ??
    input.merchantOrderId ??
    input.subscriptionId ??
    `${input.payerId}:${(input.duesTargeted ?? []).join(",")}:${input.amount}`
  );
}

function sameTarget(intent: IntentRecord, input: PaymentIntentInput): boolean {
  return (
    intent.purpose === input.purpose &&
    intent.amount === input.amount &&
    intent.payerId === input.payerId &&
    intent.orderId === input.orderId &&
    intent.merchantOrderId === input.merchantOrderId &&
    intent.subscriptionId === input.subscriptionId
  );
}

function response(
  paymentIntentId: string,
  paymentTransactionId: string,
  intent: IntentRecord,
  reused: boolean
) {
  return {
    success: true,
    paymentIntentId,
    paymentTransactionId,
    gatewayOrderId: intent.gatewayOrderId,
    amount: intent.amount,
    currency: "INR" as const,
    reused,
  };
}

export async function createPaymentIntentInternal(
  ctx: CallContext,
  input: PaymentIntentInput
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) fail("INVALID_AMOUNT");
  if (!input.payerId) fail("INVALID_ARGUMENT", "payerId is required");

  const open = await db
    .collection(Col.PaymentIntents)
    .where("payerId", "==", input.payerId)
    .limit(50)
    .get();
  const existing = open.docs.find((doc) => {
    const intent = doc.data() as IntentRecord;
    return ["created", "pending"].includes(intent.status) && sameTarget(intent, input);
  });

  if (existing) {
    const intent = existing.data() as IntentRecord;
    const attempts = await db
      .collection(Col.PaymentTransactions)
      .where("paymentIntentId", "==", existing.id)
      .get();
    const sorted = attempts.docs.sort(
      (a, b) =>
        new Date(String(b.data().createdAt ?? 0)).getTime() -
        new Date(String(a.data().createdAt ?? 0)).getTime()
    );
    const reusable = sorted.find((doc) =>
      ["initiated", "pending"].includes(String(doc.data().status))
    );
    if (reusable) return response(existing.id, reusable.id, intent, true);

    const paymentTransactionId = randomId("ptx");
    const createdAt = nowIso();
    await db.runTransaction(async (tx) => {
      tx.create(db.collection(Col.PaymentTransactions).doc(paymentTransactionId), {
        ...transactionData(existing.id, paymentTransactionId, input, intent.gatewayOrderId, createdAt),
      });
      tx.update(existing.ref, {
        attemptCount: Number(intent.attemptCount ?? sorted.length) + 1,
        latestPaymentTransactionId: paymentTransactionId,
        status: "pending",
        updatedAt: createdAt,
      });
    });
    return response(existing.id, paymentTransactionId, intent, true);
  }

  const paymentIntentId = randomId("pi");
  const paymentTransactionId = randomId("ptx");
  const receipt = `${input.purpose}:${targetKey(input)}:${paymentIntentId}`;
  const gateway = await createGatewayOrder({
    amountRupees: input.amount,
    receipt,
    notes: {
      paymentIntentId,
      purpose: input.purpose,
      correlationId: ctx.correlationId,
    },
  });
  const createdAt = nowIso();
  const intent: IntentRecord = {
    ...input,
    status: "created",
    gatewayOrderId: gateway.gatewayOrderId,
    attemptCount: 1,
  };
  await db.runTransaction(async (tx) => {
    tx.create(db.collection(Col.PaymentIntents).doc(paymentIntentId), {
      ...Object.fromEntries(
        Object.entries(intent).filter(([, value]) => value !== undefined)
      ),
      currency: "INR",
      gatewayKeyId: gateway.keyId,
      gatewayEventIds: [],
      latestPaymentTransactionId: paymentTransactionId,
      createdAt,
      updatedAt: createdAt,
    });
    tx.create(
      db.collection(Col.PaymentTransactions).doc(paymentTransactionId),
      transactionData(
        paymentIntentId,
        paymentTransactionId,
        input,
        gateway.gatewayOrderId,
        createdAt
      )
    );
  });
  await appendAudit({
    category: "payment",
    actorId: ctx.uid ?? input.payerId,
    subjectId: paymentIntentId,
    after: { purpose: input.purpose, amount: input.amount, target: targetKey(input) },
    correlationId: ctx.correlationId,
  });
  return response(paymentIntentId, paymentTransactionId, intent, false);
}

function transactionData(
  paymentIntentId: string,
  paymentTransactionId: string,
  input: PaymentIntentInput,
  gatewayOrderId: string,
  createdAt: string
) {
  const subLedger =
    input.purpose === "subscription"
      ? "subscription"
      : input.purpose === "merchant_credit_repayment"
        ? "credit"
        : "orders";
  return {
    paymentTransactionId,
    paymentIntentId,
    status: "initiated",
    subLedger,
    instrument: "razorpay",
    amount: input.amount,
    currency: "INR",
    payerId: input.payerId,
    payeeSupplierId: input.supplierId ?? null,
    orderId: input.orderId ?? null,
    merchantOrderId: input.merchantOrderId ?? null,
    subscriptionId: input.subscriptionId ?? null,
    duesTargeted: input.duesTargeted ?? [],
    gatewayOrderId,
    gatewayEventIds: [],
    refundedAmount: 0,
    idempotencyKey: `${input.purpose}:${targetKey(input)}:${paymentTransactionId}`,
    reconciliation: { status: "unreconciled" },
    statusEvents: [{ status: "initiated", at: createdAt }],
    createdAt,
    updatedAt: createdAt,
  };
}
