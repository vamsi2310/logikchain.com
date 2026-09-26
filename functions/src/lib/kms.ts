import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import { isEmulator } from "../runtime";

const client = new KeyManagementServiceClient();

function keyName(): string {
  const value = process.env.KMS_FINANCIAL_KEY_RESOURCE_NAME;
  if (!value) throw new Error("KMS_FINANCIAL_KEY_RESOURCE_NAME is not configured");
  return value;
}

function localKey(): Buffer {
  const secret = process.env.LOCAL_FINANCIAL_ENCRYPTION_KEY;
  if (!isEmulator() || !secret) {
    throw new Error("LOCAL_FINANCIAL_ENCRYPTION_KEY is required for emulator encryption");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export async function encryptSecret(value: string): Promise<string> {
  if (process.env.LOCAL_FINANCIAL_ENCRYPTION_KEY) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", localKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "local",
      "v1",
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  }
  const [response] = await client.encrypt({
    name: keyName(),
    plaintext: Buffer.from(value, "utf8"),
  });
  if (!response.ciphertext) throw new Error("Cloud KMS returned no ciphertext");
  return `kms:v1:${Buffer.from(response.ciphertext).toString("base64")}`;
}

export async function decryptSecret(value: string): Promise<string> {
  if (value.startsWith("local:v1:")) {
    const [, , ivValue, tagValue, cipherValue] = value.split(":");
    if (!ivValue || !tagValue || !cipherValue) throw new Error("Invalid local ciphertext");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      localKey(),
      Buffer.from(ivValue, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(cipherValue, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== "kms" || parts[1] !== "v1") {
    throw new Error("Unsupported ciphertext format");
  }
  const [response] = await client.decrypt({
    name: keyName(),
    ciphertext: Buffer.from(parts[2], "base64"),
  });
  if (!response.plaintext) throw new Error("Cloud KMS returned no plaintext");
  return Buffer.from(response.plaintext).toString("utf8");
}
