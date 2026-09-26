import { db, messaging } from "../admin";
import { Col } from "../collections";
import { randomId } from "./crypto";
import { nowIso } from "./time";

export interface NotificationInput {
  userId: string;
  category: string;
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, unknown>;
}

function stringData(input: NotificationInput): Record<string, string> {
  const result: Record<string, string> = {
    category: input.category,
    notificationId: "",
  };
  if (input.deepLink) result.deepLink = input.deepLink;
  for (const [key, value] of Object.entries(input.data ?? {})) {
    if (value !== undefined && value !== null) {
      result[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }
  return result;
}

export async function notify(input: NotificationInput): Promise<string | null> {
  if (!input.userId) return null;
  const notificationId = randomId("ntf");
  const createdAt = nowIso();
  await db
    .collection(Col.Notifications)
    .doc(notificationId)
    .set(
      Object.fromEntries(
        Object.entries({
          ...input,
          notificationId,
          read: false,
          createdAt,
        }).filter(([, value]) => value !== undefined)
      )
    );

  const profile = await db.collection(Col.UserProfiles).doc(input.userId).get();
  const tokens = Array.from(
    new Set(
      ((profile.data()?.deviceTokens ?? []) as Array<{ token?: string }>)
        .map((entry) => entry.token)
        .filter((token): token is string => typeof token === "string" && token.length > 0)
    )
  );
  if (tokens.length === 0) return notificationId;

  const data = stringData(input);
  data.notificationId = notificationId;
  for (let offset = 0; offset < tokens.length; offset += 500) {
    try {
      await messaging.sendEachForMulticast({
        tokens: tokens.slice(offset, offset + 500),
        notification: { title: input.title, body: input.body },
        data,
      });
    } catch (error) {
      console.error("FCM notification delivery failed", {
        notificationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return notificationId;
}

export async function notifyMany(
  userIds: Array<string | undefined | null>,
  input: Omit<NotificationInput, "userId">
): Promise<Array<string | null>> {
  const unique = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  return Promise.all(unique.map((userId) => notify({ ...input, userId })));
}
