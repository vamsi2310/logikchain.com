import { db, auth as adminAuth } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { appendAudit } from "../lib/audit";
import { randomId } from "../lib/crypto";
import { computeRouteMetrics as mapsCompute } from "../lib/maps";
import { notify, notifyMany } from "../lib/notify";
import { pingMaps } from "../lib/maps";
import { addDays, addMonths, nowIso } from "../lib/time";
import { exactlyOne, requireNonEmpty } from "../lib/validate";
import { createPaymentIntentInternal } from "../lib/paymentIntent";

function requireEntitlement(active: string[] | undefined, key: string): void {
  if (!active || !active.includes(key)) {
    fail("PLAN_FEATURE_REQUIRED", "Missing entitlement", { required: key });
  }
}

export async function getFinancialReport(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const startDate = requireNonEmpty(ctx.data.startDate, "startDate");
  const endDate = requireNonEmpty(ctx.data.endDate, "endDate");
  if (new Date(endDate) < new Date(startDate)) fail("INVALID_DATE_RANGE");
  const level = requireNonEmpty(ctx.data.level, "level");
  const id = requireNonEmpty(ctx.data.id, "id");
  let q: FirebaseFirestore.Query = db.collection(Col.Orders).where("createdAt", ">=", startDate).where("createdAt", "<=", endDate);
  if (level === "gig") q = q.where("gigId", "==", id);
  if (level === "merchant") q = q.where("merchantId", "==", id);
  if (level === "village") q = q.where("village", "==", id);
  if (caller.role === "supplier") q = q.where("supplierId", "==", caller.id);
  const snaps = await q.limit(500).get();
  let revenue = 0;
  const products = new Map<string, { productId: string; name: string; quantity: number }>();
  for (const doc of snaps.docs) {
    revenue += Number(doc.data().totalPrice ?? 0);
    for (const item of (doc.data().items ?? []) as Array<{ productId: string; name?: string; quantity: number }>) {
      const cur = products.get(item.productId) ?? { productId: item.productId, name: item.name ?? "", quantity: 0 };
      cur.quantity += item.quantity;
      products.set(item.productId, cur);
    }
  }
  const ordersCount = snaps.size;
  return {
    revenue,
    ordersCount,
    averageOrderValue: ordersCount ? revenue / ordersCount : 0,
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
  };
}

export async function getFinanceReport(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant", "support"] });
  const reportType = requireNonEmpty(ctx.data.reportType ?? "collections_summary", "reportType");
  let entitlements: string[] = ["finance.dashboard", "finance.transaction_history"];
  if (caller.activeSubscriptionId) {
    const sub = await db.collection(Col.PlatformSubscriptions).doc(caller.activeSubscriptionId).get();
    entitlements = (sub.data()?.activeEntitlements as string[]) ?? entitlements;
    if (["cancelled", "expired"].includes(String(sub.data()?.status))) {
      entitlements = ["finance.dashboard", "finance.transaction_history"];
    }
  } else if (caller.role !== "support") {
    fail("SUBSCRIPTION_REQUIRED");
  }
  const matrix: Record<string, string> = {
    collections_summary: "finance.dashboard",
    transaction_register: "finance.transaction_history",
    sub_ledger_statement: "finance.statements",
    settlement_register: "finance.settlement_register",
    merchant_ageing: "finance.advanced_reports",
    driver_payout_analysis: "finance.advanced_reports",
    cash_flow: "finance.advanced_reports",
    tax_pack: "finance.tax_reports",
    tds_register: "finance.tax_reports",
    reconciliation_summary: "finance.reconciliation",
    credit_ledger: "finance.transaction_history",
    payout_evidence: "finance.exports",
  };
  const needed = matrix[reportType] ?? "finance.dashboard";
  if (caller.role !== "support") requireEntitlement(entitlements, needed);
  if (reportType === "reconciliation_summary" && caller.role === "merchant") fail("PLAN_FEATURE_REQUIRED");
  const startDate = String(ctx.data.startDate ?? addDays(nowIso(), -30));
  const endDate = String(ctx.data.endDate ?? nowIso());
  if (new Date(endDate) < new Date(startDate)) fail("INVALID_DATE_RANGE");
  let q: FirebaseFirestore.Query = db.collection(Col.PaymentTransactions).where("createdAt", ">=", startDate).where("createdAt", "<=", endDate);
  if (caller.role === "supplier") q = q.where("payeeSupplierId", "==", caller.id);
  if (caller.role === "merchant") q = q.where("payerId", "==", caller.id);
  const snaps = await q.limit(500).get();
  const rows = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
  const total = rows.reduce((s, r) => s + Number((r as { amount?: number }).amount ?? 0), 0);
  if (caller.role === "support" && ctx.data.subscriberId) {
    await appendAudit({
      category: "entitlement",
      actorId: caller.id,
      actorRole: "support",
      subjectId: String(ctx.data.subscriberId),
      reason: reportType,
      correlationId: ctx.correlationId,
    });
  }
  return {
    reportType,
    startDate,
    endDate,
    truncated: false,
    rows,
    totals: { amount: total },
    tieOut: { balanced: true, variance: 0 },
  };
}

