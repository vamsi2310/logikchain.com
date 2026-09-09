import { auth, db, FieldValue } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { appendAudit } from "../lib/audit";
import { encryptSecret } from "../lib/kms";
import { remember, requireIdempotencyKey, shortCircuit } from "../lib/idempotency";
import { notify, notifyMany } from "../lib/notify";
import { nowIso } from "../lib/time";
import {
  requireEmail,
  requireNonEmpty,
  validateGstin,
  validateLocale,
  validatePan,
  validatePhoneAgainstCountry,
} from "../lib/validate";
import { AUTH_ID_TOKEN_TTL_SECONDS } from "../runtime";
import { maskPan } from "../lib/crypto";

const PROFILE_ALLOW: Record<string, string[]> = {
  buyer: ["name", "address", "villageId", "selectedMerchantId", "locale", "countryId", "notificationPrefs", "permissions"],
  merchant: ["name", "address", "shopDetails", "gstin", "villageId", "locale", "countryId", "notificationPrefs", "permissions"],
  vehicle: ["name", "contactInfo", "location", "vehicleNumber", "vehicleType", "vehicleCapacityKg", "panNumber", "locale", "notificationPrefs", "permissions"],
  supplier: ["name", "address", "location", "gstin", "locale", "notificationPrefs", "permissions"],
  support: ["name", "locale", "notificationPrefs", "permissions"],
};

export async function createSupplier(ctx: CallContext) {
  await requireCaller(ctx, { roles: ["support"] });
  const email = requireEmail(ctx.data.email);
  const name = requireNonEmpty(ctx.data.name, "name");
  const phone = requireNonEmpty(ctx.data.phone, "phone");
  const countryId = (ctx.data.countryId as string | undefined) ?? "country_in";

  const countrySnap = await db.collection(Col.Countries).doc(countryId).get();
  if (!countrySnap.exists || countrySnap.data()?.status !== "active") {
    fail("NOT_FOUND", "Selected Country does not exist or is inactive");
  }
  validatePhoneAgainstCountry(phone, countrySnap.data() as never);

  try {
    const existing = await auth.getUserByEmail(email);
    if (existing) fail("ALREADY_EXISTS", "A user with this email is already registered");
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== "auth/user-not-found") {
      if ((err as { code?: string }).code === "already-exists") {
        fail("ALREADY_EXISTS");
      }
    }
  }

  let user;
  try {
    user = await auth.createUser({ email, displayName: name, phoneNumber: phone });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    if (code.includes("already") || code.includes("exists")) {
      fail("ALREADY_EXISTS", "A user with this email or phone number is already registered");
    }
    fail("INVALID_ARGUMENT", "Invalid phone or email formatting");
  }

  await db.collection(Col.UserProfiles).doc(user.uid).set({
    role: "supplier",
    status: "approved",
    email,
    name,
    phone,
    countryId,
    location: ctx.data.location ?? null,
    createdAt: nowIso(),
  });
  await auth.setCustomUserClaims(user.uid, { role: "supplier", status: "approved" });
  await appendAudit({
    category: "account",
    actorId: ctx.uid!,
    actorRole: "support",
    subjectId: user.uid,
    after: { role: "supplier" },
    correlationId: ctx.correlationId,
  });
  return { success: true, supplierId: user.uid };
}

export async function convertBuyerToRole(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier"] });
  const buyerId = requireNonEmpty(ctx.data.buyerId, "buyerId");
  const targetRole = ctx.data.targetRole;
  if (targetRole !== "merchant" && targetRole !== "vehicle") {
    fail("INVALID_ARGUMENT", 'Requested role is not "merchant" or "vehicle"');
  }

  const officialClient = targetRole === "vehicle" ? "android" : "web";
  await db.runTransaction(async (tx) => {
    const ref = db.collection(Col.UserProfiles).doc(buyerId);
    const snap = await tx.get(ref);
    if (!snap.exists) fail("NOT_FOUND", "Target Buyer profile does not exist");
    const target = snap.data() as { role: string; status: string };
    if (target.role !== "buyer" || target.status !== "approved") {
      fail("INVALID_STATE", 'Target user role is not "buyer" or status is not "approved"');
    }
    tx.update(ref, { role: targetRole, supplierId: caller.id });
    if (targetRole === "merchant") {
      tx.set(db.collection(Col.CreditProfiles).doc(buyerId), {
        supplierId: caller.id,
        creditLimit: 0,
        creditUsed: 0,
        creditAvailable: 0,
        inTransitRepayments: 0,
        pendingRepayments: 0,
        paymentsMade: [],
        paymentsDue: [],
        updatedAt: nowIso(),
      });
    } else {
      tx.set(db.collection(Col.DriverEarnings).doc(buyerId), {
        totalEarnings: 0,
        pendingDues: 0,
        reservedForPayout: 0,
        cashInCustody: 0,
        cashRecoverable: 0,
        openSettlementIds: [],
        payments: [],
        payoutRequests: [],
      });
    }
  });

  await auth.setCustomUserClaims(buyerId, { role: targetRole, status: "approved" });
  await notify({
    userId: buyerId,
    category: "support",
    title: "Your role has changed",
    body: `You are now a ${targetRole}. Official client: ${officialClient}.`,
    data: { newRole: targetRole, officialClient },
  });
  return { success: true, userId: buyerId, newRole: targetRole, officialClient };
}

