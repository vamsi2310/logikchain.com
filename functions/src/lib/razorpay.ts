import { createHmac } from "node:crypto";
import { fail } from "../errors";
import {
  razorpayKeyId,
  razorpayKeySecret,
  razorpayWebhookSecret,
} from "../runtime";
import { safeEqual } from "./crypto";
import { rupeesToPaise } from "./money";

function secretValue(name: string, parameter: { value(): string }): string {
  return process.env[name] || parameter.value();
}

function basicAuth(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`, "utf8").toString("base64")}`;
}

async function razorpayRequest<T>(
  path: string,
  init: RequestInit,
  credentials?: { keyId: string; keySecret: string }
): Promise<T> {
  const keyId = credentials?.keyId ?? secretValue("RAZORPAY_KEY_ID", razorpayKeyId);
  const keySecret =
    credentials?.keySecret ?? secretValue("RAZORPAY_KEY_SECRET", razorpayKeySecret);
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      authorization: basicAuth(keyId, keySecret),
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { description?: string };
  };
  if (!response.ok) {
    fail("TRANSACTION_FAILED", payload.error?.description ?? "Payment rail rejected the request");
  }
  return payload;
}

export async function createGatewayOrder(input: {
  amountRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ gatewayOrderId: string; keyId: string }> {
  const keyId = secretValue("RAZORPAY_KEY_ID", razorpayKeyId);
  const payload = await razorpayRequest<{ id: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: rupeesToPaise(input.amountRupees),
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes ?? {},
    }),
  });
  return { gatewayOrderId: payload.id, keyId };
}

export function verifyPaymentSignature(
  gatewayOrderId: string,
  gatewayPaymentId: string,
  signature: string
): boolean {
  const secret = secretValue("RAZORPAY_KEY_SECRET", razorpayKeySecret);
  const expected = createHmac("sha256", secret)
    .update(`${gatewayOrderId}|${gatewayPaymentId}`, "utf8")
    .digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  rail: "payment" | "payout" = "payment"
): boolean {
  const secret =
    rail === "payout"
      ? process.env.PAYOUT_WEBHOOK_SECRET
      : secretValue("RAZORPAY_WEBHOOK_SECRET", razorpayWebhookSecret);
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export async function createGatewayRefund(input: {
  gatewayPaymentId: string;
  amountRupees: number;
  idempotencyKey: string;
}): Promise<{ gatewayRefundId: string }> {
  const payload = await razorpayRequest<{ id: string }>(
    `/payments/${encodeURIComponent(input.gatewayPaymentId)}/refund`,
    {
      method: "POST",
      headers: { "x-payout-idempotency": input.idempotencyKey },
      body: JSON.stringify({ amount: rupeesToPaise(input.amountRupees) }),
    }
  );
  return { gatewayRefundId: payload.id };
}

export async function initiatePayoutOnRail(input: {
  amountRupees: number;
  idempotencyKey: string;
  mode: "upi" | "imps" | "neft";
  vpa?: string;
  accountNumber?: string;
  ifsc?: string;
  name: string;
}): Promise<{ accepted: boolean; providerTransferId?: string; reason?: string }> {
  const keyId = process.env.PAYOUT_API_KEY_ID;
  const keySecret = process.env.PAYOUT_API_KEY_SECRET;
  const accountNumber = process.env.PAYOUT_ACCOUNT_NUMBER;
  if (!keyId || !keySecret || !accountNumber) {
    return { accepted: false, reason: "Payout rail is not configured" };
  }
  try {
    const fundAccount = input.vpa
      ? { account_type: "vpa", vpa: { address: input.vpa } }
      : {
          account_type: "bank_account",
          bank_account: {
            name: input.name,
            ifsc: input.ifsc,
            account_number: input.accountNumber,
          },
        };
    const payload = await razorpayRequest<{ id: string }>(
      "/payouts",
      {
        method: "POST",
        headers: { "x-payout-idempotency": input.idempotencyKey },
        body: JSON.stringify({
          account_number: accountNumber,
          fund_account: fundAccount,
          amount: rupeesToPaise(input.amountRupees),
          currency: "INR",
          mode: input.mode.toUpperCase(),
          purpose: "payout",
          queue_if_low_balance: true,
          reference_id: input.idempotencyKey,
        }),
      },
      { keyId, keySecret }
    );
    return { accepted: true, providerTransferId: payload.id };
  } catch (error) {
    return {
      accepted: false,
      reason: error instanceof Error ? error.message : "Payout rail rejected the request",
    };
  }
}
