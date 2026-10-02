import { createHash } from "node:crypto";
import { db } from "../admin";
import { Col } from "../collections";
import { fail } from "../errors";
import { nowIso } from "./time";

interface StoredResult<T> {
  key: string;
  scope: string;
  result: T;
  createdAt: string;
}

function refFor(key: string) {
  const id = createHash("sha256").update(key, "utf8").digest("hex");
  return db.collection(Col.IdempotencyKeys).doc(id);
}

export function requireIdempotencyKey(data: Record<string, unknown>): string {
  const key = data.idempotencyKey;
  if (typeof key !== "string" || key.trim().length < 8 || key.length > 200) {
    fail("INVALID_ARGUMENT", "idempotencyKey must contain 8 to 200 characters");
  }
  return key.trim();
}

export async function shortCircuit<T>(key: string, scope: string): Promise<T | null> {
  const snap = await refFor(key).get();
  if (!snap.exists) return null;
  const stored = snap.data() as StoredResult<T>;
  if (stored.key !== key || stored.scope !== scope) {
    fail("IDEMPOTENCY_CONFLICT", "The idempotency key was used for a different operation");
  }
  return stored.result;
}

export async function remember<T>(key: string, scope: string, result: T): Promise<T> {
  const ref = refFor(key);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const stored = snap.data() as StoredResult<T>;
      if (stored.key !== key || stored.scope !== scope) {
        fail("IDEMPOTENCY_CONFLICT", "The idempotency key was used for a different operation");
      }
      return stored.result;
    }
    tx.create(ref, { key, scope, result, createdAt: nowIso() });
    return result;
  });
}