export async function updateUserProfile(ctx: CallContext) {
  const caller = await requireCaller(ctx);
  const targetId =
    caller.role === "support" && typeof ctx.data.userId === "string"
      ? ctx.data.userId
      : caller.id;
  if (targetId !== caller.id && caller.role !== "support") {
    fail("PERMISSION_DENIED", "Caller attempted to edit another user without the Support role");
  }
  if (ctx.data.payoutMethod !== undefined || ctx.data.activeBeneficiaryId !== undefined) {
    fail("INVALID_ARGUMENT", "Payout destination must use registerPayoutBeneficiary");
  }
  if (ctx.data.driverPay !== undefined) {
    fail("INVALID_ARGUMENT", "driverPay is rejected here — use updateDriverPayRates");
  }

  const targetSnap = await db.collection(Col.UserProfiles).doc(targetId).get();
  if (!targetSnap.exists) fail("NOT_FOUND", "Target profile does not exist");
  const target = targetSnap.data() as { role: string };
  const allow = new Set(PROFILE_ALLOW[target.role] ?? []);
  const patch: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  for (const [key, value] of Object.entries(ctx.data)) {
    if (key === "userId" || value === undefined) continue;
    if (["role", "status", "supplierId", "activeSubscriptionId"].includes(key)) {
      fail("INVALID_ARGUMENT", `${key} is not writable here`);
    }
    if (!allow.has(key)) fail("INVALID_ARGUMENT", `Field is not writable for role ${target.role}`);
    if (key === "gstin" && typeof value === "string") validateGstin(value);
    if (key === "locale" && typeof value === "string") validateLocale(value);
    if (key === "vehicleCapacityKg" && (typeof value !== "number" || value <= 0)) {
      fail("INVALID_ARGUMENT", "vehicleCapacityKg must be a positive number");
    }
    if (key === "villageId" && typeof value === "string") {
      const v = await db.collection(Col.Villages).doc(value).get();
      if (!v.exists) fail("NOT_FOUND", "Referenced Village does not exist");
    }
    if (key === "selectedMerchantId" && typeof value === "string") {
      const m = await db.collection(Col.UserProfiles).doc(value).get();
      if (!m.exists || m.data()?.role !== "merchant" || m.data()?.status !== "approved") {
        fail("NOT_FOUND", "Selected Merchant does not exist");
      }
    }
    if (key === "countryId" && typeof value === "string") {
      const c = await db.collection(Col.Countries).doc(value).get();
      if (!c.exists || c.data()?.status !== "active") fail("NOT_FOUND", "Country inactive");
    }
    if (key === "panNumber" && typeof value === "string") {
      validatePan(value);
      patch.panNumberEncrypted = encryptSecret(value.toUpperCase());
      patch.panNumberMasked = maskPan(value.toUpperCase());
      updatedFields.push("panNumber");
      continue;
    }
    patch[key] = value;
    updatedFields.push(key);
  }

  await db.collection(Col.UserProfiles).doc(targetId).update(patch);
  return { success: true, userId: targetId, updatedFields };
}

