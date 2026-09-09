import { defineSecret } from "firebase-functions/params";
import type { HttpsOptions } from "firebase-functions/v2/https";

/** Region and scale are not per-function choices (API spec §0A). */
export const FUNCTIONS_REGION = "asia-south1";
export const AUTH_ID_TOKEN_TTL_SECONDS = Number(
  process.env.AUTH_ID_TOKEN_TTL_SECONDS ?? 3600
);
export const PENDING_REPAYMENT_RELIEF_CEILING_HOURS = Number(
  process.env.PENDING_REPAYMENT_RELIEF_CEILING_HOURS ?? 48
);
export const BENEFICIARY_COOLING_HOURS = Number(
  process.env.BENEFICIARY_COOLING_HOURS ?? 24
);
export const REFUND_DUAL_APPROVAL_THRESHOLD_PAISE = Number(
  process.env.REFUND_DUAL_APPROVAL_THRESHOLD_PAISE ?? 500000
);
export const WRITE_OFF_CEILING_PAISE = Number(
  process.env.WRITE_OFF_CEILING_PAISE ?? 1000000
);
export const PAYOUT_PER_REQUEST_CEILING_PAISE = Number(
  process.env.PAYOUT_PER_REQUEST_CEILING_PAISE ?? 5000000
);
export const IMPS_CEILING_PAISE = Number(process.env.IMPS_CEILING_PAISE ?? 50000000);
export const WEBHOOK_REPLAY_WINDOW_MS = Number(
  process.env.WEBHOOK_REPLAY_WINDOW_MS ?? 15 * 60 * 1000
);

export const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
export const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");
export const razorpayWebhookSecret = defineSecret("RAZORPAY_WEBHOOK_SECRET");
export const smsGatewayApiKey = defineSecret("SMS_GATEWAY_API_KEY");
export const googleMapsServerKey = defineSecret("GOOGLE_MAPS_API_KEY");

export const paymentSecrets = [razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret];
export const smsSecrets = [smsGatewayApiKey];
export const mapsSecrets = [googleMapsServerKey];

export function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

export function gcpProject(): string {
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!project) {
    throw new Error("GCLOUD_PROJECT is not set");
  }
  return project;
}

export function aliasFromProject(): "emulator" | "dev" | "test" | "prod" {
  if (isEmulator()) return "emulator";
  const project = process.env.GCLOUD_PROJECT || "";
  if (project.endsWith("-dev")) return "dev";
  if (project.endsWith("-test")) return "test";
  if (project.endsWith("-prod")) return "prod";
  return "dev";
}

const isolationMemory = "1GiB";
const standardMemory = "512MiB";

export function httpsOptions(opts?: {
  isolation?: boolean;
  secrets?: ReturnType<typeof defineSecret>[];
  invoker?: "public" | "private";
}): HttpsOptions {
  const options: HttpsOptions = {
    region: FUNCTIONS_REGION,
    minInstances: 0,
    concurrency: 40,
    memory: opts?.isolation ? isolationMemory : standardMemory,
    cpu: 1,
    invoker: opts?.invoker ?? "public",
  };
  if (opts?.secrets && opts.secrets.length > 0) {
    options.secrets = opts.secrets;
  }
  return options;
}

export const VEHICLE_OFFICIAL_CLIENT_OPS = new Set([
  "startGig",
  "updateGigLocation",
  "completeAndFinalizeGig",
  "markOrderDelivered",
  "updateMerchantOrderStatus",
  "initiateCreditRepayment",
  "confirmCreditRepayment",
  "declareCashHandover",
  "confirmCashSettlement",
  "acknowledgeGig",
  "requestVerificationFallback",
]);

export const CUSTODY_CARVE_OUT_OPS = new Set([
  "declareCashHandover",
  "confirmCashSettlement",
  "getCashCustodySummary",
  "raiseCashDiscrepancy",
]);

export const SUPPORTED_LOCALES = [
  "en-IN",
  "hi-IN",
  "te-IN",
  "ta-IN",
  "kn-IN",
  "mr-IN",
] as const;
