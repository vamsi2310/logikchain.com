import type { DocumentReference } from "firebase-admin/firestore";
import { db } from "../admin";
import type { CallContext } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { hashWithSalt, safeEqual } from "./crypto";
import { nowIso } from "./time";
import { requireNonEmpty } from "./validate";

export type VerificationMethod =
  | "otp"
  | "offline_code"
  | "photo"
  | "gallery"
  | "counter_signature"
  | "support_override"
  | "code";

export interface VerificationInput {
  method: VerificationMethod;
  photoUrl?: string;
  confirmationCode?: string;
  codeBatchId?: string;
  codeCounter?: number;
  witnessName?: string;
  witnessPhoneTail?: string;
  fallbackAuthorizationId?: string;
  fallbackReason?: string;
  capturedAt: string;
}

interface VerifyParams {
  ctx: CallContext;
  proof: VerificationInput;
  kind: "order_handover" | "bulk_order_handover" | "credit_repayment" | "cash_settlement";
  callerId: string;
  counterpartyId: string;
  counterpartyPhone?: string;
  privateRef: DocumentReference;
  target: Record<string, string>;
}

function baseRecord(params: VerifyParams, method: VerificationMethod, strength: "strong" | "weak") {
  const capturedAt = requireNonEmpty(params.proof?.capturedAt, "proof.capturedAt");
  if (Number.isNaN(new Date(capturedAt).getTime())) {
    fail("INVALID_ARGUMENT", "proof.capturedAt is invalid");
  }
  return {
    method,
    strength,
    capturedAt,
    capturedBy: params.callerId,
    verifiedAt: nowIso(),
  };
}

