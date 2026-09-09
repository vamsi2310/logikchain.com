import { onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import type { Request } from "firebase-functions/v2/https";
import { contextFromCallable, verifyBearer, appCheckFromRequest, isAndroidAppCheck } from "../auth/caller";
import type { CallContext } from "../auth/caller";
import { handlers } from "../handlers/registry";
import { httpStatusForHttpsError, isHttpsError } from "../errors";
import { fail } from "../errors";
import { httpsOptions, shouldEnforceAppCheck, paymentSecrets, mapsSecrets, smsSecrets } from "../runtime";
import { matchRoute } from "./routes";

const WEBHOOK_OPS = new Set(["handleGatewayWebhook", "recordPayoutSettlement"]);
const PUBLIC_OPS = new Set(["listConfigurationCatalog"]);

function secretsFor(name: string) {
  if (["createPaymentIntent", "processPayment", "refundOrder", "handleGatewayWebhook", "recordPayoutSettlement", "initiatePayoutTransfer", "retryPayout"].includes(name)) {
    return paymentSecrets;
  }
  if (["resendHandoverCode", "initiateCreditRepayment", "completeAndFinalizeGig", "placeOrder", "placeMerchantOrder"].includes(name)) {
    return [...smsSecrets];
  }
  if (name === "computeRouteMetrics" || name === "getSystemHealth") return mapsSecrets;
  return undefined;
}

const ISOLATION = new Set([
  "handleGatewayWebhook",
  "recordPayoutSettlement",
  "initiatePayoutTransfer",
  "runReconciliation",
  "postDueCreditRelief",
  "closeAccountingPeriod",
  "reopenAccountingPeriod",
  "issueCreditNote",
  "getFinanceReport",
  "exportFinanceReport",
  "computeRouteMetrics",
]);

export function callable(operationId: string) {
  const handler = handlers[operationId];
  if (!handler) {
    throw new Error(`No handler registered for ${operationId}`);
  }
  return onCall(
    {
      ...httpsOptions({ isolation: ISOLATION.has(operationId), secrets: secretsFor(operationId) }),
      enforceAppCheck: !WEBHOOK_OPS.has(operationId) && shouldEnforceAppCheck(),
    },
    async (req) => {
      const ctx = contextFromCallable(req, operationId);
      return handler(ctx);
    }
  );
}

function applyCors(res: import("express").Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Idempotency-Key, X-Firebase-AppCheck, X-Firebase-AppId, X-Correlation-Id",
  );
  res.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
}

export async function dispatchHttp(req: Request, res: import("express").Response): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  const path = req.path.startsWith("/v1") ? req.path : `/v1${req.path === "/" ? "" : req.path}`;
  const matched = matchRoute(req.method, path);
  if (!matched) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Unknown route" } });
    return;
  }
  const { operationId, params } = matched;
  const handler = handlers[operationId];
  if (!handler) {
    res.status(501).json({ error: { code: "UNIMPLEMENTED", message: operationId } });
    return;
  }
  try {
    const app = appCheckFromRequest(req);
    if (!WEBHOOK_OPS.has(operationId) && shouldEnforceAppCheck() && !app.present && !PUBLIC_OPS.has(operationId)) {
      fail("UNAUTHENTICATED", "App Check token missing or invalid");
    }
    let uid: string | null = null;
    if (!WEBHOOK_OPS.has(operationId)) {
      try {
        uid = await verifyBearer(req);
      } catch {
        if (!PUBLIC_OPS.has(operationId)) fail("UNAUTHENTICATED");
      }
      if (!uid && !PUBLIC_OPS.has(operationId)) fail("UNAUTHENTICATED");
    }
    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
    const query = (req.query ?? {}) as Record<string, unknown>;
    const data = { ...query, ...body, ...params };
    if (operationId === "processPayment" && params.intentId && !data.paymentIntentId) {
      data.paymentIntentId = params.intentId;
    }
    if (operationId === "confirmCreditRepayment" && params.transferId) {
      data.custodyTransferId = params.transferId;
    }
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const ctx: CallContext = {
      uid,
      profile: null,
      appId: app.appId,
      isPlayIntegrity: isAndroidAppCheck(app.appId),
      correlationId: String(req.headers["x-correlation-id"] ?? `${operationId}:${Date.now()}`),
      operationId,
      data,
      rawBody,
      headers: req.headers as Record<string, string | string[] | undefined>,
    };
    const result = await handler(ctx);
    res.status(200).json(result);
  } catch (err) {
    if (isHttpsError(err)) {
      res.status(httpStatusForHttpsError(err)).json({
        error: {
          code: (err.details as { code?: string } | undefined)?.code ?? err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal error" } });
  }
}

export const api = onRequest(
  httpsOptions({ secrets: [...paymentSecrets, ...smsSecrets, ...mapsSecrets] }),
  dispatchHttp
);

export function scheduledJob(operationId: "postDueCreditRelief" | "runReconciliation", schedule: string) {
  return onSchedule(
    {
      region: "asia-south1",
      schedule,
      timeZone: "Asia/Kolkata",
      memory: "1GiB",
      minInstances: 0,
    },
    async () => {
      const handler = handlers[operationId];
      await handler({
        uid: null,
        profile: null,
        appId: null,
        isPlayIntegrity: false,
        correlationId: `sched:${operationId}:${Date.now()}`,
        operationId,
        data: {},
        headers: {},
      });
    }
  );
}

export function webhookHttps(operationId: "handleGatewayWebhook" | "recordPayoutSettlement") {
  const path =
    operationId === "handleGatewayWebhook" ? "/v1/webhooks/gateway" : "/v1/webhooks/payout-settlement";
  return onRequest(
    httpsOptions({ isolation: true, secrets: paymentSecrets }),
    async (req, res) => {
      Object.defineProperty(req, "path", { value: path, configurable: true });
      (req as { method: string }).method = "POST";
      await dispatchHttp(req, res);
    }
  );
}

export function payoutWorker() {
  return onTaskDispatched(
    {
      retryConfig: { maxAttempts: 5, minBackoffSeconds: 30 },
      rateLimits: { maxConcurrentDispatches: 5 },
      memory: "1GiB",
      region: "asia-south1",
    },
    async (req) => {
      const { payouts } = await import("../handlers/registry");
      await payouts.initiatePayoutTransfer(req.data as { payoutTransactionId: string });
    }
  );
}
