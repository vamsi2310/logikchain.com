import { db } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { notify, notifyMany } from "../lib/notify";
import { randomDigits, randomId } from "../lib/crypto";
import { sendSms } from "../lib/sms";
import { nowIso } from "../lib/time";
import { requireNonEmpty } from "../lib/validate";
import { settlementLabel } from "../lib/custody";

export async function composeGig(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier"] });
  const title = requireNonEmpty(ctx.data.title, "title");
  const routeId = requireNonEmpty(ctx.data.routeId, "routeId");
  const vehicleId = requireNonEmpty(ctx.data.vehicleId, "vehicleId");
  const pamphletId = requireNonEmpty(ctx.data.pamphletId, "pamphletId");
  const merchantIds = ctx.data.merchantIds as string[] | undefined;
  if (!Array.isArray(merchantIds) || merchantIds.length === 0) {
    fail("INVALID_ARGUMENT", "merchantIds is empty");
  }

  const routeSnap = await db.collection(Col.Routes).doc(routeId).get();
  if (!routeSnap.exists) fail("NOT_FOUND", "Route not found");
  const route = routeSnap.data() as {
    supplierId: string;
    villages?: Array<{ villageId?: string; name?: string; location?: { latitude: number; longitude: number } }>;
    length?: number;
  };
  if (route.supplierId !== caller.id) fail("PERMISSION_DENIED");

  const driverSnap = await db.collection(Col.UserProfiles).doc(vehicleId).get();
  if (!driverSnap.exists) fail("NOT_FOUND", "vehicle profile not found");
  const driver = driverSnap.data() as { role: string; status: string; name?: string };
  if (driver.role !== "vehicle") fail("NOT_FOUND");
  if (driver.status !== "approved") fail("DRIVER_NOT_AVAILABLE", "Driver profile status is unapproved");

  const pamphletSnap = await db.collection(Col.Pamphlets).doc(pamphletId).get();
  if (!pamphletSnap.exists) fail("NOT_FOUND", "Pamphlet not found");

  if (!caller.activeSubscriptionId) fail("SUBSCRIPTION_REQUIRED");
  const sub = await db.collection(Col.PlatformSubscriptions).doc(caller.activeSubscriptionId).get();
  const planId = sub.data()?.planId as string | undefined;
  if (planId) {
    const plan = await db.collection(Col.SubscriptionPlans).doc(planId).get();
    const max = plan.data()?.maxGigsPerMonth as number | undefined;
    if (typeof max === "number") {
      const start = new Date();
      start.setDate(1);
      const existing = await db
        .collection(Col.Gigs)
        .where("supplierId", "==", caller.id)
        .where("createdAt", ">=", start.toISOString())
        .get();
      if (existing.size >= max) fail("PLAN_LIMIT_EXCEEDED");
    }
  }

  const routeVillages = route.villages ?? [];
  const villageIds: string[] = [];
  const villages = routeVillages.map((v) => {
    if (!v.villageId || !v.location) {
      fail("INVALID_STATE", "A Route village lacks villageId / location");
    }
    villageIds.push(v.villageId);
    return { villageId: v.villageId, name: v.name, location: v.location };
  });

  for (const merchantId of merchantIds) {
    const m = await db.collection(Col.UserProfiles).doc(merchantId).get();
    if (!m.exists) fail("NOT_FOUND", "A listed merchant not found");
    const md = m.data() as { role: string; status: string; supplierId?: string; villageId?: string };
    if (md.role !== "merchant" || md.status !== "approved" || md.supplierId !== caller.id) {
      fail("INVALID_STATE", "A listed merchant belongs to another supplier");
    }
    if (md.villageId && !villageIds.includes(md.villageId)) {
      fail("INVALID_STATE", "A listed merchant sits off-route");
    }
  }

  const gigId = randomId("gig");
  await db.collection(Col.Gigs).doc(gigId).set({
    title,
    routeId,
    vehicleId,
    driverName: driver.name ?? "",
    pamphletId,
    merchantIds,
    date: ctx.data.date ?? nowIso(),
    arrivingTimes: ctx.data.arrivingTimes ?? {},
    villages,
    villageIds,
    status: "created",
    currentVillageIndex: -1,
    currentVillageStatus: "none",
    assignedAt: nowIso(),
    routeLengthKm: route.length ?? 0,
    supplierId: caller.id,
    supplierName: caller.name ?? "",
    createdAt: nowIso(),
  });
  await notify({
    userId: vehicleId,
    category: "gig_assignment",
    title: "New gig assigned",
    body: title,
    deepLink: `/driver/gigs/${gigId}`,
  });
  return { success: true, gigId };
}