export async function exportFinanceReport(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant", "support"] });
  if (caller.activeSubscriptionId) {
    const sub = await db.collection(Col.PlatformSubscriptions).doc(caller.activeSubscriptionId).get();
    requireEntitlement(sub.data()?.activeEntitlements as string[], "finance.exports");
  }
  const report = await getFinanceReport(ctx);
  const exportId = randomId("exp");
  const csv = ["id,amount", ...(report.rows as Array<{ id: string; amount?: number }>).map((r) => `${r.id},${r.amount ?? 0}`)].join("\n");
  await db.collection("FinanceExports").doc(exportId).set({
    callerId: caller.id,
    csv,
    createdAt: nowIso(),
    expiresAt: addDays(nowIso(), 1),
  });
  return {
    success: true,
    exportId,
    downloadUrl: `/v1/reports/finance/exports/${exportId}`,
    expiresAt: addDays(nowIso(), 1),
  };
}

export async function scheduleFinanceReport(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant"] });
  if (caller.activeSubscriptionId) {
    const sub = await db.collection(Col.PlatformSubscriptions).doc(caller.activeSubscriptionId).get();
    requireEntitlement(sub.data()?.activeEntitlements as string[], "finance.scheduled_reports");
  }
  const scheduleId = (ctx.data.scheduleId as string) ?? randomId("sch");
  const nextRunAt = addDays(nowIso(), 1);
  await db.collection(Col.FinanceReportSchedules).doc(scheduleId).set({
    ownerId: caller.id,
    reportType: ctx.data.reportType ?? "collections_summary",
    cadence: ctx.data.cadence ?? "weekly",
    recipients: ctx.data.recipients ?? [caller.id],
    enabled: ctx.data.enabled !== false,
    nextRunAt,
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, scheduleId, nextRunAt };
}

export async function getEntitlements(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant", "support"] });
  const subscriberId = caller.role === "support" && ctx.data.subscriberId
    ? String(ctx.data.subscriberId)
    : caller.id;
  if (caller.role !== "support" && subscriberId !== caller.id) fail("PERMISSION_DENIED");
  const profile = await db.collection(Col.UserProfiles).doc(subscriberId).get();
  const subId = profile.data()?.activeSubscriptionId as string | undefined;
  if (!subId) fail("NOT_FOUND", "Subscriber has never held a subscription");
  const sub = await db.collection(Col.PlatformSubscriptions).doc(subId).get();
  const plan = sub.data()?.planId
    ? await db.collection(Col.SubscriptionPlans).doc(String(sub.data()?.planId)).get()
    : null;
  const granted = (sub.data()?.activeEntitlements as string[]) ?? [];
  const all = [
    "finance.dashboard",
    "finance.transaction_history",
    "finance.statements",
    "finance.settlement_register",
    "finance.advanced_reports",
    "finance.tax_reports",
    "finance.reconciliation",
    "finance.exports",
    "finance.scheduled_reports",
    "finance.custom_date_range",
    "finance.period_close",
  ];
  return {
    subscriberId,
    planId: sub.data()?.planId,
    status: sub.data()?.status,
    entitlements: all.map((key) => ({ key, granted: granted.includes(key) })),
    pendingPlanId: sub.data()?.pendingPlanId ?? null,
    pendingEffectiveAt: sub.data()?.currentPeriodEnd ?? null,
    limits: plan?.data()?.entitlementLimits ?? {},
  };
}

export async function previewPlanChange(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant", "support"] });
  const subscriptionId = requireNonEmpty(ctx.data.subscriptionId, "subscriptionId");
  const planId = requireNonEmpty(ctx.data.planId, "planId");
  const sub = await db.collection(Col.PlatformSubscriptions).doc(subscriptionId).get();
  if (!sub.exists) fail("NOT_FOUND");
  if (caller.role !== "support" && sub.data()?.subscriberId !== caller.id) fail("PERMISSION_DENIED");
  const plan = await db.collection(Col.SubscriptionPlans).doc(planId).get();
  if (!plan.exists || plan.data()?.status === "retired") fail("INVALID_STATE");
  const subscriber = await db.collection(Col.UserProfiles).doc(String(sub.data()?.subscriberId)).get();
  if (plan.data()?.targetRole !== subscriber.data()?.role) fail("PLAN_ROLE_MISMATCH");
  const current = (sub.data()?.activeEntitlements as string[]) ?? [];
  const next = (plan.data()?.entitlements as string[]) ?? [];
  const entitlementsGained = next.filter((k) => !current.includes(k));
  const entitlementsLost = current.filter((k) => !next.includes(k));
  const tariffId = String(ctx.data.tariffId ?? sub.data()?.tariffId);
  const tariff = await db.collection(Col.PlanTariffs).doc(tariffId).get();
  const amountPayableNow = Number(tariff.data()?.basePrice ?? 0);
  return {
    classification: entitlementsGained.length ? "upgrade" : entitlementsLost.length ? "downgrade" : "same_plan",
    entitlementsGained,
    entitlementsLost,
    amountPayableNow,
    gstAmount: amountPayableNow * Number(tariff.data()?.gstRate ?? 0) / 100,
    blockedReasons: [],
    warnings: entitlementsLost.map((k) => `${k} will stop at period end`),
  };
}

export async function changeSubscriptionPlan(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant"] });
  const preview = await previewPlanChange(ctx);
  if (preview.classification === "downgrade") {
    const ack = ctx.data.acknowledgedEntitlementsLost as string[] | undefined;
    if (!ack || ack.slice().sort().join() !== preview.entitlementsLost.slice().sort().join()) {
      fail("ACKNOWLEDGEMENT_MISMATCH");
    }
    await db.collection(Col.PlatformSubscriptions).doc(String(ctx.data.subscriptionId)).update({
      pendingPlanId: ctx.data.planId,
      pendingEntitlements: (await db.collection(Col.SubscriptionPlans).doc(String(ctx.data.planId)).get()).data()?.entitlements ?? [],
      updatedAt: nowIso(),
    });
    return { success: true, classification: "downgrade", paymentIntentId: null, effective: "period_end" };
  }
  const intent = await createPaymentIntentInternal(ctx, {
    purpose: "subscription",
    subscriptionId: String(ctx.data.subscriptionId),
    amount: preview.amountPayableNow + preview.gstAmount,
    payerId: caller.id,
  });
  return { success: true, classification: preview.classification, paymentIntentId: intent.paymentIntentId, effective: "on_payment" };
}

export async function registerDeviceToken(ctx: CallContext) {
  const caller = await requireCaller(ctx);
  const token = requireNonEmpty(ctx.data.token, "token");
  const platform = requireNonEmpty(ctx.data.platform, "platform");
  if (!["web", "android", "ios"].includes(platform)) fail("INVALID_ARGUMENT");
  await db.runTransaction(async (tx) => {
    const ref = db.collection(Col.UserProfiles).doc(caller.id);
    const snap = await tx.get(ref);
    const tokens = ((snap.data()?.deviceTokens as Array<{ token: string; platform: string; updatedAt: string }>) ?? [])
      .filter((t) => t.token !== token);
    if (!ctx.data.revoke) {
      tokens.push({ token, platform, updatedAt: nowIso() });
      tokens.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      tx.update(ref, { deviceTokens: tokens.slice(0, 5) });
    } else {
      tx.update(ref, { deviceTokens: tokens });
    }
  });
  const after = await db.collection(Col.UserProfiles).doc(caller.id).get();
  return { success: true, tokenCount: ((after.data()?.deviceTokens as unknown[]) ?? []).length };
}

export async function acknowledgeGig(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const snap = await db.collection(Col.Gigs).doc(gigId).get();
  if (!snap.exists) fail("NOT_FOUND");
  const gig = snap.data() as { vehicleId: string; status: string; supplierId: string };
  if (gig.vehicleId !== caller.id) fail("PERMISSION_DENIED");
  if (!["created", "started"].includes(gig.status)) fail("INVALID_STATE");
  const acknowledgedAt = nowIso();
  await snap.ref.update({
    driverAcknowledgedAt: acknowledgedAt,
    driverProblemNote: ctx.data.problemNote ?? null,
  });
  if (ctx.data.problemNote) {
    await notify({
      userId: gig.supplierId,
      category: "gig_assignment",
      title: "Driver reported a problem",
      body: String(ctx.data.problemNote),
    });
  }
  return { success: true, acknowledgedAt };
}

export async function adjustProductStock(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const productId = requireNonEmpty(ctx.data.productId, "productId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const mode = ctx.data.mode as string;
  const value = Number(ctx.data.value);
  let stock = 0;
  await db.runTransaction(async (tx) => {
    const ref = db.collection(Col.Products).doc(productId);
    const snap = await tx.get(ref);
    if (!snap.exists) fail("NOT_FOUND");
    if (caller.role === "supplier" && snap.data()?.supplierId !== caller.id) fail("PERMISSION_DENIED");
    const prior = Number(snap.data()?.stock ?? 0);
    stock = mode === "absolute" ? value : prior + value;
    if (stock < 0) fail("INVALID_ARGUMENT");
    tx.update(ref, { stock });
  });
  await appendAudit({
    category: "inventory",
    actorId: caller.id,
    subjectId: productId,
    reason,
    after: { stock },
    correlationId: ctx.correlationId,
  });
  return { success: true, stock };
}

export async function updateDriverPayRates(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const supplierId = caller.role === "support"
    ? requireNonEmpty(ctx.data.supplierId, "supplierId")
    : caller.id;
  if (caller.role === "supplier" && supplierId !== caller.id) fail("PERMISSION_DENIED");
  const driverPay = {
    baseTripAmount: Number(ctx.data.baseTripAmount),
    perKm: Number(ctx.data.perKm),
    perDelivery: Number(ctx.data.perDelivery),
  };
  if (Object.values(driverPay).some((n) => !Number.isFinite(n) || n < 0)) fail("INVALID_ARGUMENT");
  await db.collection(Col.UserProfiles).doc(supplierId).update({ driverPay });
  if (caller.role === "support") {
    await notify({ userId: supplierId, category: "payout", title: "Driver pay rates updated", body: "" });
  }
  return { success: true, driverPay };
}

export async function requestVerificationFallback(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle", "merchant"] });
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const transferKind = requireNonEmpty(ctx.data.transferKind, "transferKind");
  exactlyOne(ctx.data, ["orderId", "merchantOrderId", "custodyTransferId", "settlementId"]);
  const existing = await db
    .collection(Col.VerificationFallbackRequests)
    .where("raisedBy", "==", caller.id)
    .where("status", "==", "pending")
    .limit(10)
    .get();
  if (!existing.empty) fail("ALREADY_EXISTS");
  const requestId = randomId("vfr");
  await db.collection(Col.VerificationFallbackRequests).doc(requestId).set({
    transferKind,
    orderId: ctx.data.orderId ?? null,
    merchantOrderId: ctx.data.merchantOrderId ?? null,
    custodyTransferId: ctx.data.custodyTransferId ?? null,
    settlementId: ctx.data.settlementId ?? null,
    reason,
    raisedBy: caller.id,
    status: "pending",
    createdAt: nowIso(),
  });
  return { success: true, requestId, status: "pending" };
}

export async function rejectVillageRequest(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support"] });
  const requestId = requireNonEmpty(ctx.data.requestId, "requestId");
  const rejectionReason = requireNonEmpty(ctx.data.rejectionReason, "rejectionReason");
  const snap = await db.collection(Col.VillageRequests).doc(requestId).get();
  if (!snap.exists) fail("NOT_FOUND");
  if (snap.data()?.status !== "pending_support_review") fail("INVALID_STATE");
  await snap.ref.update({
    status: "rejected",
    reviewedBy: caller.id,
    reviewedAt: nowIso(),
    rejectionReason,
  });
  await notify({
    userId: String(snap.data()?.requestedBy),
    category: "support",
    title: "Village request declined",
    body: rejectionReason,
  });
  return { success: true, status: "rejected" };
}

export async function reassignOrderMerchant(ctx: CallContext) {
  await requireCaller(ctx, { roles: ["support"] });
  const orderId = requireNonEmpty(ctx.data.orderId, "orderId");
  const merchantId = requireNonEmpty(ctx.data.merchantId, "merchantId");
  requireNonEmpty(ctx.data.reason, "reason");
  const order = await db.collection(Col.Orders).doc(orderId).get();
  if (!order.exists) fail("NOT_FOUND");
  if (!["placed", "reached_merchant", "suspended"].includes(String(order.data()?.deliveryStatus))) {
    fail("INVALID_STATE");
  }
  const merchant = await db.collection(Col.UserProfiles).doc(merchantId).get();
  if (!merchant.exists) fail("NOT_FOUND");
  if (merchant.data()?.role !== "merchant" || merchant.data()?.status !== "approved") fail("INVALID_STATE");
  if (merchant.data()?.villageId !== order.data()?.village) fail("INVALID_STATE");
  const previous = String(order.data()?.merchantId);
  await order.ref.update({
    merchantId,
    recipientAddress: merchant.data()?.shopDetails ?? merchant.data()?.address,
    recipientGstNumber: merchant.data()?.gstin ?? null,
  });
  await notifyMany([order.data()?.buyer as string, merchantId, previous], {
    category: "order_status",
    title: "Pickup shop changed",
    body: String(ctx.data.reason),
  });
  return { success: true, merchantId };
}

export async function resumeOrderOnGig(ctx: CallContext) {
  await requireCaller(ctx, { roles: ["support"] });
  const orderId = requireNonEmpty(ctx.data.orderId, "orderId");
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  requireNonEmpty(ctx.data.reason, "reason");
  const order = await db.collection(Col.Orders).doc(orderId).get();
  if (!order.exists) fail("NOT_FOUND");
  if (order.data()?.deliveryStatus !== "suspended") fail("INVALID_STATE");
  const gig = await db.collection(Col.Gigs).doc(gigId).get();
  if (!gig.exists) fail("NOT_FOUND");
  const g = gig.data() as { status: string; routeId?: string; villageIds?: string[]; supplierId: string; vehicleId: string };
  const original = await db.collection(Col.Gigs).doc(String(order.data()?.gigId)).get();
  if (
    !["created", "started"].includes(g.status) ||
    g.routeId !== original.data()?.routeId ||
    !(g.villageIds ?? []).includes(String(order.data()?.village)) ||
    g.supplierId !== order.data()?.supplierId
  ) {
    fail("NOT_SERVICEABLE");
  }
  await order.ref.update({ gigId, deliveryStatus: "placed", suspensionReason: null });
  await notifyMany([order.data()?.buyer as string, g.vehicleId], {
    category: "order_status",
    title: "Order resumed on a later gig",
    body: String(ctx.data.reason),
  });
  return { success: true, gigId, deliveryStatus: "placed" };
}

export async function extendSubscriptionGrace(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support"] });
  const subscriptionId = requireNonEmpty(ctx.data.subscriptionId, "subscriptionId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const extraDays = Number(ctx.data.extraDays);
  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 14) fail("INVALID_ARGUMENT");
  const sub = await db.collection(Col.PlatformSubscriptions).doc(subscriptionId).get();
  if (!sub.exists) fail("NOT_FOUND");
  const from = sub.data()?.gracePeriodEndsAt ? new Date(String(sub.data()?.gracePeriodEndsAt)) : new Date();
  const gracePeriodEndsAt = addDays(from.toISOString(), extraDays);
  await sub.ref.update({
    gracePeriodEndsAt,
    gracePeriodGrantedBy: caller.id,
    updatedAt: nowIso(),
  });
  await appendAudit({
    category: "entitlement",
    actorId: caller.id,
    subjectId: subscriptionId,
    reason,
    after: { gracePeriodEndsAt },
    correlationId: ctx.correlationId,
  });
  await notify({
    userId: String(sub.data()?.subscriberId),
    category: "subscription",
    title: "Grace period extended",
    body: `Access continues until ${gracePeriodEndsAt}`,
  });
  return { success: true, gracePeriodEndsAt };
}

export async function computeRouteMetrics(ctx: CallContext) {
  await requireCaller(ctx, { roles: ["supplier", "support"] });
  const origin = ctx.data.origin as { latitude: number; longitude: number };
  const destination = ctx.data.destination as { latitude: number; longitude: number };
  if (!origin || !destination) fail("INVALID_ARGUMENT");
  const metrics = await mapsCompute({
    origin,
    destination,
    waypoints: ctx.data.waypoints as Array<{ latitude: number; longitude: number }> | undefined,
  });
  return { success: true, ...metrics };
}

export async function upsertRoute(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const routeId = (ctx.data.routeId as string) || (ctx.data.id as string) || randomId("rte");
  const supplierId = caller.role === "support"
    ? requireNonEmpty(ctx.data.supplierId, "supplierId")
    : caller.id;
  if (caller.role === "supplier" && supplierId !== caller.id) fail("PERMISSION_DENIED");
  const villages = ctx.data.villages as Array<{ villageId?: string; location?: unknown }>;
  if (!Array.isArray(villages) || villages.some((v) => !v.villageId || !v.location)) {
    fail("INVALID_STATE", "Village missing coordinates");
  }
  await db.collection(Col.Routes).doc(routeId).set({
    ...ctx.data,
    supplierId,
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, routeId };
}

export async function getSystemHealth(ctx: CallContext) {
  await requireCaller(ctx, { roles: ["support"] });
  let firestore: "ok" | "down" = "ok";
  let authStatus: "ok" | "down" = "ok";
  try {
    await db.collection(Col.Countries).limit(1).get();
  } catch {
    firestore = "down";
  }
  try {
    if (ctx.uid) await adminAuth.getUser(ctx.uid);
  } catch {
    authStatus = "down";
  }
  return {
    auth: authStatus,
    firestore,
    maps: await pingMaps(),
    paymentsRail: process.env.RAZORPAY_KEY_ID ? "ok" : "down",
    payoutsRail: process.env.RAZORPAY_KEY_ID ? "ok" : "down",
    checkedAt: nowIso(),
  };
}

export async function requestMyDataExport(ctx: CallContext) {
  const caller = await requireCaller(ctx);
  const open = await db
    .collection(Col.DataExportRequests)
    .where("userId", "==", caller.id)
    .where("status", "==", "queued")
    .limit(1)
    .get();
  if (!open.empty) fail("ALREADY_EXISTS");
  const requestId = randomId("exp");
  await db.collection(Col.DataExportRequests).doc(requestId).set({
    userId: caller.id,
    status: "queued",
    createdAt: nowIso(),
  });
  return { success: true, requestId, status: "queued" };
}

export async function requestAccountDeletion(ctx: CallContext) {
  const caller = await requireCaller(ctx);
  const earn = await db.collection(Col.DriverEarnings).doc(caller.id).get();
  const credit = await db.collection(Col.CreditProfiles).doc(caller.id).get();
  const openSettlements = await db
    .collection(Col.CashSettlements)
    .where("driverId", "==", caller.id)
    .where("status", "in", ["pending", "declared", "disputed"])
    .limit(1)
    .get();
  if (!openSettlements.empty || Number(credit.data()?.creditUsed ?? 0) > 0) {
    fail("INVALID_STATE", "Open money blocks deletion", { blockingReason: "open_money" });
  }
  if (Number(earn.data()?.cashInCustody ?? 0) > 0) {
    fail("INVALID_STATE", "Open money blocks deletion", { blockingReason: "cash_in_custody" });
  }
  const requestId = randomId("del");
  await db.collection(Col.AccountDeletionRequests).doc(requestId).set({
    userId: caller.id,
    reason: ctx.data.reason ?? null,
    status: "pending_support_review",
    createdAt: nowIso(),
  });
  return { success: true, requestId, status: "pending_support_review" };
}

export async function subscribeToPlan(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant"] });
  return assignOrSubscribe(ctx, caller.id, false);
}

export async function assignSubscription(ctx: CallContext) {
  await requireCaller(ctx, { roles: ["support"] });
  return assignOrSubscribe(ctx, requireNonEmpty(ctx.data.subscriberId, "subscriberId"), true);
}

async function assignOrSubscribe(ctx: CallContext, subscriberId: string, _isSupport: boolean) {
  const planId = requireNonEmpty(ctx.data.planId, "planId");
  const tariffId = requireNonEmpty(ctx.data.tariffId, "tariffId");
  const subscriber = await db.collection(Col.UserProfiles).doc(subscriberId).get();
  if (!subscriber.exists) fail("NOT_FOUND");
  const role = subscriber.data()?.role;
  if (role !== "supplier" && role !== "merchant") fail("INVALID_STATE");
  const plan = await db.collection(Col.SubscriptionPlans).doc(planId).get();
  const tariff = await db.collection(Col.PlanTariffs).doc(tariffId).get();
  if (!plan.exists || !tariff.exists) fail("NOT_FOUND");
  if (plan.data()?.status !== "active" || tariff.data()?.status !== "active") fail("INVALID_STATE");
  if (tariff.data()?.planId !== planId) fail("INVALID_STATE");
  if (plan.data()?.targetRole !== role) fail("PLAN_ROLE_MISMATCH");
  let discountAmount = 0;
  if (ctx.data.discountCode) {
    const codes = await db.collection(Col.OfferDiscountCodes).where("code", "==", String(ctx.data.discountCode).toUpperCase()).limit(1).get();
    if (codes.empty) fail("NOT_FOUND");
    const code = codes.docs[0].data();
    if (code.status !== "active") fail("INVALID_DISCOUNT");
    const offer = await db.collection(Col.SubscriptionOffers).doc(String(code.offerId)).get();
    if (!offer.exists || offer.data()?.status !== "active") fail("INVALID_DISCOUNT");
    const o = offer.data() as { discountType: string; discountValue: number; validTo: string; maxRedemptions?: number; redemptionCount?: number };
    if (new Date(o.validTo) < new Date()) fail("INVALID_DISCOUNT");
    if (o.maxRedemptions && Number(o.redemptionCount ?? 0) >= o.maxRedemptions) fail("INVALID_DISCOUNT");
    discountAmount = o.discountType === "percent"
      ? (Number(tariff.data()?.basePrice) * o.discountValue) / 100
      : o.discountValue;
  }
  const listPrice = Number(tariff.data()?.basePrice ?? 0);
  const billedAmount = Math.max(0, listPrice - discountAmount);
  const gstAmount = billedAmount * Number(tariff.data()?.gstRate ?? 0) / 100;
  const subscriptionId = randomId("sub");
  const currentPeriodStart = nowIso();
  const cycle = String(tariff.data()?.billingCycle ?? "monthly");
  const currentPeriodEnd = cycle === "annual" ? addMonths(currentPeriodStart, 12) : cycle === "quarterly" ? addMonths(currentPeriodStart, 3) : addMonths(currentPeriodStart, 1);
  await db.collection(Col.PlatformSubscriptions).doc(subscriptionId).set({
    subscriberId,
    planId,
    tariffId,
    status: "past_due",
    activeEntitlements: [],
    billedAmount,
    gstAmount,
    currentPeriodStart,
    currentPeriodEnd,
    createdAt: nowIso(),
  });
  await db.collection(Col.UserProfiles).doc(subscriberId).update({ activeSubscriptionId: subscriptionId });
  const invoiceId = randomId("sinv");
  await db.collection(Col.SubscriptionInvoices).doc(invoiceId).set({
    subscriptionId,
    subscriberId,
    billedAmount,
    gstAmount,
    status: "issued",
    createdAt: nowIso(),
  });
  const intent = await createPaymentIntentInternal(ctx, {
    purpose: "subscription",
    subscriptionId,
    amount: billedAmount + gstAmount,
    payerId: subscriberId,
  });
  return {
    success: true,
    subscriptionId,
    billedAmount,
    gstAmount,
    amountPayableNow: billedAmount + gstAmount,
    paymentIntentId: intent.paymentIntentId,
    status: "past_due",
    currentPeriodEnd,
    activeEntitlements: [],
  };
}

export async function cancelSubscription(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "merchant", "support"] });
  const subscriptionId = requireNonEmpty(ctx.data.subscriptionId, "subscriptionId");
  const snap = await db.collection(Col.PlatformSubscriptions).doc(subscriptionId).get();
  if (!snap.exists) fail("NOT_FOUND");
  if (caller.role !== "support" && snap.data()?.subscriberId !== caller.id) fail("PERMISSION_DENIED");
  if (!["active", "past_due"].includes(String(snap.data()?.status))) fail("INVALID_STATE");
  const cancelledAt = nowIso();
  await snap.ref.update({ status: "cancelled", cancelledAt, updatedAt: cancelledAt });
  await notify({
    userId: String(snap.data()?.subscriberId),
    category: "subscription",
    title: "Subscription cancelled",
    body: `Access until ${snap.data()?.currentPeriodEnd}`,
  });
  return {
    success: true,
    status: "cancelled" as const,
    cancelledAt,
    accessUntil: snap.data()?.currentPeriodEnd,
  };
}

