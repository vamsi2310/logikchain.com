import { storage } from "../admin";

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function archiveProviderPayload(input: {
  provider: string;
  eventId: string;
  rawBody: Buffer;
  receivedAt?: Date;
}): Promise<string> {
  const date = (input.receivedAt ?? new Date()).toISOString().slice(0, 10);
  const objectPath = [
    "payloads",
    safeSegment(input.provider),
    date,
    `${safeSegment(input.eventId)}.json`,
  ].join("/");
  await storage.bucket().file(objectPath).save(input.rawBody, {
    resumable: false,
    contentType: "application/json",
    metadata: {
      cacheControl: "private, no-store",
      metadata: { provider: input.provider, eventId: input.eventId },
    },
  });
  return objectPath;
}

export async function createSignedReadUrl(
  objectPath: string,
  expiresAt: Date
): Promise<string> {
  const [url] = await storage.bucket().file(objectPath).getSignedUrl({
    action: "read",
    expires: expiresAt,
  });
  return url;
}

export async function deleteStoredObject(objectPath: string): Promise<void> {
  await storage.bucket().file(objectPath).delete({ ignoreNotFound: true });
}
