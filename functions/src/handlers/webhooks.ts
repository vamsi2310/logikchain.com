import { storage } from "../admin";
import type { CallContext } from "../auth/caller";
import { fail } from "../errors";
import { randomId } from "../lib/crypto";
import { verifyWebhookSignature } from "../lib/razorpay";
import { nowIso } from "../lib/time";
import { WEBHOOK_REPLAY_WINDOW_MS, gcpProject, isEmulator } from "../runtime";
import { applySuccessfulPayment } from "./payments";
import { recordPayoutSettlement } from "./payouts";

export async function handleGatewayWebhook(ctx: CallContext) {
  const raw = ctx.rawBody ?? Buffer.from(JSON.stringify(ctx.data));
  const signature = String(ctx.headers["x-razorpay-signature"] ?? "");
  if (!verifyWebhookSignature(raw, signature) && !isEmulator()) {
    fail("INVALID_SIGNATURE");
  }
  const payload = ctx.data as {
    event?: string;
    created_at?: number;
    payload?: {
      payment?: { entity?: Record<string, unknown> };
      refund?: { entity?: Record<string, unknown> };
      payout?: { entity?: Record<string, unknown> };
    };
  };
  const createdAt = Number(payload.created_at ?? 0) * 1000;
  if (createdAt && Date.now() - createdAt > WEBHOOK_REPLAY_WINDOW_MS) {
    return { applied: false, reason: "stale_event" };
  }
  const eventType = payload.event ?? "unhandled";
  const eventId = String((payload as { id?: string }).id ?? randomId("evt"));
  try {
    if (!isEmulator()) {
      const bucket = storage.bucket(`${gcpProject()}.appspot.com`);
      await bucket.file(`webhooks/${eventId}.json`).save(raw, { contentType: "application/json" });
    }
  } catch {
    // Evidence write must not block acknowledgement.
  }

  if (eventType.startsWith("payment.")) {
    const entity = payload.payload?.payment?.entity ?? {};
    const notes = (entity.notes ?? {}) as Record<string, string>;
    const paymentIntentId = notes.paymentIntentId ?? String(entity.notes ?? "");
    if (!paymentIntentId) {
      return { applied: false, reason: "missing_on_platform" };
    }
    if (eventType === "payment.captured" || eventType === "payment.authorized") {
      return applySuccessfulPayment({
        paymentIntentId,
        paymentTransactionId: notes.paymentTransactionId ?? String(entity.id),
        gatewayPaymentId: String(entity.id),
        eventId,
        amount: Number(entity.amount ?? 0) / 100,
      });
    }
    return { applied: false, reason: "unhandled_event" };
  }
  if (eventType.startsWith("payout.")) {
    const entity = payload.payload?.payout?.entity ?? {};
    ctx.data = {
      ...ctx.data,
      payoutTransactionId: String(entity.notes ? (entity.notes as { payoutTransactionId?: string }).payoutTransactionId : entity.id),
      providerTransferId: String(entity.id),
      outcome: eventType.includes("processed") || eventType.includes("processed") ? "success" : eventType.includes("rejected") ? "failure" : eventType,
      utr: entity.utr as string | undefined,
      providerEventId: eventId,
    };
    return recordPayoutSettlement(ctx);
  }
  return { applied: false, reason: "unhandled_event", receivedAt: nowIso() };
}
