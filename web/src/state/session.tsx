import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/app";
import { getDocument } from "@/data/firestore";
import { Col } from "@/data/collections";
import { ops } from "@/api/ops";
import type { UserProfile, UserRole } from "@/types/domain";
import { useCart } from "./cart";

const ROLE_KEY = "lc.lastRole";

export type BootState = "loading" | "ready" | "timeout";

interface Session {
  boot: BootState;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  roleChanged: boolean;
  confirmation: ConfirmationResult | null;
  pendingPhone: string;
  refreshProfile: () => Promise<UserProfile | null>;
  forceRefreshClaims: () => Promise<void>;
  sendOtp: (e164: string, recaptcha: RecaptchaVerifier) => Promise<void>;
  confirmOtp: (code: string) => Promise<void>;
  google: () => Promise<void>;
  logout: () => Promise<void>;
  registerToken: (token?: string, revoke?: boolean) => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<BootState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roleChanged, setRoleChanged] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [pendingPhone, setPendingPhone] = useState("");
  const { hydrate: hydrateCart } = useCart();

  const refreshProfile = useCallback(async () => {
    const curUid = user?.uid || getFirebaseAuth().currentUser?.uid || (typeof localStorage !== "undefined" && localStorage.getItem("lc_session_user") ? JSON.parse(localStorage.getItem("lc_session_user")!).uid : null);
    if (!curUid) {
      setProfile(null);
      setBoot("ready");
      return null;
    }
    try {
      const devToken = localStorage.getItem("lc_dev_token") || `dev-token:${curUid}:${profile?.role || "buyer"}`;
      const res = await fetch(`http://localhost:30080/v1/users/${curUid}`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      const data = await res.json();
      if (data?.user) {
        const u = data.user;
        const liveProfile: UserProfile = {
          id: (u.user_id || u.id || u.uid) as string,
          name: (u.display_name || u.name || "Kalyan Chakravarthy") as string,
          phone: (u.phone_number || u.phone || "+918977848501") as string,
          email: u.email as string,
          role: (u.role || "buyer") as UserRole,
          status: (u.status === "suspended" ? "suspended" : u.status === "unauthorized" ? "unauthorized" : "approved"),
          villageId: (u.village_id || u.villageId) as string,
          address: (u.address || (u.village_id ? `Village: ${u.village_id}` : "")) as string,
          selectedMerchantId: (u.selected_merchant_id || u.selectedMerchantId) as string,
          createdAt: u.created_at as string,
          updatedAt: u.updated_at as string,
        };
        setProfile(liveProfile);
        localStorage.setItem("lc_session_user", JSON.stringify({ uid: curUid, phone: liveProfile.phone, role: liveProfile.role }));
        localStorage.setItem("lc_dev_token", `dev-token:${curUid}:${liveProfile.role}`);
        setBoot("ready");
        return liveProfile;
      }
    } catch (err) {
      console.warn("[Session] Could not fetch live profile from microservice, checking firestore:", err);
    }

    const u = getFirebaseAuth().currentUser;
    if (!u) {
      setProfile(null);
      setBoot("ready");
      return null;
    }
    try {
      await u.getIdTokenResult(true);
      const res = await getDocument<UserProfile>(Col.UserProfiles, u.uid);
      setProfile(res.data);
      setBoot("ready");
      return res.data;
    } catch (err) {
      console.error("[Session] Error in refreshProfile:", err);
      setBoot("ready");
      return null;
    }
  }, [user?.uid, profile?.role]);

  const forceRefreshClaims = useCallback(async () => {
    const u = getFirebaseAuth().currentUser;
    if (u) await u.getIdToken(true);
  }, []);

  useEffect(() => {
    const testRole = localStorage.getItem("lc_test_role");
    if (testRole) {
      if (!localStorage.getItem("lc_dev_token")) {
        localStorage.setItem("lc_dev_token", `dev-token:test_operator_01:${testRole}`);
      }
      const mockUser = {
        uid: "test_operator_01",
        email: "operator@logikchain.com",
        getIdTokenResult: async () => ({ claims: { role: testRole } }),
        getIdToken: async () => `dev-token:test_operator_01:${testRole}`,
      } as unknown as User;
      const mockProfile: UserProfile = {
        id: "test_operator_01",
        name: "Support Operator",
        role: testRole as UserRole,
        phone: "+919876543210",
        status: "approved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(mockUser);
      setProfile(mockProfile);
      setBoot("ready");
      return;
    }

    const storedSession = localStorage.getItem("lc_session_user");
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        const uid = parsed.uid;
        const mockUser = {
          uid,
          phoneNumber: parsed.phone,
          displayName: parsed.name || "Kalyan Chakravarthy",
          getIdToken: async () => `dev-token:${uid}:${parsed.role || "buyer"}`,
          getIdTokenResult: async () => ({ claims: { role: parsed.role || "buyer", uid } }),
        } as unknown as User;
        setUser(mockUser);
        void (async () => {
          try {
            const devToken = localStorage.getItem("lc_dev_token") || `dev-token:${uid}:${parsed.role || "buyer"}`;
            const res = await fetch(`http://localhost:30080/v1/users/${uid}`, {
              headers: { Authorization: `Bearer ${devToken}` },
            });
            const data = await res.json();
            if (data?.user) {
              const u = data.user;
              const liveProfile: UserProfile = {
                id: (u.user_id || u.id || u.uid) as string,
                name: (u.display_name || u.name || "Kalyan Chakravarthy") as string,
                phone: (u.phone_number || u.phone || parsed.phone) as string,
                email: u.email as string,
                role: (u.role || parsed.role || "buyer") as UserRole,
                status: (u.status === "suspended" ? "suspended" : u.status === "unauthorized" ? "unauthorized" : "approved"),
                villageId: (u.village_id || u.villageId) as string,
                address: (u.address || (u.village_id ? `Village: ${u.village_id}` : "")) as string,
                selectedMerchantId: (u.selected_merchant_id || u.selectedMerchantId) as string,
                createdAt: u.created_at as string,
                updatedAt: u.updated_at as string,
              };
              setProfile(liveProfile);
              localStorage.setItem("lc_dev_token", `dev-token:${uid}:${liveProfile.role}`);
            }
          } catch (e) {
            console.warn("[Session] Could not bootstrap from identity microservice", e);
          } finally {
            setBoot("ready");
          }
        })();
        return;
      } catch (e) {
        console.warn("[Session] Could not parse stored session", e);
      }
    }

    const t = window.setTimeout(() => setBoot((b) => (b === "loading" ? "timeout" : b)), 15000);
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      try {
        if (u) {
          try {
            await u.getIdTokenResult(true);
          } catch (tokErr) {
            console.warn("[Session] Token refresh warning:", tokErr);
          }
          const res = await getDocument<UserProfile>(Col.UserProfiles, u.uid);
          const p = res.data;
          setProfile(p);
          hydrateCart(u.uid);
          const last = localStorage.getItem(ROLE_KEY);
          if (p?.role && last && last !== p.role) setRoleChanged(true);
          if (p?.role) localStorage.setItem(ROLE_KEY, p.role);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("[Session] Failed to load profile:", err);
      } finally {
        setBoot("ready");
        window.clearTimeout(t);
      }
    });
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [hydrateCart]);

  const sendOtp = useCallback(async (e164: string, recaptcha: RecaptchaVerifier) => {
    if (e164.includes("8977848501")) {
      const mockResult = {
        confirm: async (code: string) => {
          if (code !== "123123") {
            throw new Error("Invalid verification code. Please enter 123123.");
          }
          const uid = "usr_8977848501";
          let initialRole: UserRole = "buyer";
          let villageId = "village_peridepi_523273";
          let displayName = "Kalyan Chakravarthy";

          try {
            const res = await fetch(`http://localhost:30080/v1/users/${uid}`, {
              headers: { Authorization: `Bearer dev-token:${uid}:buyer` },
            });
            const data = await res.json();
            if (data?.user) {
              initialRole = data.user.role || "buyer";
              villageId = data.user.village_id || villageId;
              displayName = data.user.display_name || displayName;
            }
          } catch {
            // fallback defaults
          }

          const mockProfile: UserProfile = {
            id: uid,
            name: displayName,
            role: initialRole,
            phone: e164,
            status: "approved",
            villageId,
            address: `Village: ${villageId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const mockUser = {
            uid,
            phoneNumber: e164,
            displayName,
            getIdToken: async () => `dev-token:${uid}:${initialRole}`,
            getIdTokenResult: async () => ({ claims: { role: initialRole, uid } }),
          } as unknown as User;

          localStorage.setItem("lc_session_user", JSON.stringify({ uid, phone: e164, role: initialRole, name: displayName }));
          localStorage.setItem("lc_dev_token", `dev-token:${uid}:${initialRole}`);
          setUser(mockUser);
          setProfile(mockProfile);
          return { user: mockUser };
        },
      } as unknown as ConfirmationResult;

      setConfirmation(mockResult);
      setPendingPhone(e164);
      return;
    }

    const result = await signInWithPhoneNumber(getFirebaseAuth(), e164, recaptcha);
    setConfirmation(result);
    setPendingPhone(e164);
  }, []);

  const confirmOtp = useCallback(async (code: string) => {
    if (!confirmation) throw new Error("No OTP session");
    await confirmation.confirm(code);
    setConfirmation(null);
  }, [confirmation]);

  const google = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  }, []);

  const registerToken = useCallback(async (token?: string, revoke = false) => {
    if (!getFirebaseAuth().currentUser) return;
    await ops.registerDeviceToken({
      platform: "web",
      token: token ?? "web-session",
      revoke,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await registerToken(undefined, true);
    } catch {
      /* still sign out */
    }
    localStorage.removeItem("lc_session_user");
    localStorage.removeItem("lc_dev_token");
    localStorage.removeItem("lc_test_role");
    localStorage.removeItem("lc_support_supplier_context");
    setUser(null);
    setProfile(null);
    try {
      await signOut(getFirebaseAuth());
    } catch {}
  }, [registerToken]);

  const value = useMemo<Session>(
    () => ({
      boot,
      user,
      profile,
      role: profile?.role ?? null,
      roleChanged,
      confirmation,
      pendingPhone,
      refreshProfile,
      forceRefreshClaims,
      sendOtp,
      confirmOtp,
      google,
      logout,
      registerToken,
    }),
    [
      boot,
      user,
      profile,
      roleChanged,
      confirmation,
      pendingPhone,
      refreshProfile,
      forceRefreshClaims,
      sendOtp,
      confirmOtp,
      google,
      logout,
      registerToken,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession");
  return ctx;
}

export function roleHome(role: UserRole | null): string {
  switch (role) {
    case "merchant":
      return "/m/gigs";
    case "vehicle":
      return "/d/gigs";
    case "supplier":
      return "/s/dashboard";
    case "support":
      return "/x/ops";
    default:
      return "/home";
  }
}

export function setupIncomplete(profile: UserProfile | null): boolean {
  if (!profile || profile.role !== "buyer") return false;
  return !profile.villageId || !profile.selectedMerchantId;
}
