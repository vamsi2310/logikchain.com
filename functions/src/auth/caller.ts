import type { CallableRequest } from "firebase-functions/v2/https";
import type { Request } from "firebase-functions/v2/https";
import { auth, db } from "../admin";
import { Col } from "../collections";
import { fail } from "../errors";
import {
  CUSTODY_CARVE_OUT_OPS,
  VEHICLE_OFFICIAL_CLIENT_OPS,
  isEmulator,
  shouldEnforceAppCheck,
} from "../runtime";

export type UserRole = "buyer" | "merchant" | "vehicle" | "supplier" | "support";
export type UserStatus = "approved" | "unauthorized" | "suspended";

export interface CallerProfile {
  id: string;
  role: UserRole;
  status: UserStatus;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  shopDetails?: string;
  gstin?: string;
  villageId?: string;
  supplierId?: string;
  countryId?: string;
  selectedMerchantId?: string;
  activeSubscriptionId?: string;
  activeBeneficiaryId?: string;
  deviceTokens?: Array<{ token: string; platform: string; updatedAt: string }>;
  driverPay?: { baseTripAmount: number; perKm: number; perDelivery: number };
  suspension?: {
    scope?: string;
    suspendedBy?: string;
    custodyPlan?: { settlementOutstanding?: boolean; settlementId?: string };
  };
  [key: string]: unknown;
}

export interface CallContext {
  uid: string | null;
  profile: CallerProfile | null;
  appId: string | null;
  isPlayIntegrity: boolean;
  correlationId: string;
  operationId: string;
  data: Record<string, unknown>;
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

export function isAndroidAppCheck(appId?: string | null): boolean {
  return typeof appId === "string" && appId.includes(":android:");
}

export async function loadProfile(uid: string): Promise<CallerProfile> {
  const snap = await db.collection(Col.UserProfiles).doc(uid).get();
  if (!snap.exists) fail("NOT_FOUND", "Caller profile does not exist");
  return { id: uid, role: "buyer", status: "unauthorized", ...(snap.data() as object) } as CallerProfile;
}

export function assertApproved(
  profile: CallerProfile,
  operationId: string
): void {
  if (profile.status === "approved") return;
  const carveOut =
    CUSTODY_CARVE_OUT_OPS.has(operationId) &&
    profile.status === "suspended" &&
    profile.suspension?.custodyPlan?.settlementOutstanding === true;
  if (carveOut) return;
  if (profile.status === "suspended") {
    fail("USER_SUSPENDED", "Account is suspended");
  }
  fail("INVALID_STATE", "Caller status is not approved");
}

export function assertRoles(profile: CallerProfile, roles: UserRole[]): void {
  if (!roles.includes(profile.role)) {
    fail("PERMISSION_DENIED", `Permitted roles: ${roles.join(", ")}`);
  }
}

export function enforceOfficialClient(
  ctx: CallContext,
  profile: CallerProfile
): void {
  if (!VEHICLE_OFFICIAL_CLIENT_OPS.has(ctx.operationId)) return;
  if (profile.role !== "vehicle") return;
  if (isEmulator()) return;
  if (!ctx.isPlayIntegrity) {
    fail("CLIENT_NOT_OFFICIAL", "Play Integrity App Check is required for this job");
  }
}

export async function requireCaller(
  ctx: CallContext,
  opts?: { roles?: UserRole[]; allowMissingAuth?: boolean }
): Promise<CallerProfile> {
  if (!ctx.uid) {
    if (opts?.allowMissingAuth) {
      fail("UNAUTHENTICATED", "Bearer token required");
    }
    fail("UNAUTHENTICATED", "Bearer token required");
  }
  const profile = ctx.profile ?? (await loadProfile(ctx.uid));
  ctx.profile = profile;
  assertApproved(profile, ctx.operationId);
  if (opts?.roles) assertRoles(profile, opts.roles);
  enforceOfficialClient(ctx, profile);
  return profile;
}

export function contextFromCallable(
  req: CallableRequest<Record<string, unknown>>,
  operationId: string
): CallContext {
  if (shouldEnforceAppCheck() && !req.app) {
    fail("UNAUTHENTICATED", "App Check token missing or invalid");
  }
  const appId = req.app?.appId ?? null;
  return {
    uid: req.auth?.uid ?? null,
    profile: null,
    appId,
    isPlayIntegrity: isAndroidAppCheck(appId),
    correlationId:
      (typeof req.data?.correlationId === "string" && req.data.correlationId) ||
      `${operationId}:${Date.now()}`,
    operationId,
    data: (req.data ?? {}) as Record<string, unknown>,
    headers: (req.rawRequest?.headers ?? {}) as Record<string, string | string[] | undefined>,
  };
}

export async function verifyBearer(req: Request): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  const decoded = await auth.verifyIdToken(token);
  return decoded.uid;
}

export function appCheckFromRequest(req: Request): { appId: string | null; present: boolean } {
  const header = req.headers["x-firebase-appcheck"];
  const present = typeof header === "string" && header.length > 0;
  const appIdHeader = req.headers["x-firebase-appid"];
  const appId = typeof appIdHeader === "string" ? appIdHeader : null;
  return { appId, present };
}
