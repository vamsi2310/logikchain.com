import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n, LOCALES } from "@/state/locale";
import { useSession } from "@/state/session";
import { PublicLayout } from "@/apps/public/PublicLayout";

export function ProfileScreen() {
  const { locale } = useI18n();
  const nav = useNavigate();
  const { profile, logout } = useSession();
  const [out, setOut] = useState(false);

  const defaultRole = { label: "Consumer / Buyer", color: "#0369a1", bg: "#e0f2fe" };
  const roleBadgeMap: Record<string, { label: string; color: string; bg: string }> = {
    buyer: defaultRole,
    merchant: { label: "Kirana Merchant", color: "#15803d", bg: "#dcfce7" },
    vehicle: { label: "Logistics Rider", color: "#b45309", bg: "#fef3c7" },
    driver: { label: "Logistics Rider", color: "#b45309", bg: "#fef3c7" },
    supplier: { label: "Depot / Mill Supplier", color: "#7c3aed", bg: "#f3e8ff" },
    support: { label: "Platform Operations", color: "#e11d48", bg: "#ffe4e6" }
  };

  const currentRole = roleBadgeMap[profile?.role || "buyer"] || defaultRole;

  const quickLinks = [
    { to: "/profile/edit", label: "Edit Personal Details", desc: "Update your full name, dispatch address & emergency contacts", icon: "✏️" },
    { to: "/language", label: "Preferred Dialect", desc: `Currently active: ${LOCALES.find(l => l.id === locale)?.endonym || "English"}`, icon: "🌐" },
    { to: "/notifications", label: "Notification Preferences", desc: "Manage WhatsApp receipts, SMS OTPs, and push alerts", icon: "🔔" },
    { to: "/profile/security", label: "Security & Device Sessions", desc: "Inspect authorized sessions, biometric access, and tokens", icon: "🛡️" },
    { to: "/download", label: "Install Mobile PWA / APK", desc: "Add to home screen for offline resilience and instant barcode scanning", icon: "📲" },
    { to: "/help", label: "Corridor Help & FAQs", desc: "Order disputes, escrow payouts, and village hub support", icon: "❓" }
  ];

  return (
    <PublicLayout>
      <div style={{ maxWidth: "1000px", margin: "2rem auto", padding: "0 1.5rem" }}>
        
        {/* Profile Hero Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            borderRadius: "20px",
            padding: "2.5rem",
            color: "#ffffff",
            marginBottom: "2rem",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.2rem",
                fontWeight: 900,
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(2, 132, 199, 0.3)"
              }}
            >
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "👤"}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0 }}>
                  {profile?.name || "Corridor Member"}
                </h1>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, background: currentRole.bg, color: currentRole.color, padding: "2px 8px", borderRadius: "4px" }}>
                  {currentRole.label}
                </span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
                📞 {profile?.phone || "Phone verified"} • UID: <code style={{ color: "#38bdf8", fontSize: "0.85rem" }}>{profile?.id?.slice(0, 12) || "usr_verified"}...</code>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => nav("/profile/edit")}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", background: "#0284c7", color: "#ffffff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => setOut(true)}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.4)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Quick Details Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Registered Delivery Address</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.35rem" }}>
              {profile?.address || "No primary street address entered yet"}
            </div>
            <Link to="/profile/edit" style={{ fontSize: "0.82rem", color: "#0284c7", textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: "0.5rem" }}>
              Update Address ➔
            </Link>
          </div>

          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Assigned Village & Corridor Hub</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.35rem" }}>
              {profile?.villageId ? `Village ID: ${profile.villageId}` : "Not linked to a specific village"}
            </div>
            <Link to="/home" style={{ fontSize: "0.82rem", color: "#0284c7", textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: "0.5rem" }}>
              Change on Home Screen ➔
            </Link>
          </div>

          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>KYC & Identity Verification</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#16a34a", marginTop: "0.35rem" }}>
              ● Phone Authenticated (Tier-1 Active)
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.5rem" }}>
              Full merchant/rider credit limits unlock via Aadhaar
            </div>
          </div>
        </div>

        {/* Settings Navigation Menu */}
        <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>
          Account Settings & Preferences
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "3rem" }}>
          {quickLinks.map((item, idx) => (
            <div
              key={idx}
              onClick={() => nav(item.to)}
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
              }}
            >
              <span style={{ fontSize: "1.8rem" }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{item.label}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>{item.desc}</div>
              </div>
              <span style={{ color: "#94a3b8", fontSize: "1.2rem" }}>›</span>
            </div>
          ))}
        </div>

        {/* Logout Confirmation Modal */}
        {out && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "2rem", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚪</div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
                Confirm Sign Out
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0 0 1.5rem 0" }}>
                Are you sure you want to end your current authenticated session on Logikchain?
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setOut(false)}
                  style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setOut(false);
                    nav("/");
                  }}
                  style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", border: "none", background: "#ef4444", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PublicLayout>
  );
}

export { EditProfileScreen, NotificationsScreen, NotificationSettingsScreen, SecurityScreen, PermissionsScreen, VoiceScreen, SyncScreen, InstallScreen, HelpScreen } from "./AccountScreens";
