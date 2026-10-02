import { db } from "../admin";
import { Col } from "../collections";
import { randomId } from "./crypto";
import { nowIso } from "./time";

export interface AuditEntry {
  category: string;
  actorId: string;
  actorRole?: string;
  subjectId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  idempotencyKey?: string;
  correlationId?: string;
}

export async function appendAudit(entry: AuditEntry): Promise<string> {
  const auditLogEntryId = randomId("aud");
  const data = Object.fromEntries(
    Object.entries({
      ...entry,
      auditLogEntryId,
      createdAt: nowIso(),
    }).filter(([, value]) => value !== undefined)
  );
  await db.collection(Col.AuditLogEntries).doc(auditLogEntryId).create(data);
  return auditLogEntryId;
}
