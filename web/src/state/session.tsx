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
  }, []);

  const forceRefreshClaims = useCallback(async () => {
    const u = getFirebaseAuth().currentUser;
    if (u) await u.getIdToken(true);
  }, []);

  useEffect(() => {
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
    await signOut(getFirebaseAuth());
    setProfile(null);
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
