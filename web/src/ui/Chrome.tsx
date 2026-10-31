import { useMemo, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { env } from "@/config/env";
import { useI18n } from "@/state/locale";
import { useOnline } from "@/state/offline";
import { useSession } from "@/state/session";
import { useCart } from "@/state/cart";
import { Banner, Button } from "./primitives";
import { Sheet } from "./overlays";
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

const ROLE_BADGES: Record<UserRole, { label: string; icon: string }> = {
  buyer: { label: "Consumer", icon: "🛒" },
  merchant: { label: "Kirana", icon: "🏪" },
  vehicle: { label: "Rider", icon: "🛵" },
  supplier: { label: "Depot", icon: "🏭" },
  support: { label: "Operations", icon: "🛡️" },
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
  const { profile, logout } = useSession();
  const { count } = useCart();
  const nav = useNavigate();
  const [signoutOpen, setSignoutOpen] = useState(false);
  const role = profile?.role ?? "buyer";
  const tabs = TABS[role];
  const audioOn = profile?.permissions?.audio !== false;
  const supportXl = role === "support";
  const roleBadge = ROLE_BADGES[role] ?? { label: role, icon: "👤" };

  const header = useMemo(
    () => (
      <header className="app-header">
        <div className="app-header-left">
          {back ? (
            <button className="icon-btn app-back-btn" type="button" onClick={() => nav(-1)} aria-label={t("back")}>
              ←
            </button>
          ) : null}
          <NavLink to="/" className="app-brand-logo" title="Back to Logikchain Home">
            <span className="app-brand-icon">🌾</span>
            <span className="app-brand-name">LOGIKCHAIN</span>
          </NavLink>
          <div className="app-header-divider" />
          <div className="app-header-title-group">
            <h1>{title}</h1>
            <span className="app-role-chip">{roleBadge.icon} {roleBadge.label}</span>
            {env.alias !== "prod" ? <span className="env-chip">{env.alias}</span> : null}
          </div>
        </div>

        {/* Desktop Navigation Tabs for regular apps */}
        {!supportXl && (
          <nav className="desktop-nav-tabs" aria-label="Desktop primary navigation">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? "tab-link active" : "tab-link")}>
                <span className="tab-icon" aria-hidden>{tab.icon}</span>
                <span className="tab-label">
                  {t(tab.key)}
                  {tab.key === "cart" && count > 0 ? ` (${count})` : ""}
                </span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="app-header-right">
          <button
            type="button"
            className="app-close-btn"
            data-testid="close-app-btn"
            onClick={() => {
              window.location.assign("/");
            }}
            title="Exit App and Return to Website"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕ Close App
          </button>

          <NavLink to="/" className="app-portal-link" title="Explore Logikchain Portal">
            🌐 Portal
          </NavLink>

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

          <button
            className="icon-btn"
            type="button"
            aria-label={t("bell")}
            onClick={() => nav(supportXl ? "/x/notifications" : "/notifications")}
          >
            🔔
            {unread > 0 ? <span className="badge">{unread > 99 ? "99+" : unread > 9 ? "9+" : unread}</span> : null}
          </button>

          <button
            className="app-user-capsule"
            type="button"
            aria-label={t("avatar")}
            onClick={() => nav(supportXl ? "/x/profile" : "/profile")}
            title="Account Profile & Settings"
          >
            <span className="app-avatar-circle">👤</span>
            <span className="app-avatar-name">{profile?.name || profile?.phone || t("avatar")}</span>
          </button>

          <button
            type="button"
            className="app-signout-btn"
            onClick={() => setSignoutOpen(true)}
            title={t("logout")}
          >
            🚪
          </button>
        </div>
      </header>
    ),
    [audioOn, back, count, nav, profile?.name, profile?.phone, roleBadge, speakText, supportXl, t, tabs, title, unread],
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
      {!noNav ? navBar : null}

      {/* Global Signout Confirmation Sheet */}
      {signoutOpen ? (
        <Sheet
          title={t("logout")}
          onClose={() => setSignoutOpen(false)}
          footer={
            <Button
              variant="danger"
              onClick={async () => {
                setSignoutOpen(false);
                await logout();
                nav("/");
              }}
            >
              {t("confirm")}
            </Button>
          }
        >
          <p>{t("logoutConfirm")}</p>
        </Sheet>
      ) : null}
    </>
  );

  if (supportXl) {
    return (
      <div className="support-shell app-shell">
        <aside className="rail">
          <div className="rail-brand">{t("appName")}</div>
          <nav className="rail-nav" aria-label="Support Navigation">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => `rail-item ${isActive ? "active" : ""}`}
              >
                <span>{tab.icon}</span>
                <span>{t(tab.key)}</span>
              </NavLink>
            ))}
            <NavLink
              to="/x/profile"
              className={({ isActive }) => `rail-item ${isActive ? "active" : ""}`}
            >
              <span>👤</span>
              <span>{t("profile")}</span>
            </NavLink>
          </nav>
          <div className="rail-footer">
            <NavLink
              to="/x/profile"
              className={({ isActive }) => `rail-user-card ${isActive ? "active" : ""}`}
              title={t("profile")}
            >
              <div className="rail-user-avatar">👤</div>
              <div className="rail-user-info">
                <div className="rail-user-name">{profile?.name || "Support"}</div>
                <div className="rail-user-role">{profile?.email || profile?.phone || profile?.role || "support"}</div>
              </div>
            </NavLink>
            <button
              type="button"
              className="btn"
              data-testid="close-app-rail-btn"
              style={{
                width: "100%",
                justifyContent: "center",
                marginBottom: "8px",
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => {
                window.location.assign("/");
              }}
            >
              ✕ Close App
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setSignoutOpen(true)}
            >
              🚪 {t("logout")}
            </button>
          </div>
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
        <div className="app-header-left">
          <NavLink to="/" className="app-brand-logo" title="Back to Logikchain Home">
            <span className="app-brand-icon">🌾</span>
            <span className="app-brand-name">LOGIKCHAIN</span>
          </NavLink>
        </div>
        <div className="app-header-right">
          <button className="icon-btn" type="button" aria-label={t("speak")} onClick={() => speak(speakText ?? t("tagline"))}>
            🔊
          </button>
          {env.alias !== "prod" ? <span className="env-chip">{env.alias}</span> : null}
          <button className="icon-btn" type="button" onClick={() => nav("/language")} aria-label={t("language")}>
            {locale === "en" ? "A/अ" : "अ"}
          </button>
        </div>
      </header>
      {!online ? <Banner>⚠ {t("offlineBanner")}</Banner> : null}
      <main className="page no-nav">{children}</main>
    </div>
  );
}
