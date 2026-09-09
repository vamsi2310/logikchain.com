import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession, roleHome } from "@/state/session";
import type { UserRole } from "@/types/domain";
import { SplashScreen } from "@/shared/SplashScreen";

export type RoleApp = "buyer" | "merchant" | "vehicle" | "supplier" | "support";

const APP_ROLE: Record<RoleApp, UserRole> = {
  buyer: "buyer",
  merchant: "merchant",
  vehicle: "vehicle",
  supplier: "supplier",
  support: "support",
};

export function prefixFor(role: UserRole | null): string {
  if (role === "merchant") return "/m";
  if (role === "vehicle") return "/d";
  if (role === "supplier") return "/s";
  if (role === "support") return "/x";
  return "";
}

function useAuthGate(allowSuspendedProfile: boolean, currentPrefix: string) {
  const { boot, user, profile } = useSession();
  const loc = useLocation();
  if (boot === "loading" || boot === "timeout") return <SplashScreen />;
  if (!user) {
    if (currentPrefix !== "") {
      window.location.replace("/login");
      return null;
    }
    return <Navigate to="/login" replace />;
  }
  if (profile?.status === "unauthorized" || profile?.status === "suspended") {
    if (allowSuspendedProfile && (loc.pathname === "/profile" || loc.pathname === "/unauthorized")) {
      return null;
    }
    if (currentPrefix !== "") {
      window.location.replace("/unauthorized");
      return null;
    }
    return <Navigate to="/unauthorized" replace />;
  }
  return null;
}

/** Shared account screens (profile, bell) — any approved role. */
export function AccountGuard({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const prefix = loc.pathname.startsWith("/x")
    ? "/x"
    : loc.pathname.startsWith("/s")
      ? "/s"
      : loc.pathname.startsWith("/m")
        ? "/m"
        : loc.pathname.startsWith("/d")
          ? "/d"
          : "";
  const block = useAuthGate(true, prefix);
  if (block) return block;
  return <>{children}</>;
}

/** Role app screens — caller must match this entry's role. */
export function Guard({ app, children }: { app: RoleApp; children: ReactNode }) {
  const { profile } = useSession();
  const appPrefix = prefixFor(APP_ROLE[app]);
  const block = useAuthGate(false, appPrefix);
  if (block) return block;
  const role = profile?.role ?? "buyer";
  if (role !== APP_ROLE[app]) {
    const dest = roleHome(role);
    window.location.replace(dest);
    return null;
  }
  return <>{children}</>;
}