export async function verifyCustody(params: VerifyParams) {
  if (!params.proof || typeof params.proof !== "object") {
    fail("INVALID_ARGUMENT", "proof is required");
  }
  const requestedMethod = params.proof.method;
  const method = requestedMethod === "code" ? "otp" : requestedMethod;
  if (
    !["otp", "offline_code", "photo", "gallery", "counter_signature", "support_override"].includes(
      method
    )
  ) {
    fail("INVALID_ARGUMENT", "Unsupported verification method");
  }

  if (params.callerId === params.counterpartyId) {
    if (method === "counter_signature") {
      fail("INVALID_ARGUMENT", "A counterparty cannot witness their own signature");
    }
    return baseRecord(params, "otp", "strong");
  }

  if (method === "otp") {
    const code = requireNonEmpty(params.proof.confirmationCode, "proof.confirmationCode");
    const failedAttempts = await db.runTransaction(async (tx) => {
      const snap = await tx.get(params.privateRef);
      if (!snap.exists) fail("NOT_FOUND", "Verification code not found");
      const record = snap.data() as { code?: string; failedAttempts?: number; expiresAt?: string };
      const attempts = Number(record.failedAttempts ?? 0);
      if (attempts >= 5) fail("CODE_ATTEMPTS_EXCEEDED");
      if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) fail("CODE_EXPIRED");
      if (!record.code || !safeEqual(record.code, code)) {
        const nextAttempts = attempts + 1;
        tx.update(params.privateRef, { failedAttempts: nextAttempts });
        return nextAttempts;
      }
      return null;
    });
    if (failedAttempts !== null) {
      if (failedAttempts >= 5) fail("CODE_ATTEMPTS_EXCEEDED");
      fail("CODE_INVALID");
    }
    return {
      ...baseRecord(params, "otp", "strong"),
      confirmationCode: `****${code.slice(-2)}`,
    };
  }

  if (method === "offline_code") {
    const batchId = requireNonEmpty(params.proof.codeBatchId, "proof.codeBatchId");
    const code = requireNonEmpty(params.proof.confirmationCode, "proof.confirmationCode");
    const counter = params.proof.codeCounter;
    if (!Number.isInteger(counter) || Number(counter) < 0) {
      fail("INVALID_ARGUMENT", "proof.codeCounter is invalid");
    }
    const ref = db.collection(Col.VerificationCodeBatches).doc(batchId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail("NOT_FOUND", "Verification code batch not found");
      const batch = snap.data() as {
        ownerId?: string;
        purpose?: string;
        status?: string;
        expiresAt?: string;
        usedCounters?: number[];
        codeHashes?: string[];
        salt?: string;
      };
      if (batch.ownerId !== params.counterpartyId || batch.purpose !== params.kind) {
        fail("PERMISSION_DENIED");
      }
      if (batch.status !== "active") fail("INVALID_STATE");
      if (!batch.expiresAt || new Date(batch.expiresAt).getTime() < Date.now()) fail("CODE_EXPIRED");
      if ((batch.usedCounters ?? []).includes(Number(counter))) fail("CODE_REPLAYED");
      const expected = batch.codeHashes?.[Number(counter)];
      if (!expected || !batch.salt || !safeEqual(expected, hashWithSalt(code, batch.salt))) {
        fail("CODE_INVALID");
      }
      tx.update(ref, { usedCounters: [...(batch.usedCounters ?? []), Number(counter)] });
    });
    return {
      ...baseRecord(params, "offline_code", "strong"),
      confirmationCode: `****${code.slice(-2)}`,
      codeBatchId: batchId,
      codeCounter: Number(counter),
    };
  }

  const fallbackReason = requireNonEmpty(params.proof.fallbackReason, "proof.fallbackReason");
  if (method === "photo" || method === "gallery") {
    const photoUrl = requireNonEmpty(params.proof.photoUrl, "proof.photoUrl");
    const plainPath = `/proofs/${params.callerId}/`;
    const encodedPath = `proofs%2F${encodeURIComponent(params.callerId)}%2F`;
    if (!photoUrl.includes(plainPath) && !photoUrl.includes(encodedPath)) {
      fail("INVALID_ARGUMENT", "photoUrl is outside the caller proof path");
    }
    return { ...baseRecord(params, method, "weak"), photoUrl, fallbackReason };
  }

  if (method === "counter_signature") {
    const witnessName = requireNonEmpty(params.proof.witnessName, "proof.witnessName");
    const witnessPhoneTail = requireNonEmpty(
      params.proof.witnessPhoneTail,
      "proof.witnessPhoneTail"
    );
    const actualTail = (params.counterpartyPhone ?? "").replace(/\D/g, "").slice(-4);
    if (!/^[0-9]{4}$/.test(witnessPhoneTail) || witnessPhoneTail !== actualTail) {
      fail("INVALID_ARGUMENT", "Witness phone tail does not match");
    }
    return {
      ...baseRecord(params, method, "weak"),
      witnessName,
      witnessPhoneTail,
      fallbackReason,
    };
  }

  const authorizationId = requireNonEmpty(
    params.proof.fallbackAuthorizationId,
    "proof.fallbackAuthorizationId"
  );
  const ref = db.collection(Col.VerificationFallbackAuthorizations).doc(authorizationId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("FALLBACK_NOT_AUTHORIZED");
    const authorization = snap.data() as Record<string, unknown>;
    if (
      authorization.status !== "active" ||
      authorization.grantedTo !== params.callerId ||
      authorization.transferKind !== params.kind
    ) {
      fail("FALLBACK_NOT_AUTHORIZED");
    }
    if (
      typeof authorization.expiresAt !== "string" ||
      new Date(authorization.expiresAt).getTime() < Date.now()
    ) {
      fail("FALLBACK_EXPIRED");
    }
    for (const [key, value] of Object.entries(params.target)) {
      if (authorization[key] !== value) fail("FALLBACK_NOT_AUTHORIZED");
    }
    tx.update(ref, {
      status: "consumed",
      consumedBy: params.callerId,
      consumedByOperation: params.ctx.correlationId,
      consumedAt: nowIso(),
    });
  });
  return {
    ...baseRecord(params, "support_override", "weak"),
    fallbackAuthorizationId: authorizationId,
    fallbackReason,
  };
}

export function settlementLabel(source: string): string {
  switch (source) {
    case "buyer_cod":
      return "Buyer cash orders";
    case "merchant_credit_repayment":
      return "Merchant repayments";
    case "merchant_bulk_cash":
      return "Merchant bulk cash";
    default:
      return "Adjustments";
  }
}

export function holderRoleLabel(role: string): string {
  return role === "merchant" ? "With merchants" : "With drivers";
}
