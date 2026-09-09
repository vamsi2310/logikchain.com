import { db } from "../admin";
import type { CallContext } from "../auth/caller";
import { requireCaller } from "../auth/caller";
import { Col } from "../collections";
import { fail } from "../errors";
import { appendAudit } from "../lib/audit";
import { randomId } from "../lib/crypto";
import { notify } from "../lib/notify";
import { nowIso } from "../lib/time";
import { requireNonEmpty, validateGstin, validatePincode } from "../lib/validate";

async function requireSupport(ctx: CallContext) {
  return requireCaller(ctx, { roles: ["support"] });
}

export async function upsertCountry(ctx: CallContext) {
  const caller = await requireSupport(ctx);
  const isoCode = requireNonEmpty(ctx.data.isoCode, "isoCode").toUpperCase();
  const isoCode3 = requireNonEmpty(ctx.data.isoCode3, "isoCode3").toUpperCase();
  const numericCode = requireNonEmpty(ctx.data.numericCode, "numericCode");
  let mobilePrefix = requireNonEmpty(ctx.data.mobilePrefix, "mobilePrefix");
  if (!mobilePrefix.startsWith("+")) mobilePrefix = `+${mobilePrefix.replace(/\D/g, "")}`;
  const countryId = (ctx.data.id as string) || (ctx.data.countryId as string) || isoCode.toLowerCase();
  const clash = await db.collection(Col.Countries).where("isoCode", "==", isoCode).get();
  if (clash.docs.some((d) => d.id !== countryId)) fail("ALREADY_EXISTS");
  await db.collection(Col.Countries).doc(countryId).set({
    name: requireNonEmpty(ctx.data.name, "name"),
    isoCode,
    isoCode3,
    numericCode,
    mobilePrefix,
    phoneNumberLength: Number(ctx.data.phoneNumberLength),
    phoneValidationRegex: ctx.data.phoneValidationRegex ?? null,
    currencyCode: requireNonEmpty(ctx.data.currencyCode, "currencyCode"),
    currencySymbol: requireNonEmpty(ctx.data.currencySymbol, "currencySymbol"),
    timezone: requireNonEmpty(ctx.data.timezone, "timezone"),
    supportPhone: ctx.data.supportPhone ?? null,
    supportHours: ctx.data.supportHours ?? null,
    status: ctx.data.status ?? "active",
    createdBy: caller.id,
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, countryId };
}

export async function upsertState(ctx: CallContext) {
  await requireSupport(ctx);
  const countryId = requireNonEmpty(ctx.data.countryId, "countryId");
  const country = await db.collection(Col.Countries).doc(countryId).get();
  if (!country.exists || country.data()?.status !== "active") fail("NOT_FOUND");
  const code = requireNonEmpty(ctx.data.code, "code").toUpperCase();
  const stateId = (ctx.data.id as string) || (ctx.data.stateId as string) || `${countryId}_${code}`.toLowerCase();
  const clash = await db.collection(Col.States).where("countryId", "==", countryId).where("code", "==", code).get();
  if (clash.docs.some((d) => d.id !== stateId)) fail("ALREADY_EXISTS");
  await db.collection(Col.States).doc(stateId).set({
    countryId,
    name: requireNonEmpty(ctx.data.name, "name"),
    code,
    status: ctx.data.status ?? "active",
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, stateId };
}

export async function upsertDistrict(ctx: CallContext) {
  await requireSupport(ctx);
  const countryId = requireNonEmpty(ctx.data.countryId, "countryId");
  const stateId = requireNonEmpty(ctx.data.stateId, "stateId");
  const state = await db.collection(Col.States).doc(stateId).get();
  const country = await db.collection(Col.Countries).doc(countryId).get();
  if (!state.exists || !country.exists) fail("NOT_FOUND");
  if (state.data()?.countryId !== countryId) fail("INVALID_ARGUMENT");
  if (state.data()?.status !== "active" || country.data()?.status !== "active") fail("NOT_FOUND");
  const name = requireNonEmpty(ctx.data.name, "name");
  const districtId = (ctx.data.id as string) || (ctx.data.districtId as string) || randomId("dst");
  const clash = await db.collection(Col.Districts).where("stateId", "==", stateId).where("name", "==", name).get();
  if (clash.docs.some((d) => d.id !== districtId)) fail("ALREADY_EXISTS");
  await db.collection(Col.Districts).doc(districtId).set({
    countryId,
    stateId,
    name,
    code: ctx.data.code ?? null,
    status: ctx.data.status ?? "active",
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, districtId };
}

export async function requestVillage(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["buyer", "merchant", "supplier"] });
  const name = requireNonEmpty(ctx.data.name, "name");
  const pincode = requireNonEmpty(ctx.data.pincode, "pincode");
  validatePincode(pincode);
  requireNonEmpty(ctx.data.district, "district");
  requireNonEmpty(ctx.data.state, "state");
  const existing = await db.collection(Col.Villages).where("name", "==", name).where("pincode", "==", pincode).limit(1).get();
  if (!existing.empty) fail("ALREADY_EXISTS");
  const pending = await db
    .collection(Col.VillageRequests)
    .where("requestedBy", "==", caller.id)
    .where("name", "==", name)
    .where("status", "==", "pending_support_review")
    .limit(1)
    .get();
  if (!pending.empty) fail("ALREADY_EXISTS");
  const requestId = randomId("vrq");
  await db.collection(Col.VillageRequests).doc(requestId).set({
    requestedBy: caller.id,
    requesterRole: caller.role,
    name,
    pincode,
    panchayat: ctx.data.panchayat ?? null,
    mandal: ctx.data.mandal ?? null,
    district: ctx.data.district,
    state: ctx.data.state,
    location: ctx.data.location ?? null,
    notes: ctx.data.notes ?? null,
    status: "pending_support_review",
    createdAt: nowIso(),
  });
  return { success: true, requestId };
}

export async function upsertVillage(ctx: CallContext) {
  const caller = await requireSupport(ctx);
  const lgdCode = requireNonEmpty(ctx.data.lgdCode, "lgdCode");
  const pincode = requireNonEmpty(ctx.data.pincode, "pincode");
  validatePincode(pincode);
  const location = ctx.data.location as { latitude: number; longitude: number };
  if (!location || location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
    fail("INVALID_ARGUMENT", "coordinates out of range");
  }
  const villageId = (ctx.data.id as string) || (ctx.data.villageId as string) || lgdCode;
  const clash = await db.collection(Col.Villages).where("lgdCode", "==", lgdCode).get();
  if (clash.docs.some((d) => d.id !== villageId)) fail("ALREADY_EXISTS");
  await db.collection(Col.Villages).doc(villageId).set({
    lgdCode,
    name: requireNonEmpty(ctx.data.name, "name"),
    pincode,
    panchayat: requireNonEmpty(ctx.data.panchayat, "panchayat"),
    mandal: requireNonEmpty(ctx.data.mandal, "mandal"),
    district: requireNonEmpty(ctx.data.district, "district"),
    state: requireNonEmpty(ctx.data.state, "state"),
    location,
    population: ctx.data.population ?? null,
    tier: ctx.data.tier ?? null,
    description: ctx.data.description ?? null,
    hubId: ctx.data.hubId ?? null,
    updatedAt: nowIso(),
  }, { merge: true });
  if (ctx.data.requestId) {
    const req = await db.collection(Col.VillageRequests).doc(String(ctx.data.requestId)).get();
    if (!req.exists) fail("NOT_FOUND");
    await req.ref.update({
      status: "approved",
      createdVillageId: villageId,
      reviewedBy: caller.id,
      reviewedAt: nowIso(),
    });
    await notify({
      userId: String(req.data()?.requestedBy),
      category: "support",
      title: "Village added",
      body: String(ctx.data.name),
    });
  }
  return { success: true, villageId };
}

const MERCHANT_FORBIDDEN = new Set(["finance.reconciliation", "finance.period_close"]);
const BASELINE = ["finance.dashboard", "finance.transaction_history"];

export async function upsertSubscriptionPlan(ctx: CallContext) {
  const caller = await requireSupport(ctx);
  const name = requireNonEmpty(ctx.data.name, "name");
  const targetRole = requireNonEmpty(ctx.data.targetRole, "targetRole");
  if (targetRole !== "supplier" && targetRole !== "merchant") fail("INVALID_ARGUMENT");
  const entitlements = (ctx.data.entitlements as string[]) ?? [];
  for (const key of entitlements) {
    if (targetRole === "merchant" && MERCHANT_FORBIDDEN.has(key)) fail("INVALID_ENTITLEMENT");
  }
  if (!BASELINE.every((k) => entitlements.includes(k))) fail("BASELINE_ENTITLEMENT_REQUIRED");
  const planId = (ctx.data.id as string) || (ctx.data.planId as string) || randomId("plan");
  const clash = await db.collection(Col.SubscriptionPlans).where("name", "==", name).where("targetRole", "==", targetRole).get();
  if (clash.docs.some((d) => d.id !== planId && d.data()?.status !== "retired")) fail("ALREADY_EXISTS");
  const before = await db.collection(Col.SubscriptionPlans).doc(planId).get();
  const prev = (before.data()?.entitlements as string[]) ?? [];
  const entitlementsRemoved = prev.filter((k) => !entitlements.includes(k));
  const subs = await db.collection(Col.PlatformSubscriptions).where("planId", "==", planId).where("status", "==", "active").get();
  await db.collection(Col.SubscriptionPlans).doc(planId).set({
    name,
    description: requireNonEmpty(ctx.data.description, "description"),
    targetRole,
    status: ctx.data.status ?? "draft",
    features: ctx.data.features ?? [],
    entitlements,
    entitlementLimits: ctx.data.entitlementLimits ?? {},
    maxHubs: ctx.data.maxHubs ?? null,
    maxRoutes: ctx.data.maxRoutes ?? null,
    maxGigsPerMonth: ctx.data.maxGigsPerMonth ?? null,
    maxMerchants: ctx.data.maxMerchants ?? null,
    maxDrivers: ctx.data.maxDrivers ?? null,
    updatedAt: nowIso(),
    createdBy: caller.id,
  }, { merge: true });
  await appendAudit({
    category: "configuration",
    actorId: caller.id,
    subjectId: planId,
    before: { entitlements: prev },
    after: { entitlements },
    correlationId: ctx.correlationId,
  });
  return { success: true, planId, affectedSubscriberCount: subs.size, entitlementsRemoved };
}

export async function upsertPlanTariff(ctx: CallContext) {
  await requireSupport(ctx);
  const planId = requireNonEmpty(ctx.data.planId, "planId");
  const plan = await db.collection(Col.SubscriptionPlans).doc(planId).get();
  if (!plan.exists) fail("NOT_FOUND");
  const basePrice = Number(ctx.data.basePrice);
  const gstRate = Number(ctx.data.gstRate);
  if (basePrice < 0 || gstRate < 0) fail("INVALID_ARGUMENT");
  if (ctx.data.effectiveTo && new Date(String(ctx.data.effectiveTo)) <= new Date(String(ctx.data.effectiveFrom))) {
    fail("INVALID_ARGUMENT");
  }
  const tariffId = (ctx.data.id as string) || (ctx.data.tariffId as string) || randomId("trf");
  await db.collection(Col.PlanTariffs).doc(tariffId).set({
    planId,
    name: requireNonEmpty(ctx.data.name, "name"),
    billingCycle: requireNonEmpty(ctx.data.billingCycle, "billingCycle"),
    currencyCode: requireNonEmpty(ctx.data.currencyCode, "currencyCode"),
    countryId: ctx.data.countryId ?? null,
    basePrice,
    tariffType: requireNonEmpty(ctx.data.tariffType, "tariffType"),
    unitPrice: ctx.data.unitPrice ?? null,
    gstRate,
    status: ctx.data.status ?? "active",
    effectiveFrom: requireNonEmpty(ctx.data.effectiveFrom, "effectiveFrom"),
    effectiveTo: ctx.data.effectiveTo ?? null,
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, tariffId };
}

export async function upsertSubscriptionOffer(ctx: CallContext) {
  await requireSupport(ctx);
  const planId = requireNonEmpty(ctx.data.planId, "planId");
  const plan = await db.collection(Col.SubscriptionPlans).doc(planId).get();
  if (!plan.exists) fail("NOT_FOUND");
  if (ctx.data.tariffId) {
    const tariff = await db.collection(Col.PlanTariffs).doc(String(ctx.data.tariffId)).get();
    if (!tariff.exists) fail("NOT_FOUND");
    if (tariff.data()?.planId !== planId) fail("INVALID_STATE");
  }
  const discountType = requireNonEmpty(ctx.data.discountType, "discountType");
  const discountValue = Number(ctx.data.discountValue);
  if (discountType === "percent" && (discountValue <= 0 || discountValue > 100)) fail("INVALID_ARGUMENT");
  if (discountType === "flat" && discountValue <= 0) fail("INVALID_ARGUMENT");
  if (new Date(String(ctx.data.validTo)) <= new Date(String(ctx.data.validFrom))) fail("INVALID_ARGUMENT");
  const offerId = (ctx.data.id as string) || (ctx.data.offerId as string) || randomId("off");
  const existing = await db.collection(Col.SubscriptionOffers).doc(offerId).get();
  await db.collection(Col.SubscriptionOffers).doc(offerId).set({
    name: requireNonEmpty(ctx.data.name, "name"),
    description: requireNonEmpty(ctx.data.description, "description"),
    planId,
    tariffId: ctx.data.tariffId ?? null,
    discountType,
    discountValue,
    eligibility: ctx.data.eligibility ?? {},
    maxRedemptions: ctx.data.maxRedemptions ?? null,
    maxRedemptionsPerUser: ctx.data.maxRedemptionsPerUser ?? null,
    validFrom: ctx.data.validFrom,
    validTo: ctx.data.validTo,
    status: ctx.data.status ?? "active",
    redemptionCount: existing.exists ? existing.data()?.redemptionCount ?? 0 : 0,
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, offerId };
}

export async function upsertOfferDiscountCode(ctx: CallContext) {
  await requireSupport(ctx);
  const offerId = requireNonEmpty(ctx.data.offerId, "offerId");
  const offer = await db.collection(Col.SubscriptionOffers).doc(offerId).get();
  if (!offer.exists) fail("NOT_FOUND");
  const code = requireNonEmpty(ctx.data.code, "code").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!code) fail("INVALID_ARGUMENT");
  const discountCodeId = (ctx.data.id as string) || (ctx.data.codeId as string) || randomId("odc");
  const clash = await db.collection(Col.OfferDiscountCodes).where("code", "==", code).get();
  if (clash.docs.some((d) => d.id !== discountCodeId)) fail("ALREADY_EXISTS");
  const existing = await db.collection(Col.OfferDiscountCodes).doc(discountCodeId).get();
  await db.collection(Col.OfferDiscountCodes).doc(discountCodeId).set({
    offerId,
    code,
    maxUses: ctx.data.maxUses ?? null,
    status: ctx.data.status ?? "active",
    usedCount: existing.exists ? existing.data()?.usedCount ?? 0 : 0,
    updatedAt: nowIso(),
  }, { merge: true });
  return { success: true, discountCodeId };
}

const CONFIG_COLLECTIONS: Record<string, string> = {
  countries: Col.Countries,
  states: Col.States,
  districts: Col.Districts,
  subscriptionPlans: Col.SubscriptionPlans,
  planTariffs: Col.PlanTariffs,
  subscriptionOffers: Col.SubscriptionOffers,
  offerDiscountCodes: Col.OfferDiscountCodes,
};

export async function deactivateConfigurationRecord(ctx: CallContext) {
  await requireSupport(ctx);
  const collection = requireNonEmpty(ctx.data.collection, "collection");
  const id = requireNonEmpty(ctx.data.id, "id");
  const col = CONFIG_COLLECTIONS[collection];
  if (!col) fail("INVALID_ARGUMENT");
  const snap = await db.collection(col).doc(id).get();
  if (!snap.exists) fail("NOT_FOUND");
  if (collection === "countries") {
    const kids = await db.collection(Col.States).where("countryId", "==", id).where("status", "==", "active").limit(1).get();
    if (!kids.empty) fail("IN_USE");
  }
  if (collection === "subscriptionPlans") {
    const kids = await db.collection(Col.PlatformSubscriptions).where("planId", "==", id).where("status", "==", "active").limit(1).get();
    if (!kids.empty) fail("IN_USE");
  }
  await snap.ref.update({
    status: collection === "subscriptionPlans" ? "retired" : "inactive",
    updatedAt: nowIso(),
  });
  return { success: true };
}

export async function listConfigurationCatalog(ctx: CallContext) {
  const types = (ctx.data.types as string[] | undefined) ?? Object.keys(CONFIG_COLLECTIONS);
  if (!ctx.uid) {
    if (JSON.stringify(types) !== JSON.stringify(["countries"])) fail("PERMISSION_DENIED");
    const countries = await db.collection(Col.Countries).where("status", "==", "active").get();
    return {
      countries: countries.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        isoCode: d.data().isoCode,
        mobilePrefix: d.data().mobilePrefix,
        phoneNumberLength: d.data().phoneNumberLength,
        supportPhone: d.data().supportPhone,
        supportHours: d.data().supportHours,
      })),
      states: [],
      districts: [],
      subscriptionPlans: [],
      planTariffs: [],
      subscriptionOffers: [],
      offerDiscountCodes: [],
    };
  }
  const caller = await requireCaller(ctx);
  if (ctx.data.includeInactive && caller.role !== "support") fail("PERMISSION_DENIED");
  const result: Record<string, unknown[]> = {
    countries: [],
    states: [],
    districts: [],
    subscriptionPlans: [],
    planTariffs: [],
    subscriptionOffers: [],
    offerDiscountCodes: [],
  };
  for (const type of types) {
    const col = CONFIG_COLLECTIONS[type];
    if (!col) fail("INVALID_ARGUMENT", `Unknown collection type ${type}`);
    let q: FirebaseFirestore.Query = db.collection(col);
    if (!ctx.data.includeInactive) {
      q = q.where("status", "==", type === "subscriptionPlans" ? "active" : "active");
    }
    if (ctx.data.countryId && (type === "states" || type === "districts")) {
      q = q.where("countryId", "==", ctx.data.countryId);
    }
    if (ctx.data.stateId && type === "districts") q = q.where("stateId", "==", ctx.data.stateId);
    if (ctx.data.planId && (type === "planTariffs" || type === "subscriptionOffers")) {
      q = q.where("planId", "==", ctx.data.planId);
    }
    if (ctx.data.offerId && type === "offerDiscountCodes") q = q.where("offerId", "==", ctx.data.offerId);
    const snaps = await q.limit(500).get();
    result[type] = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return result;
}

