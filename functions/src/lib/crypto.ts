import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export function randomId(prefix?: string): string {
  const id = randomBytes(16).toString("hex");
  return prefix ? `${prefix}_${id}` : id;
}

export function randomDigits(length: number): string {
  if (!Number.isInteger(length) || length < 1 || length > 32) {
    throw new RangeError("length must be an integer between 1 and 32");
  }
  let result = "";
  for (let i = 0; i < length; i += 1) result += randomInt(0, 10);
  return result;
}

export function hashWithSalt(value: string, salt: string): string {
  const pepper = process.env.HANDOVER_CODE_HASH_PEPPER;
  if (!pepper) throw new Error("HANDOVER_CODE_HASH_PEPPER is not configured");
  return createHmac("sha256", pepper)
    .update(salt, "utf8")
    .update("\0")
    .update(value, "utf8")
    .digest("hex");
}

export function fingerprint(value: string, namespace = "default"): string {
  const key =
    process.env.BENEFICIARY_FINGERPRINT_SALT ?? process.env.FINGERPRINT_KEY;
  if (!key) throw new Error("BENEFICIARY_FINGERPRINT_SALT is not configured");
  return createHmac("sha256", key)
    .update(namespace, "utf8")
    .update("\0")
    .update(value, "utf8")
    .digest("hex");
}

export function safeEqual(left: string | Buffer, right: string | Buffer): boolean {
  const a = Buffer.isBuffer(left) ? left : Buffer.from(left);
  const b = Buffer.isBuffer(right) ? right : Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function maskPan(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.length <= 4) return "*".repeat(normalized.length);
  return `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}
