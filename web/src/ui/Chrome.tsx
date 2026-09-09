import { useMemo, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { env } from "@/config/env";
import { useI18n } from "@/state/locale";
import { useOnline } from "@/state/offline";
import { useSession, roleHome } from "@/state/session";
import { useCart } from "@/state/cart";
import { Banner } from "./primitives";
import type { UserRole } from "@/types/domain";

const TABS: Record<UserRole, Array<{ to: string; key: string; icon: string }>> = {
  buyer: [
    { to: "/home", key: "home", icon: "🏠" },
    { to: "/cart", key: "cart", icon: "🛒" },
    { to: "/orders", key: "orders", icon: "📦" },
  ],
  merchant: [
    { to: "/m/gigs", key: "gigs", icon: "🚚" },
    { to: "/m/orders", key: "orders", icon: "📦" },
    { to: "/m/credit", key: "credit", icon: "💳" },
  ],
  vehicle: [
    { to: "/d/gigs", key: "gigs", icon: "🚚" },
    { to: "/d/tracking", key: "tracking", icon: "📍" },
    { to: "/d/earnings", key: "earnings", icon: "₹" },
  ],
  supplier: [
    { to: "/s/dashboard", key: "dashboard", icon: "▣" },
    { to: "/s/gigs", key: "gigs", icon: "🚚" },
    { to: "/s/inventory", key: "inventory", icon: "📦" },
    { to: "/s/finance", key: "finance", icon: "₹" },
  ],
  support: [
    { to: "/x/ops", key: "ops", icon: "▣" },
    { to: "/x/users", key: "users", icon: "👤" },
    { to: "/x/config", key: "config", icon: "⚙" },
    { to: "/x/search", key: "search", icon: "🔍" },
  ],
};

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(u);
}

export function Chrome({
  title,
  screenId,
  back,
  speakText,
  fab,
  children,
  unread = 0,
  noNav,
}: {
  title: string;
  screenId: string;
  back?: boolean;
  speakText?: string;
  fab?: { label: string; onClick: () => void };
  children: ReactNode;
  unread?: number;
  noNav?: boolean;
}) {
  const { t } = useI18n();
  const { online } = useOnline();
  const { profile } = useSession();
  const { count } = useCart();
  const nav = useNavigate();
  const role = profile?.role ?? "buyer";
  const tabs = TABS[role];
  const audioOn = profile?.permissions?.audio !== false;
  const supportXl = role === "support";

  const header = useMemo(
    () => (
      <header className="app-header">
        {back ? (
          <button className="icon-btn" type="button" onClick={() => nav(-1)} aria-label={t("back")}>
            ←
          </button>
        ) : null}
        <h1>{title}</h1>
        {env.alias !== "prod" ? <span className="env-chip">{env.alias}</span> : null}
        {audioOn ? (
          <button
            className="icon-btn"
            type="button"
            aria-label={t("speak")}
            onClick={() => speak(speakText ?? `${title}. ${t("appName")}`)}
          >
            🔊
          </button>
        ) : null}
        <button className="icon-btn" type="button" aria-label={t("bell")} onClick={() => nav("/notifications")}>
          🔔
          {unread > 0 ? <span className="badge">{unread > 99 ? "99+" : unread > 9 ? "9+" : unread}</span> : null}
        </button>
        <button className="icon-btn" type="button" aria-label={t("avatar")} onClick={() => nav("/profile")}>
          👤
        </button>
      </header>
    ),
    [audioOn, back, nav, speakText, t, title, unread],
  );

  const navBar = (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? "active" : "")}>
          <span aria-hidden>{tab.icon}</span>
          <span>
            {t(tab.key)}
            {tab.key === "cart" && count > 0 ? ` (${count})` : ""}
          </span>
        </NavLink>
      ))}
    </nav>
  );

  const body = (
    <>
      {header}
      {!online ? (
        <Banner onClick={() => nav("/sync")}>⚠ {t("offlineBanner")}</Banner>
      ) : null}
      <main className={`page ${noNav ? "no-nav" : ""} ${supportXl ? "wide" : ""}`} data-screen={screenId}>
        {children}
      </main>
      {fab ? (
        <button className="fab" type="button" aria-label={fab.label} onClick={fab.onClick}>
          +
        </button>
      ) : null}
      {!noNav && !supportXl ? navBar : null}
    </>
  );

  if (supportXl) {
    return (
      <div className="support-shell app-shell">
        <aside className="rail">
          <strong>{t("appName")}</strong>
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} style={{ padding: "12px 0", color: "inherit" }}>
              {tab.icon} {t(tab.key)}
            </NavLink>
          ))}
          <button type="button" className="btn btn-tertiary" onClick={() => nav(roleHome("support"))}>
            {t("ops")}
          </button>
        </aside>
        <div className="app-shell">{body}</div>
      </div>
    );
  }

  return <div className="app-shell">{body}</div>;
}

export function AuthChrome({ children, speakText }: { children: ReactNode; speakText?: string }) {
  const { t, locale } = useI18n();
  const nav = useNavigate();
  const { online } = useOnline();
  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="icon-btn" type="button" aria-label={t("speak")} onClick={() => speak(speakText ?? t("tagline"))}>
          🔊
        </button>
        <h1 />
        {env.alias !== "prod" ? <span className="env-chip">{env.alias}</span> : null}
        <button className="icon-btn" type="button" onClick={() => nav("/language")} aria-label={t("language")}>
          {locale === "en" ? "A/अ" : "अ"}
        </button>
      </header>
      {!online ? <Banner>⚠ {t("offlineBanner")}</Banner> : null}
      <main className="page no-nav">{children}</main>
    </div>
  );
}