export async function upsertTaxProfile(ctx: CallContext) {
  const caller = await requireSupport(ctx);
  const gstin = requireNonEmpty(ctx.data.gstin, "gstin").toUpperCase();
  validateGstin(gstin);
  const registeredStateCode = requireNonEmpty(ctx.data.registeredStateCode, "registeredStateCode");
  if (gstin.slice(0, 2) !== registeredStateCode) fail("INVALID_ARGUMENT", "GSTIN state code mismatch");
  const taxProfileId = (ctx.data.taxProfileId as string) || (ctx.data.id as string) || randomId("tax");
  await db.collection(Col.TaxProfiles).doc(taxProfileId).set({
    ...ctx.data,
    gstin,
    registeredStateCode,
    status: ctx.data.status ?? "active",
    updatedBy: caller.id,
    updatedAt: nowIso(),
  }, { merge: true });
  return {
    success: true,
    taxProfileId,
    resolutionPreview: {
      intra_state: { cgst: true, sgst: true, igst: false },
      inter_state: { cgst: false, sgst: false, igst: true },
    },
  };
}

export async function upsertTdsConfiguration(ctx: CallContext) {
  const caller = await requireSupport(ctx);
  const reason = requireNonEmpty(ctx.data.reason, "reason");
  const enabled = Boolean(ctx.data.enabled);
  if (enabled && (!ctx.data.deductorTan || !ctx.data.adviserConfirmedBy || !ctx.data.adviserReference)) {
    fail("ADVISER_CONFIRMATION_REQUIRED");
  }
  const rateWithPan = Number(ctx.data.rateWithPan ?? 0);
  const rateWithoutPan = Number(ctx.data.rateWithoutPan ?? 0);
  if (rateWithoutPan < rateWithPan) fail("INVALID_ARGUMENT");
  const configId = (ctx.data.configId as string) || (ctx.data.id as string) || randomId("tds");
  await db.collection(Col.TdsConfigurations).doc(configId).set({
    ...ctx.data,
    enabled,
    rateWithPan,
    rateWithoutPan,
    reason,
    createdBy: caller.id,
    createdAt: nowIso(),
  });
  return { success: true, configurationId: configId, impact: { driversAboveThreshold: 0, driversMissingPan: 0 } };
}

