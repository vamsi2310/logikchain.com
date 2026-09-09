import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { env } from "@/config/env";
import { useI18n } from "@/state/locale";
import { useSession, roleHome, setupIncomplete } from "@/state/session";
import { AuthChrome } from "@/ui/Chrome";
import { Button } from "@/ui/primitives";

/** SHR-01 — used by every role app while claims bootstrap. */
export function SplashScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { boot, user, profile, roleChanged, refreshProfile } = useSession();

  useEffect(() => {
    if (boot === "loading") return;
    if (boot === "timeout") return;
    if (!user) {
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return;
    }
    if (profile?.status === "unauthorized" || profile?.status === "suspended") {
      if (window.location.pathname !== "/unauthorized") {
        window.location.replace("/unauthorized");
      }
      return;
    }
    if (roleChanged) {
      nav("/role-changed", { replace: true });
      return;
    }
    if (profile?.role === "buyer" && setupIncomplete(profile)) {
      nav("/setup", { replace: true });
      return;
    }
    const dest = roleHome(profile?.role ?? "buyer");
    if (window.location.pathname !== dest) {
      window.location.replace(dest);
    }
  }, [boot, user, profile, roleChanged, nav]);

  return (
    <AuthChrome speakText={`${t("appName")}. ${t("checkingAccount")}`}>
      <div className="hero">
        <button type="button" className="icon-btn" style={{ marginLeft: "auto" }} onClick={() => nav("/language")}>
          A/अ
        </button>
        <h1>{t("appName").toUpperCase()}</h1>
        <p className="muted">{t("tagline")}</p>
        {boot === "timeout" ? (
          <Button onClick={() => void refreshProfile()}>{t("retry")}</Button>
        ) : (
          <>
            <p className="dots">● ● ●</p>
            <p>{t("checkingAccount")}</p>
          </>
        )}
        <p className="muted">
          v{env.appVersion} · {t("worksOffline")}
        </p>
      </div>
    </AuthChrome>
  );
}