export async function startGig(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const snap = await db.collection(Col.Gigs).doc(gigId).get();
  if (!snap.exists) fail("NOT_FOUND", "Gig not found");
  const gig = snap.data() as { vehicleId: string; status: string };
  if (gig.vehicleId !== caller.id) fail("PERMISSION_DENIED", "Caller is not the assigned driver");
  if (gig.status !== "created") fail("INVALID_GIG_STATE", "Gig has already started or completed");
  const startedAt = nowIso();
  await snap.ref.update({
    status: "started",
    currentVillageIndex: 0,
    currentVillageStatus: "arriving",
    startedAt,
  });
  return { success: true, startedAt };
}

export async function updateGigLocation(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const index = ctx.data.currentVillageIndex as number;
  const status = ctx.data.currentVillageStatus as string;
  const snap = await db.collection(Col.Gigs).doc(gigId).get();
  if (!snap.exists) fail("NOT_FOUND", "Gig not found");
  const gig = snap.data() as {
    vehicleId: string;
    villages?: Array<{ villageId: string }>;
  };
  if (gig.vehicleId !== caller.id) fail("PERMISSION_DENIED");
  const villages = gig.villages ?? [];
  if (index < 0 || index >= villages.length) fail("INVALID_INDEX");
  await snap.ref.update({ currentVillageIndex: index, currentVillageStatus: status });
  if (status === "reached") {
    const villageId = villages[index].villageId;
    const orders = await db
      .collection(Col.Orders)
      .where("gigId", "==", gigId)
      .where("village", "==", villageId)
      .where("deliveryStatus", "==", "placed")
      .get();
    const batch = db.batch();
    const buyers: string[] = [];
    for (const doc of orders.docs) {
      batch.update(doc.ref, { deliveryStatus: "reached_merchant" });
      buyers.push(doc.data().buyer);
    }
    await batch.commit();
    await notifyMany(buyers, {
      category: "gig_arrival",
      title: "Your order has reached the merchant",
      body: "The gig has reached your village.",
    });
  }
  return { success: true };
}

async function openCashSettlementForGig(gig: FirebaseFirestore.DocumentData, gigId: string) {
  const entries = await db
    .collection(Col.CashLedgerEntries)
    .where("gigId", "==", gigId)
    .where("holderId", "==", gig.vehicleId)
    .where("status", "==", "in_custody")
    .get();
  if (entries.empty) return { settlementId: undefined as string | undefined, cashToHandOver: 0 };
  const breakdownMap = new Map<string, number>();
  let sum = 0;
  for (const doc of entries.docs) {
    const amt = Number(doc.data().amount ?? 0);
    sum += amt;
    const source = String(doc.data().source ?? "other");
    breakdownMap.set(source, (breakdownMap.get(source) ?? 0) + amt);
  }
  if (sum <= 0) return { settlementId: undefined, cashToHandOver: 0 };
  const settlementId = randomId("stl");
  const breakdown = [...breakdownMap.entries()].map(([source, amount]) => ({
    source,
    amount,
    label: settlementLabel(source),
  }));
  await db.collection(Col.CashSettlements).doc(settlementId).set({
    gigId,
    supplierId: gig.supplierId,
    driverId: gig.vehicleId,
    status: "pending",
    expectedAmount: sum,
    breakdown,
    ledgerEntryIds: entries.docs.map((d) => d.id),
    openedAt: nowIso(),
    createdAt: nowIso(),
  });
  const code = randomDigits(6);
  await db
    .collection(Col.CashSettlements)
    .doc(settlementId)
    .collection("private")
    .doc("code")
    .set({ code, sendCount: 1, failedAttempts: 0, lastSentAt: nowIso() });
  await db.collection(Col.CashSettlements).doc(settlementId).update({
    settlementCodeIssuedAt: nowIso(),
  });
  await db.collection(Col.DriverEarnings).doc(gig.vehicleId).update({
    openSettlementIds: [...((await db.collection(Col.DriverEarnings).doc(gig.vehicleId).get()).data()?.openSettlementIds ?? []), settlementId],
  });
  const supplier = await db.collection(Col.UserProfiles).doc(gig.supplierId).get();
  if (supplier.data()?.phone) {
    await sendSms(String(supplier.data()?.phone), `Logikchain settlement code: ${code}`);
  }
  await notifyMany([gig.vehicleId, gig.supplierId], {
    category: "cash_custody",
    title: "Cash settlement opened",
    body: `Expected handover: ₹${sum}`,
  });
  return { settlementId, cashToHandOver: sum };
}

