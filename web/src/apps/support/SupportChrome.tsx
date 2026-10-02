/**
 * SupportChrome.tsx
 *
 * Dedicated shell for the Logikchain Support console.
 * Dual-tone: dark sidebar + light content (Linear/Vercel style).
 * Collapsible sidebar: 240px ↔ 56px icon-only mode.
 * Grouped nav with expandable sub-sections per primary section.
 * Isolated from the shared Chrome — only support/* screens use this.
 */

import { useState, useCallback, type ReactNode } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { env } from "@/config/env";
import { useI18n } from "@/state/locale";
import { useOnline } from "@/state/offline";
import { useSession } from "@/state/session";
import "./support-shell.css";

/* ─── Nav structure ─────────────────────────────────────────── */

type SubItem = { to: string; label: string };
type NavSection = {
  id: string;
  label: string;
  icon: string;
  to?: string; // if set: direct link, no sub-items
  sub?: SubItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "ops",
    label: "Operations",
    icon: "⬡",
    sub: [
      { to: "/x/ops", label: "Overview" },
      { to: "/x/orders/suspended", label: "Suspended orders" },
      { to: "/x/villages/requests", label: "Village requests" },
      { to: "/x/subscriptions", label: "Subscriptions" },
      { to: "/x/audit", label: "Audit log" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "₹",
    sub: [
      { to: "/x/cash", label: "Cash custody" },
      { to: "/x/cash/discrepancies", label: "Discrepancies" },
      { to: "/x/money-exceptions", label: "Money exceptions" },
      { to: "/x/reconciliation", label: "Reconciliation" },
      { to: "/x/period-close", label: "Period close" },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: "◯",
    sub: [
      { to: "/x/users", label: "All users" },
      { to: "/x/users/new-supplier", label: "Create supplier" },
    ],
  },
  {
    id: "config",
    label: "Configuration",
    icon: "⚙",
    sub: [
      { to: "/x/config/countries", label: "Countries" },
      { to: "/x/config/states", label: "States" },
      { to: "/x/config/districts", label: "Districts" },
      { to: "/x/config/villages", label: "Villages" },
      { to: "/x/config/hubs", label: "Hubs" },
      { to: "/x/config/routes", label: "Pre-configured Routes" },
      { to: "/x/config/plans", label: "Plans" },
      { to: "/x/config/tariffs", label: "Tariffs" },
      { to: "/x/config/offers", label: "Offers" },
      { to: "/x/config/codes", label: "Discount codes" },
      { to: "/x/config/tax", label: "Tax" },
      { to: "/x/config/tds", label: "TDS" },
    ],
  },
  {
    id: "search",
    label: "Search",
    icon: "⌕",
    to: "/x/search",
  },
];

/* ─── Bottom nav items (mobile) ─────────────────────────────── */

const MOBILE_TABS = [
  { to: "/x/ops", icon: "⬡", label: "Ops" },
  { to: "/x/users", icon: "◯", label: "Users" },
  { to: "/x/config", icon: "⚙", label: "Config" },
  { to: "/x/search", icon: "⌕", label: "Search" },
];

/* ─── Sidebar component ─────────────────────────────────────── */

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { profile } = useSession();
  const location = useLocation();
  const nav = useNavigate();

  // Track which sections are expanded. Default: expand whichever section contains the active route.
  const defaultOpen = NAV_SECTIONS.reduce<Record<string, boolean>>((acc, section) => {
    if (section.sub) {
      const isActive = section.sub.some((s) => location.pathname.startsWith(s.to));
      acc[section.id] = isActive;
    }
    return acc;
  }, {});

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(defaultOpen);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Initials for avatar
  const initials = (profile?.name ?? profile?.email ?? "S")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside className="spt-sidebar">
      {/* Brand */}
      <div className="spt-brand">
        <div className="spt-brand-logo">LC</div>
        {!collapsed && (
          <>
            <span className="spt-brand-name">Logikchain</span>
            <span className="spt-brand-badge">Support</span>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="spt-nav" aria-label="Support Navigation">
        {NAV_SECTIONS.map((section) => {
          if (section.to) {
            // Direct link section (no sub-items)
            const isActive = location.pathname === section.to || location.pathname.startsWith(section.to + "/");
            return (
              <div key={section.id} className="spt-nav-group">
                <NavLink
                  to={section.to}
                  className={`spt-nav-item${isActive ? " active" : ""}`}
                  title={collapsed ? section.label : undefined}
                >
                  <span className="spt-nav-icon" aria-hidden>{section.icon}</span>
                  <span className="spt-nav-label">{section.label}</span>
                  {collapsed && <span className="spt-nav-item-tooltip">{section.label}</span>}
                </NavLink>
              </div>
            );
          }

          const isExpanded = !!openSections[section.id];
          const subItems = section.sub ?? [];
          const isAnySubActive = subItems.some(
            (s) => location.pathname === s.to || location.pathname.startsWith(s.to + "/"),
          );

          return (
            <div key={section.id} className="spt-nav-group">
              <button
                type="button"
                className={`spt-nav-item${isExpanded ? " expanded" : ""}${isAnySubActive && !isExpanded ? " active" : ""}`}
                onClick={() => (collapsed ? nav(subItems[0]?.to ?? "/x/ops") : toggleSection(section.id))}
                aria-expanded={isExpanded}
                title={collapsed ? section.label : undefined}
              >
                <span className="spt-nav-icon" aria-hidden>{section.icon}</span>
                <span className="spt-nav-label">{section.label}</span>
                {!collapsed && (
                  <svg className="spt-nav-chevron" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {collapsed && <span className="spt-nav-item-tooltip">{section.label}</span>}
              </button>

              {!collapsed && (
                <div className={`spt-subnav${isExpanded ? " open" : ""}`} role="group">
                  {subItems.map((sub) => {
                    const isSubActive =
                      location.pathname === sub.to || location.pathname.startsWith(sub.to + "/");
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`spt-subnav-item${isSubActive ? " active" : ""}`}
                      >
                        <span className="spt-subnav-dot" aria-hidden />
                        {sub.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="spt-sidebar-footer">
        <NavLink to="/x/profile" className="spt-user-card" title={collapsed ? (profile?.name ?? "Profile") : undefined}>
          <div className="spt-user-avatar" aria-hidden>{initials || "S"}</div>
          {!collapsed && (
            <div className="spt-user-info">
              <div className="spt-user-name">{profile?.name || "Support"}</div>
              <div className="spt-user-role-label">{profile?.email || profile?.phone || "support"}</div>
            </div>
          )}
        </NavLink>

        <button
          type="button"
          className="spt-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            {collapsed ? (
              <path d="M5 4l6 4-6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M11 4L5 8l6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          {!collapsed && <span className="spt-collapse-label">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

/* ─── SupportChrome component ───────────────────────────────── */

export function SupportChrome({
  title,
  screenId,
  back,
  fab,
  children,
  unread = 0,
  noTopbar,
}: {
  title: string;
  screenId: string;
  back?: boolean;
  fab?: { label: string; onClick: () => void };
  children: ReactNode;
  unread?: number;
  noTopbar?: boolean;
}) {
  const { t } = useI18n();
  const { online } = useOnline();
  const { profile, logout } = useSession();
  const nav = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [signoutOpen, setSignoutOpen] = useState(false);

  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  return (
    <div className={`spt-shell${collapsed ? " collapsed" : ""}`} data-screen={screenId}>
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />

      {/* Content */}
      <div className="spt-content">
        {/* Top bar */}
        {!noTopbar && (
          <header className="spt-topbar">
            {back && (
              <button
                className="spt-topbar-back"
                type="button"
                onClick={() => nav(-1)}
                aria-label="Go back"
              >
                ←
              </button>
            )}

            <h1 className="spt-topbar-title">{title}</h1>

            <div className="spt-topbar-actions">
              {env.alias !== "prod" && (
                <span className="spt-env-chip">{env.alias}</span>
              )}

              <button
                className="spt-icon-btn"
                type="button"
                aria-label="Notifications"
                onClick={() => nav("/x/notifications")}
              >
                🔔
                {unread > 0 && (
                  <span className="spt-badge" aria-label={`${unread} unread`}>
                    {unread > 99 ? "99+" : unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              <button
                className="spt-icon-btn"
                type="button"
                aria-label="Account"
                onClick={() => nav("/x/profile")}
                title={profile?.name ?? "Profile"}
              >
                ◯
              </button>

              <button
                className="spt-icon-btn"
                type="button"
                aria-label="Sign out"
                onClick={() => setSignoutOpen(true)}
              >
                ↱
              </button>
            </div>
          </header>
        )}

        {/* Offline banner */}
        {!online && (
          <div
            className="spt-offline-banner"
            role="status"
            onClick={() => nav("/sync")}
          >
            ⚠ {t("offlineBanner")}
          </div>
        )}

        {/* Page */}
        <main className="spt-page">
          {children}
        </main>

        {/* FAB */}
        {fab && (
          <button
            className="spt-fab"
            type="button"
            aria-label={fab.label}
            onClick={fab.onClick}
          >
            <span aria-hidden>+</span>
            {fab.label}
          </button>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="spt-bottom-nav" aria-label="Primary navigation">
        {MOBILE_TABS.map((tab) => {
          const isActive =
            location.pathname === tab.to || location.pathname.startsWith(tab.to + "/");
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={isActive ? "active" : ""}
              aria-current={isActive ? "page" : undefined}
            >
              <span aria-hidden>{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sign-out dialog */}
      {signoutOpen && (
        <div
          className="spt-dialog-scrim"
          onClick={(e) => { if (e.target === e.currentTarget) setSignoutOpen(false); }}
          role="dialog"
          aria-modal
          aria-labelledby="spt-signout-title"
        >
          <div className="spt-dialog">
            <div className="spt-dialog-head">
              <h2 className="spt-dialog-title" id="spt-signout-title">Sign out?</h2>
            </div>
            <div className="spt-dialog-body">
              {t("logoutConfirm")}
            </div>
            <div className="spt-dialog-foot">
              <button
                className="spt-btn spt-btn-secondary"
                type="button"
                onClick={() => setSignoutOpen(false)}
              >
                Cancel
              </button>
              <button
                className="spt-btn spt-btn-danger"
                type="button"
                onClick={() => void logout()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Typed wrappers matching old Chrome API ─────────────────── */

/** Drop-in status chip for the new design system */
export function SptStatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    placed: { cls: "blue", label: "Placed" },
    delivered: { cls: "green", label: "Delivered" },
    cancelled: { cls: "red", label: "Cancelled" },
    suspended: { cls: "amber", label: "Suspended" },
    pending: { cls: "amber", label: "Pending" },
    paid: { cls: "green", label: "Paid" },
    approved: { cls: "green", label: "Approved" },
    completed: { cls: "green", label: "Completed" },
    failed: { cls: "red", label: "Failed" },
    created: { cls: "blue", label: "Created" },
    started: { cls: "blue", label: "Started" },
    active: { cls: "green", label: "Active" },
    overdue: { cls: "red", label: "Overdue" },
    reached: { cls: "blue", label: "Reached" },
    reached_merchant: { cls: "blue", label: "Reached" },
  };
  const s = map[status] ?? { cls: "gray", label: status };
  return (
    <span className={`spt-chip ${s.cls}`}>
      <span className="spt-chip-dot" aria-hidden />
      {s.label}
    </span>
  );
}

/** Skeleton loader rows */
export function SptSkeletons({ n = 3, height = 52 }: { n?: number; height?: number }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="spt-skeleton spt-skeleton-row"
          style={{ height, marginBottom: i < n - 1 ? 8 : 0 }}
          aria-hidden
        />
      ))}
    </div>
  );
}

/** Field wrapper */
export function SptField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="spt-field">
      <label className="spt-label">{label}</label>
      {children}
      {error && <span className="spt-field-error">⚠ {error}</span>}
    </div>
  );
}

/** Empty state — accepts both 'icon' and 'glyph' so it's a drop-in for the old EmptyState */
export function SptEmpty({
  icon,
  glyph,
  title,
  hint,
  action,
  secondary,
}: {
  icon?: string;
  glyph?: string; // alias for icon — matches old EmptyState API
  title: string;
  hint: string;
  action?: ReactNode;
  secondary?: ReactNode;
}) {
  const displayIcon = icon ?? glyph ?? "○";
  return (
    <div className="spt-empty">
      <div className="spt-empty-icon" aria-hidden>{displayIcon}</div>
      <p className="spt-empty-title">{title}</p>
      <p className="spt-empty-hint">{hint}</p>
      {action}
      {secondary ? <div style={{ marginTop: 8 }}>{secondary}</div> : null}
    </div>
  );
}