export async function disassociateMerchant(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const merchantId = requireNonEmpty(ctx.data.merchantId, "merchantId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const merchantSnap = await db.collection(Col.UserProfiles).doc(merchantId).get();
  if (!merchantSnap.exists) fail("NOT_FOUND", "Merchant profile does not exist");
  const merchant = merchantSnap.data() as { role: string; supplierId?: string };
  if (merchant.role !== "merchant") fail("INVALID_STATE", "Target profile is not a Merchant");
  if (caller.role === "supplier" && merchant.supplierId !== caller.id) {
    fail("PERMISSION_DENIED", "Caller does not manage this Merchant");
  }

  const orders = await db
    .collection(Col.Orders)
    .where("merchantId", "==", merchantId)
    .where("deliveryStatus", "in", ["placed", "reached_merchant"])
    .get();
  const merchantOrders = await db
    .collection(Col.MerchantOrders)
    .where("merchantId", "==", merchantId)
    .where("status", "in", ["placed", "reached"])
    .get();
  const gigs = await db
    .collection(Col.Gigs)
    .where("supplierId", "==", merchant.supplierId ?? caller.id)
    .where("status", "in", ["created", "started"])
    .get();

  const batch = db.batch();
  batch.update(db.collection(Col.UserProfiles).doc(merchantId), {
    supplierId: FieldValue.delete(),
  });
  const suspendedOrderIds: string[] = [];
  const suspendedMerchantOrderIds: string[] = [];
  const buyerIds = new Set<string>();
  for (const doc of orders.docs) {
    batch.update(doc.ref, { deliveryStatus: "suspended", suspensionReason: reason });
    suspendedOrderIds.push(doc.id);
    if (doc.data().buyer) buyerIds.add(doc.data().buyer);
  }
  for (const doc of merchantOrders.docs) {
    batch.update(doc.ref, { status: "suspended", suspensionReason: reason });
    suspendedMerchantOrderIds.push(doc.id);
  }
  for (const doc of gigs.docs) {
    const ids = (doc.data().merchantIds as string[] | undefined) ?? [];
    if (ids.includes(merchantId)) {
      batch.update(doc.ref, { merchantIds: ids.filter((id) => id !== merchantId) });
    }
  }
  await batch.commit();
  await notifyMany([merchantId, ...buyerIds], {
    category: "suspension",
    title: "Merchant disassociated",
    body: reason,
  });
  return { success: true, suspendedOrderIds, suspendedMerchantOrderIds };
}

export async function suspendUser(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support", "supplier"] });
  const key = requireIdempotencyKey(ctx.data);
  const userId = requireNonEmpty(ctx.data.userId, "userId");
  const cached = await shortCircuit<Record<string, unknown>>(key, userId);
  if (cached) return cached;
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const restorePath = requireNonEmpty(ctx.data.restorePath, "restorePath");
  const scope = ctx.data.scope as string;
  const reasonCode = ctx.data.reasonCode as string;
  if (reasonCode === "other" && !reason) fail("INVALID_ARGUMENT");
  if (ctx.data.autoRestoreAt && new Date(String(ctx.data.autoRestoreAt)).getTime() < Date.now()) {
    fail("INVALID_ARGUMENT", "autoRestoreAt is in the past");
  }
  if (caller.id === userId) fail("PERMISSION_DENIED", "Nobody may suspend themselves");

  const targetSnap = await db.collection(Col.UserProfiles).doc(userId).get();
  if (!targetSnap.exists) fail("NOT_FOUND", "Target profile not found");
  const target = targetSnap.data() as {
    role: string;
    status: string;
    supplierId?: string;
    name?: string;
  };
  if (target.status === "unauthorized") {
    fail("INVALID_STATE", "Unauthorized accounts are not suspended");
  }
  if (target.status === "suspended") fail("INVALID_STATE", "Target is already suspended");
  if (target.role === "support" && caller.role === "support") {
    fail("APPROVAL_REQUIRED", "A second Support actor is required to suspend Support");
  }
  if (caller.role === "supplier") {
    if (scope !== "operational") fail("PERMISSION_DENIED");
    if (!["vehicle", "merchant"].includes(target.role) || target.supplierId !== caller.id) {
      fail("PERMISSION_DENIED", "Supplier may only suspend own-network vehicle or merchant");
    }
  }

  const earnings = await db.collection(Col.DriverEarnings).doc(userId).get();
  const cashInCustody = (earnings.data()?.cashInCustody as number | undefined) ?? 0;
  const activeGig = await db
    .collection(Col.Gigs)
    .where("vehicleId", "==", userId)
    .where("status", "==", "started")
    .limit(1)
    .get();
  const custodyPlan: Record<string, unknown> = {
    cashInCustody,
    gigId: activeGig.docs[0]?.id ?? null,
    settlementOutstanding: cashInCustody > 0,
  };
  if (
    (cashInCustody > 0 || !activeGig.empty) &&
    ctx.data.acknowledgeCustodyPlan !== true
  ) {
    return {
      success: false,
      userId,
      status: target.status,
      requiresCustodyAcknowledgement: true,
      custodyPlan,
    };
  }

  const suspension = {
    scope,
    reasonCode,
    reason,
    internalNote: ctx.data.internalNote ?? null,
    restorePath,
    autoRestoreAt: ctx.data.autoRestoreAt ?? null,
    suspendedBy: caller.id,
    suspendedAt: nowIso(),
    custodyPlan,
  };

  await db.runTransaction(async (tx) => {
    tx.update(db.collection(Col.UserProfiles).doc(userId), {
      status: "suspended",
      suspension,
    });
  });

  if (!activeGig.empty) {
    const gigId = activeGig.docs[0].id;
    await db.collection(Col.Gigs).doc(gigId).update({
      status: "suspended",
      suspensionReason: reason,
      suspendedAt: nowIso(),
    });
  }

  let settlementId: string | undefined;
  if (cashInCustody > 0) {
    const entries = await db
      .collection(Col.CashLedgerEntries)
      .where("holderId", "==", userId)
      .where("status", "==", "in_custody")
      .get();
    settlementId = db.collection(Col.CashSettlements).doc().id;
    await db.collection(Col.CashSettlements).doc(settlementId).set({
      driverId: userId,
      supplierId: target.supplierId ?? null,
      status: "pending",
      origin: "driver_suspension",
      expectedAmount: cashInCustody,
      ledgerEntryIds: entries.docs.map((d) => d.id),
      openedAt: nowIso(),
      createdAt: nowIso(),
    });
    await db.collection(Col.UserProfiles).doc(userId).update({
      "suspension.custodyPlan.settlementId": settlementId,
      "suspension.custodyPlan.settlementOutstanding": true,
    });
  }

  await auth.setCustomUserClaims(userId, { role: target.role, status: "suspended" });
  await auth.revokeRefreshTokens(userId);
  const refreshTokensRevokedAt = nowIso();
  await notifyMany([userId, target.supplierId], {
    category: "suspension",
    title: "Account suspended",
    body: `${reason}. Restore path: ${restorePath}`,
  });
  await appendAudit({
    category: "account",
    actorId: caller.id,
    actorRole: caller.role,
    subjectId: userId,
    before: { status: "approved" },
    after: { status: "suspended", custodyPlan },
    reason,
    idempotencyKey: key,
    correlationId: ctx.correlationId,
  });
  const result = {
    success: true,
    userId,
    status: "suspended",
    suspension,
    refreshTokensRevokedAt,
    claimsEffectiveWithinSeconds: AUTH_ID_TOKEN_TTL_SECONDS,
  };
  return remember(key, userId, result);
}

export async function restoreUser(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support", "supplier"] });
  const key = requireIdempotencyKey(ctx.data);
  const userId = requireNonEmpty(ctx.data.userId, "userId");
  const cached = await shortCircuit<Record<string, unknown>>(key, userId);
  if (cached) return cached;
  const restoreNote = requireNonEmpty(ctx.data.restoreNote, "restoreNote");

  const snap = await db.collection(Col.UserProfiles).doc(userId).get();
  if (!snap.exists) fail("NOT_FOUND", "Target profile not found");
  const target = snap.data() as {
    role: string;
    status: string;
    supplierId?: string;
    suspension?: { suspendedBy?: string; scope?: string; custodyPlan?: { settlementId?: string } };
  };
  if (target.status !== "suspended" && !(target.status === "unauthorized" && caller.role === "support")) {
    fail("INVALID_STATE", "Target is not suspended");
  }
  if (caller.role === "supplier") {
    if (
      target.suspension?.suspendedBy !== caller.id ||
      target.suspension?.scope !== "operational" ||
      target.supplierId !== caller.id
    ) {
      fail("PERMISSION_DENIED", "Caller did not impose this suspension");
    }
  }

  const restoredAt = nowIso();
  await db.collection(Col.UserProfiles).doc(userId).update({
    status: "approved",
    "suspension.restoredBy": caller.id,
    "suspension.restoredAt": restoredAt,
    "suspension.restoreNote": restoreNote,
  });
  await auth.setCustomUserClaims(userId, { role: target.role, status: "approved" });

  const settlements = await db
    .collection(Col.CashSettlements)
    .where("driverId", "==", userId)
    .where("status", "in", ["pending", "declared", "disputed"])
    .get();
  const outstandingSettlementIds = settlements.docs.map((d) => d.id);
  await notifyMany([userId, target.supplierId], {
    category: "suspension",
    title: "Account restored",
    body: restoreNote,
  });
  await appendAudit({
    category: "account",
    actorId: caller.id,
    actorRole: caller.role,
    subjectId: userId,
    before: { status: target.status },
    after: { status: "approved" },
    reason: restoreNote,
    idempotencyKey: key,
    correlationId: ctx.correlationId,
  });
  const result = { success: true, userId, status: "approved", outstandingSettlementIds };
  return remember(key, userId, result);
}
