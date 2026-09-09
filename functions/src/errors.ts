import { HttpsError } from "firebase-functions/v2/https";

/**
 * Spec error codes mapped onto Functions HttpsError codes.
 * The spec code is always present in `details.code` for clients.
 */
export type SpecErrorCode =
  | "PERMISSION_DENIED"
  | "UNAUTHENTICATED"
  | "USER_SUSPENDED"
  | "CLIENT_NOT_OFFICIAL"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "INVALID_ARGUMENT"
  | "INVALID_STATE"
  | "INVALID_GIG_STATE"
  | "INVALID_PHONE"
  | "INVALID_AMOUNT"
  | "INVALID_DISCOUNT"
  | "INVALID_INDEX"
  | "INVALID_DATE_RANGE"
  | "INVALID_SIGNATURE"
  | "INVALID_ENTITLEMENT"
  | "ORDER_UNALTERABLE"
  | "NOT_SERVICEABLE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_CREDIT"
  | "INSUFFICIENT_DUES"
  | "DRIVER_NOT_AVAILABLE"
  | "PENDING_DELIVERIES"
  | "ALREADY_COMPLETED"
  | "PLAN_LIMIT_EXCEEDED"
  | "PLAN_FEATURE_REQUIRED"
  | "PLAN_ROLE_MISMATCH"
  | "SUBSCRIPTION_REQUIRED"
  | "ENTITLEMENT_LIMIT_EXCEEDED"
  | "BASELINE_ENTITLEMENT_REQUIRED"
  | "TAX_PROFILE_MISSING"
  | "PERIOD_LOCKED"
  | "CODE_INVALID"
  | "CODE_EXPIRED"
  | "CODE_REPLAYED"
  | "CODE_ATTEMPTS_EXCEEDED"
  | "FALLBACK_NOT_AUTHORIZED"
  | "FALLBACK_EXPIRED"
  | "AMOUNT_MISMATCH"
  | "IDEMPOTENCY_CONFLICT"
  | "DUPLICATE_PENDING_REQUEST"
  | "DUPLICATE_PROVIDER_REFERENCE"
  | "DUPLICATE_WEBHOOK_EVENT"
  | "DUPLICATE_BENEFICIARY"
  | "TRANSACTION_FAILED"
  | "APPROVAL_REQUIRED"
  | "ACKNOWLEDGEMENT_MISMATCH"
  | "CUSTODY_TRANSFER_EXPIRED"
  | "SETTLEMENT_ALREADY_CONFIRMED"
  | "CASH_IN_CUSTODY_OUTSTANDING"
  | "VERIFICATION_REQUIRED"
  | "BENEFICIARY_NOT_PAYABLE"
  | "BENEFICIARY_VERIFICATION_FAILED"
  | "BENEFICIARY_NAME_MISMATCH"
  | "STEP_UP_REQUIRED"
  | "RATE_LIMITED"
  | "RESEND_LIMIT_EXCEEDED"
  | "RETRY_LIMIT_EXCEEDED"
  | "SEGREGATION_OF_DUTIES_VIOLATION"
  | "STALE_APPROVAL_CONTEXT"
  | "PAN_REQUIRED"
  | "LEDGER_IMBALANCE"
  | "RAIL_UNAVAILABLE"
  | "IN_USE"
  | "UNAVAILABLE"
  | "UNACKNOWLEDGED_EXCEPTIONS"
  | "EFFECTIVE_WINDOW_OVERLAP"
  | "ADVISER_CONFIRMATION_REQUIRED"
  | "INTERNAL";

const HTTP_STATUS: Record<string, number> = {
  "unauthenticated": 401,
  "permission-denied": 403,
  "not-found": 404,
  "already-exists": 409,
  "failed-precondition": 409,
  "aborted": 409,
  "invalid-argument": 400,
  "resource-exhausted": 429,
  "unavailable": 503,
  "internal": 500,
};

type HttpsCode =
  | "unauthenticated"
  | "permission-denied"
  | "not-found"
  | "already-exists"
  | "invalid-argument"
  | "resource-exhausted"
  | "unavailable"
  | "internal"
  | "failed-precondition";

function httpsCode(spec: SpecErrorCode): HttpsCode {
  switch (spec) {
    case "UNAUTHENTICATED":
      return "unauthenticated";
    case "PERMISSION_DENIED":
    case "USER_SUSPENDED":
    case "CLIENT_NOT_OFFICIAL":
    case "SEGREGATION_OF_DUTIES_VIOLATION":
      return "permission-denied";
    case "NOT_FOUND":
      return "not-found";
    case "ALREADY_EXISTS":
    case "DUPLICATE_PENDING_REQUEST":
    case "DUPLICATE_BENEFICIARY":
      return "already-exists";
    case "INVALID_ARGUMENT":
    case "INVALID_PHONE":
    case "INVALID_AMOUNT":
    case "INVALID_DISCOUNT":
    case "INVALID_INDEX":
    case "INVALID_DATE_RANGE":
    case "INVALID_ENTITLEMENT":
      return "invalid-argument";
    case "RATE_LIMITED":
    case "RESEND_LIMIT_EXCEEDED":
    case "RETRY_LIMIT_EXCEEDED":
    case "ENTITLEMENT_LIMIT_EXCEEDED":
      return "resource-exhausted";
    case "UNAVAILABLE":
    case "RAIL_UNAVAILABLE":
      return "unavailable";
    case "INTERNAL":
      return "internal";
    default:
      return "failed-precondition";
  }
}

export function fail(
  code: SpecErrorCode,
  message?: string,
  extras?: Record<string, unknown>
): never {
  throw new HttpsError(httpsCode(code), message ?? code, {
    code,
    ...extras,
  });
}

export function httpStatusForHttpsError(err: HttpsError): number {
  return HTTP_STATUS[err.code] ?? 400;
}

export function isHttpsError(err: unknown): err is HttpsError {
  return err instanceof HttpsError;
}