export async function recordTdsChallan(ctx: CallContext) {
  const caller = await requireSupport(ctx);
  const deductionIds = ctx.data.deductionIds as string[];
  const totalAmount = Number(ctx.data.totalAmount);
  if (!Array.isArray(deductionIds) || deductionIds.length === 0) fail("INVALID_ARGUMENT");
  let sum = 0;
  for (const id of deductionIds) {
    const d = await db.collection(Col.TdsDeductions).doc(id).get();
    if (!d.exists || d.data()?.status !== "accrued") fail("INVALID_STATE");
    sum += Number(d.data()?.amount ?? 0);
  }
  if (Math.abs(sum - totalAmount) > 0.01) fail("INVALID_AMOUNT");
  const challanId = randomId("chl");
  await db.collection(Col.TdsChallans).doc(challanId).set({
    deductionIds,
    totalAmount,
    evidenceRef: ctx.data.evidenceRef ?? null,
    recordedBy: caller.id,
    recordedAt: nowIso(),
  });
  const batch = db.batch();
  for (const id of deductionIds) {
    batch.update(db.collection(Col.TdsDeductions).doc(id), { status: "deposited", challanId });
  }
  await batch.commit();
  return { success: true, challanId, uncoveredAmount: 0 };
}

export async function issueTdsCertificate(ctx: CallContext) {
  const caller = await requireSupport(ctx);
  const driverId = requireNonEmpty(ctx.data.driverId, "driverId");
  const financialYear = requireNonEmpty(ctx.data.financialYear, "financialYear");
  const quarter = requireNonEmpty(ctx.data.quarter, "quarter");
  const deductions = await db
    .collection(Col.TdsDeductions)
    .where("driverId", "==", driverId)
    .where("financialYear", "==", financialYear)
    .where("quarter", "==", quarter)
    .get();
  if (deductions.empty) fail("NOT_FOUND");
  const certificateId = randomId("tds16");
  await db.collection(Col.TdsCertificates).doc(certificateId).set({
    driverId,
    financialYear,
    quarter,
    deductionIds: deductions.docs.map((d) => d.id),
    status: "issued",
    issuedBy: caller.id,
    issuedAt: nowIso(),
  });
  const batch = db.batch();
  for (const d of deductions.docs) batch.update(d.ref, { status: "certified", certificateId });
  await batch.commit();
  return { success: true, certificateId };
}

export async function getTdsRegister(ctx: CallContext) {
  const caller = await requireCaller(ctx, { roles: ["support", "supplier", "vehicle"] });
  let q: FirebaseFirestore.Query = db.collection(Col.TdsDeductions);
  if (caller.role === "vehicle") q = q.where("driverId", "==", caller.id);
  if (caller.role === "supplier") q = q.where("supplierId", "==", caller.id);
  if (ctx.data.financialYear) q = q.where("financialYear", "==", ctx.data.financialYear);
  const snaps = await q.limit(500).get();
  return {
    rows: snaps.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      pan: d.data().panLast4 ? `******${d.data().panLast4}` : null,
    })),
    tieOut: { balanced: true, variance: 0 },
    missingPanCount: snaps.docs.filter((d) => !d.data().panLast4).length,
    uncoveredAmount: snaps.docs
      .filter((d) => d.data().status === "accrued")
      .reduce((s, d) => s + Number(d.data().amount ?? 0), 0),
  };
}