export async function completeAndFinalizeGig(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["vehicle", "supplier", "support"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const snap = await db.collection(Col.Gigs).doc(gigId).get();
  if (!snap.exists) fail("NOT_FOUND", "Gig not found");
  const gig = snap.data() as {
    status: string;
    vehicleId: string;
    supplierId: string;
    villages?: unknown[];
    routeLengthKm?: number;
  };
  if (caller.role === "vehicle" && gig.vehicleId !== caller.id) fail("PERMISSION_DENIED");
  if (caller.role === "supplier" && gig.supplierId !== caller.id) fail("PERMISSION_DENIED");
  if (gig.status === "completed") fail("ALREADY_COMPLETED");
  if (gig.status !== "started") fail("INVALID_GIG_STATE");

  const pending = await db
    .collection(Col.Orders)
    .where("gigId", "==", gigId)
    .where("deliveryStatus", "in", ["placed", "reached_merchant"])
    .get();
  if (!pending.empty) fail("PENDING_DELIVERIES");

  const openTransfers = await db
    .collection(Col.CustodyTransfers)
    .where("gigId", "==", gigId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!openTransfers.empty) fail("VERIFICATION_REQUIRED");

  const supplierSnap = await db.collection(Col.UserProfiles).doc(gig.supplierId).get();
  const driverPay = supplierSnap.data()?.driverPay as
    | { baseTripAmount: number; perKm: number; perDelivery: number }
    | undefined;
  if (!driverPay) fail("INVALID_STATE", "Supplier has no driverPay rates");

  const delivered = await db
    .collection(Col.Orders)
    .where("gigId", "==", gigId)
    .where("deliveryStatus", "==", "delivered")
    .get();
  const deliveredOrderCount = delivered.size;
  const totalEarnings =
    driverPay.baseTripAmount +
    (gig.routeLengthKm ?? 0) * driverPay.perKm +
    deliveredOrderCount * driverPay.perDelivery;

  await snap.ref.update({
    status: "completed",
    currentVillageIndex: (gig.villages ?? []).length,
    currentVillageStatus: "none",
    completedAt: nowIso(),
  });

  const earnRef = db.collection(Col.DriverEarnings).doc(gig.vehicleId);
  await db.runTransaction(async (tx) => {
    const e = await tx.get(earnRef);
    const data = e.data() ?? { totalEarnings: 0, pendingDues: 0, payments: [] };
    tx.set(
      earnRef,
      {
        totalEarnings: Number(data.totalEarnings ?? 0) + totalEarnings,
        pendingDues: Number(data.pendingDues ?? 0) + totalEarnings,
        payments: [
          ...(data.payments ?? []),
          {
            gigId,
            amount: totalEarnings,
            status: "pending",
            heads: {
              baseTripAmount: driverPay.baseTripAmount,
              perKm: driverPay.perKm,
              perDelivery: driverPay.perDelivery,
            },
            recordedAt: nowIso(),
          },
        ],
      },
      { merge: true }
    );
  });

  const settlement = await openCashSettlementForGig(gig, gigId);
  return {
    success: true,
    totalEarnings,
    settlementId: settlement.settlementId,
    cashToHandOver: settlement.cashToHandOver,
  };
}

export async function suspendGig(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const snap = await db.collection(Col.Gigs).doc(gigId).get();
  if (!snap.exists) fail("NOT_FOUND", "Gig not found");
  const gig = snap.data() as { supplierId: string; status: string; vehicleId: string };
  if (caller.role === "supplier" && gig.supplierId !== caller.id) fail("PERMISSION_DENIED");
  if (gig.status !== "created" && gig.status !== "started") {
    fail("INVALID_GIG_STATE", "Gig is already completed or already suspended");
  }
  const suspendedAt = nowIso();
  await snap.ref.update({ status: "suspended", suspensionReason: reason, suspendedAt });
  const orders = await db
    .collection(Col.Orders)
    .where("gigId", "==", gigId)
    .where("deliveryStatus", "in", ["placed", "reached_merchant"])
    .get();
  const batch = db.batch();
  const suspendedOrderIds: string[] = [];
  const buyers: string[] = [];
  for (const doc of orders.docs) {
    batch.update(doc.ref, { deliveryStatus: "suspended", suspensionReason: reason });
    suspendedOrderIds.push(doc.id);
    buyers.push(doc.data().buyer);
  }
  await batch.commit();
  const settlement = await openCashSettlementForGig(gig, gigId);
  await notifyMany([gig.vehicleId, ...buyers], {
    category: "gig_suspension",
    title: "Gig suspended",
    body: reason,
  });
  if (settlement.settlementId) {
    await notifyMany([gig.vehicleId, gig.supplierId], {
      category: "cash_custody",
      title: "Settlement opened for interrupted gig",
      body: `Expected handover: ₹${settlement.cashToHandOver}`,
    });
  }
  return { success: true, suspendedAt, suspendedOrderIds };
}

export async function reassignGigDriver(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["supplier", "support"] });
  const gigId = requireNonEmpty(ctx.data.gigId, "gigId");
  const vehicleId = requireNonEmpty(ctx.data.vehicleId, "vehicleId");
  const gigSnap = await db.collection(Col.Gigs).doc(gigId).get();
  if (!gigSnap.exists) fail("NOT_FOUND", "Gig not found");
  const gig = gigSnap.data() as {
    supplierId: string;
    status: string;
    vehicleId: string;
    currentVillageIndex?: number;
    villages?: Array<{ villageId: string }>;
  };
  if (caller.role === "supplier" && gig.supplierId !== caller.id) fail("PERMISSION_DENIED");
  if (gig.status !== "suspended") fail("INVALID_GIG_STATE", 'Gig is not in "suspended" status');
  if (gig.vehicleId === vehicleId) fail("INVALID_ARGUMENT", "Replacement driver is already assigned");

  const driverSnap = await db.collection(Col.UserProfiles).doc(vehicleId).get();
  if (!driverSnap.exists) fail("NOT_FOUND", "Replacement driver profile not found");
  const driver = driverSnap.data() as { role: string; status: string; name?: string };
  if (driver.role !== "vehicle" || driver.status !== "approved") fail("DRIVER_NOT_AVAILABLE");

  const resumeVillageIndex = gig.currentVillageIndex ?? -1;
  const nextStatus = resumeVillageIndex >= 0 ? "started" : "created";
  await gigSnap.ref.update({
    vehicleId,
    driverName: driver.name ?? "",
    status: nextStatus,
    currentVillageStatus: resumeVillageIndex >= 0 ? "arriving" : "none",
    suspensionReason: null,
    suspendedAt: null,
  });

  const orders = await db
    .collection(Col.Orders)
    .where("gigId", "==", gigId)
    .where("deliveryStatus", "==", "suspended")
    .get();
  const batch = db.batch();
  const buyers: string[] = [];
  for (const doc of orders.docs) {
    const village = doc.data().village as string;
    const idx = (gig.villages ?? []).findIndex((v) => v.villageId === village);
    const deliveryStatus = idx >= 0 && idx <= resumeVillageIndex ? "reached_merchant" : "placed";
    batch.update(doc.ref, { deliveryStatus, suspensionReason: null });
    buyers.push(doc.data().buyer);
  }
  await batch.commit();
  await notify({
    userId: vehicleId,
    category: "gig_assignment",
    title: "Gig reassigned to you",
    body: `Resume at village index ${resumeVillageIndex}`,
    deepLink: `/driver/gigs/${gigId}`,
  });
  await notifyMany(buyers, {
    category: "order_status",
    title: "Your order is moving again",
    body: "A replacement driver has been assigned.",
  });
  return { success: true, gigId, driverName: driver.name ?? "", resumeVillageIndex };
}
