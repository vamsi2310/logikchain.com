import type { CallableRequest } from "firebase-functions/v2/https";
import type { Request } from "firebase-functions/v2/https";
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
  isAdmin?: boolean;
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

export const SUPER_ADMIN_EMAILS = new Set<string>([
  "vamsi2310@gmail.com",
  ...((process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)),
]);

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  return SUPER_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function isSuperAdmin(profile?: CallerProfile | null): boolean {
  if (!profile) return false;
  if (profile.isAdmin === true) return true;
  if (isSuperAdminEmail(profile.email)) return true;
  return false;
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
  const { auth, db } = await import("../admin");
  const userDocRef = db.collection(Col.UserProfiles).doc(uid);
  const snap = await userDocRef.get();

  let profileData: Record<string, unknown> | null = null;
  let userRecord: import("firebase-admin/auth").UserRecord | null = null;

  const getUserRecord = async () => {
    if (!userRecord) {
      userRecord = await auth.getUser(uid).catch(() => null);
    }
    return userRecord;
  };

  if (snap.exists) {
    profileData = snap.data() as Record<string, unknown>;
  } else {
    // Document not found by Auth UID. Look up Auth user and check fallback by email in Firestore.
    const rec = await getUserRecord();
    const email = rec?.email?.toLowerCase().trim();

    if (email) {
      // 1. Check if document exists with doc ID = email
      const emailDocSnap = await db.collection(Col.UserProfiles).doc(email).get();
      if (emailDocSnap.exists) {
        profileData = emailDocSnap.data() as Record<string, unknown>;
      } else {
        // 2. Check if document exists where email == user's email
        const querySnap = await db
          .collection(Col.UserProfiles)
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          profileData = querySnap.docs[0].data() as Record<string, unknown>;
        }
      }
    }

    if (!profileData && rec) {
      // Auto-provision profile for existing Firebase Auth user
      const isSuper = isSuperAdminEmail(email);
      profileData = {
        role: isSuper ? "support" : "buyer",
        status: "approved",
        email: rec.email,
        name: rec.displayName ?? (isSuper ? "Super Admin" : (email ? email.split("@")[0] : "User")),
        phone: rec.phoneNumber ?? null,
        isAdmin: isSuper ? true : false,
        createdAt: new Date().toISOString(),
      };
      await userDocRef.set(profileData, { merge: true }).catch(() => {});
    }
  }

  if (!profileData) {
    fail("NOT_FOUND", "Caller profile does not exist");
  }

  // Populate email from Auth if missing in profile document
  if (!profileData.email) {
    const rec = await getUserRecord();
    if (rec?.email) {
      profileData.email = rec.email;
    }
  }

  const profileEmail = (
    typeof profileData.email === "string" ? profileData.email : ""
  ).toLowerCase().trim();

  let isSuper = isSuperAdminEmail(profileEmail) || profileData.isAdmin === true;
  if (!isSuper) {
    const rec = await getUserRecord();
    if (rec?.email && isSuperAdminEmail(rec.email)) {
      isSuper = true;
      profileData.email = rec.email;
    }
  }

  if (isSuper) {
    profileData.role = "support";
    profileData.status = "approved";
    profileData.isAdmin = true;
  }

  // Default role and status if not set in Firestore
  const role = (profileData.role as UserRole) ?? "buyer";
  const status = (profileData.status as UserStatus) ?? "approved";

  const resolvedProfile: CallerProfile = {
    ...profileData,
    id: uid,
    role,
    status,
    ...(isSuper ? { isAdmin: true } : {}),
  } as CallerProfile;

  // Persist / sync document to UserProfiles/{uid} if it was missing or is super admin
  if (!snap.exists || isSuper) {
    await userDocRef.set(resolvedProfile, { merge: true }).catch(() => {});
  }

  // Sync custom user claims to Firebase Auth so tokens and claims match
  const rec = await getUserRecord();
  if (rec) {
    const currentClaims = rec.customClaims ?? {};
    const targetClaims: Record<string, unknown> = {
      role: resolvedProfile.role,
      status: resolvedProfile.status,
    };
    if (resolvedProfile.isAdmin) {
      targetClaims.isAdmin = true;
    }
    if (
      currentClaims.role !== targetClaims.role ||
      currentClaims.status !== targetClaims.status ||
      Boolean(currentClaims.isAdmin) !== Boolean(targetClaims.isAdmin)
    ) {
      await auth.setCustomUserClaims(uid, targetClaims).catch(() => {});
    }
  }

  return resolvedProfile;
}

export function assertApproved(
  profile: CallerProfile,
  operationId: string
): void {
  if (isSuperAdmin(profile)) return;
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
  if (isSuperAdmin(profile)) return;
  if (!roles.includes(profile.role)) {
    fail("PERMISSION_DENIED", `Permitted roles: ${roles.join(", ")}`);
  }
}

export function enforceOfficialClient(
  ctx: CallContext,
  profile: CallerProfile
): void {
  if (isSuperAdmin(profile)) return;
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
  const { auth } = await import("../admin");
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
