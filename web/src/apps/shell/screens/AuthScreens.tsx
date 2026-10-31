import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RecaptchaVerifier } from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/app";
import { ops } from "@/api/ops";
import { useI18n, LOCALES } from "@/state/locale";
import { useSession, roleHome } from "@/state/session";
import { useOnline } from "@/state/offline";
import { useToast } from "@/state/toast";
import { PublicLayout } from "@/apps/public/PublicLayout";
import type { Country, UserRole } from "@/types/domain";

export { SplashScreen } from "@/shared/SplashScreen";

export function LanguageScreen() {
  const { t, locale, setLocale } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const [pick, setPick] = useState(locale);

  return (
    <PublicLayout>
      <div style={{ maxWidth: "760px", margin: "2rem auto", padding: "0 1.5rem" }}>
        {/* Navigation Breadcrumb / Back */}
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => nav(-1)}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: 0
            }}
          >
            ← {t("back")} to Sign-In
          </button>
        </div>

        {/* Card Header */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "2rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "2rem" }}>🌐</span>
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {t("language")}
              </h1>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
                Select your preferred regional dialect for voice prompts, navigation, and billing SMS.
              </p>
            </div>
          </div>

          {/* Regional Languages Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", margin: "2rem 0" }}>
            {LOCALES.map((l) => {
              const isSelected = pick === l.id;
              return (
                <div
                  key={l.id}
                  onClick={() => {
                    setPick(l.id);
                    setLocale(l.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    border: isSelected ? "2px solid #16a34a" : "1px solid #e2e8f0",
                    background: isSelected ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: isSelected ? "6px solid #16a34a" : "2px solid #cbd5e1",
                        background: "#ffffff",
                        boxSizing: "border-box"
                      }}
                    />
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: isSelected ? "#15803d" : "#0f172a" }}>
                        {l.endonym}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        {l.english}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: isSelected ? "#dcfce7" : "#f1f5f9",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "1rem"
                    }}
                    title={`Listen to sample in ${l.english}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                        const u = new SpeechSynthesisUtterance(l.sample);
                        window.speechSynthesis.speak(u);
                      }
                    }}
                  >
                    🔊
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem" }}>
            <button
              type="button"
              onClick={() => nav(-1)}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                setLocale(pick);
                if (user) void ops.updateUserProfile(user.uid, { locale: pick }).catch(() => undefined);
                nav(-1);
              }}
              style={{
                padding: "0.75rem 2rem",
                borderRadius: "10px",
                border: "none",
                background: "#16a34a",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(22, 163, 74, 0.3)"
              }}
            >
              {t("save")} & Continue ➔
            </button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function LoginScreen() {
  const { t, locale } = useI18n();
  const nav = useNavigate();
  const { sendOtp, google, user, profile, logout, refreshProfile } = useSession();
  const { online } = useOnline();
  const { push } = useToast();

  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>("buyer");
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [supportTargetRole, setSupportTargetRole] = useState<UserRole>("merchant");
  const [supportReason, setSupportReason] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    void ops
      .listConfigurationCatalog({ types: "countries" })
      .then((c) => {
        setCountries(c.countries);
        const inCountry = c.countries.find((x) => x.isoCode === "IN") ?? c.countries[0];
        if (inCountry) setCountryId(inCountry.id);
      })
      .catch(() => {
        setCountries([
          {
            id: "IN",
            name: "India",
            isoCode: "IN",
            mobilePrefix: "+91",
            phoneNumberLength: 10,
            currencyCode: "INR",
            currencySymbol: "₹",
            timezone: "Asia/Kolkata",
            status: "active",
          },
        ]);
        setCountryId("IN");
      });
  }, []);

  useEffect(() => {
    recaptchaRef.current = new RecaptchaVerifier(getFirebaseAuth(), "recaptcha-host", { size: "invisible" });
    return () => recaptchaRef.current?.clear();
  }, []);

  const country = countries.find((c) => c.id === countryId);
  const prefix = country?.mobilePrefix ?? "+91";
  const len = country?.phoneNumberLength ?? 10;

  async function onOtp() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== len) {
      setError(`Mobile number must be exactly ${len} digits for ${country?.name ?? "this country"}`);
      return;
    }
    setError("");

    // Store pre-signup profile onboarding intent so it persists across verification
    try {
      const preSignupPayload = {
        fullName: fullName.trim(),
        role: targetRole,
        pincode: pincode.trim(),
        phone: `${prefix}${digits}`,
        countryId,
        locale,
        recordedAt: new Date().toISOString()
      };
      sessionStorage.setItem("lc_pending_onboarding", JSON.stringify(preSignupPayload));
    } catch {
      // Ignore session storage failure
    }

    setBusy(true);
    try {
      if (!recaptchaRef.current) throw new Error("recaptcha");
      await sendOtp(`${prefix}${digits}`, recaptchaRef.current);
      nav("/login/verify");
    } catch (e) {
      push((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const roleOptions: Array<{ id: UserRole; title: string; desc: string; icon: string }> = [
    { id: "buyer", title: "Consumer / Buyer", desc: "Local grocery, household & fresh mandi ordering", icon: "🛒" },
    { id: "merchant", title: "Kirana Merchant", desc: "Wholesale mill sourcing, inventory & micro-credit", icon: "🏪" },
    { id: "vehicle", title: "Fleet Rider", desc: "Corridor deliveries with instant shift payouts", icon: "🛵" },
    { id: "supplier", title: "Depot / Supplier", desc: "Bulk mill catalogue listing & T+1 settlement", icon: "🏭" },
  ];

  return (
    <PublicLayout>
      <div style={{ maxWidth: "1100px", margin: "2rem auto", padding: "0 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "2.5rem", alignItems: "start" }}>
          
          {/* Left Hero / Brand Card */}
          <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: "20px", padding: "2.5rem", color: "#ffffff", boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.2)" }}>
            <div style={{ display: "inline-block", background: "#16a34a", color: "#ffffff", fontSize: "0.75rem", fontWeight: 800, padding: "4px 12px", borderRadius: "9999px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
              Secure Gateway Login
            </div>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 900, lineHeight: 1.2, margin: "0 0 1rem 0" }}>
              Access the Bharat Commerce Grid
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "1.05rem", lineHeight: 1.6, margin: "0 0 2rem 0" }}>
              One unified identity connects you across all regional mandi hubs, micro-credit lines, and instant corridor delivery networks.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderTop: "1px solid #334155", paddingTop: "1.75rem" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.4rem" }}>⚡</span>
                <div>
                  <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>Zero Password Vulnerability</strong>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>High-speed 6-digit SMS & WhatsApp OTP verification.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.4rem" }}>🇮🇳</span>
                <div>
                  <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>Multilingual Regional Dialects</strong>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Native support for English, Hindi, Telugu, Kannada, Tamil, and Marathi.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.4rem" }}>🛡️</span>
                <div>
                  <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>NPCI / UPI Escrow Protection</strong>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Guaranteed disbursements and verified KYC merchant ledgers.</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "2.5rem", background: "#0b1120", padding: "1rem 1.25rem", borderRadius: "12px", border: "1px solid #1e293b", fontSize: "0.85rem", color: "#94a3b8" }}>
              Need help? Inspect our <Link to="/how-it-works" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>How It Works</Link> or <Link to="/download" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Get Mobile App</Link>.
            </div>
          </div>

          {/* Right Form Card */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              padding: "2.25rem",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)"
            }}
          >
            {user ? (
              <div>
                <div style={{ display: "inline-block", background: "#f0fdf4", color: "#16a34a", fontSize: "0.8rem", fontWeight: 700, padding: "4px 10px", borderRadius: "9999px", marginBottom: "1rem" }}>
                  ● Active Session
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
                  You are Signed In
                </h2>
                <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0 0 1.5rem 0" }}>
                  Currently authenticated as <strong style={{ color: "#0f172a" }}>{profile?.name || user.displayName || user.phoneNumber || user.email || "Member"}</strong>.
                </p>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Assigned Role:</span>
                    <span style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.95rem" }} data-testid="assigned-role-text">
                      {roleOptions.find(r => r.id === (profile?.role || "buyer"))?.title || "Consumer / Buyer"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Assigned Village:</span>
                    <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }} data-testid="user-village-text">
                      {profile?.villageId || "village_peridepi_523273"}
                    </span>
                  </div>
                  {(profile?.address || profile?.phone) && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Contact:</span>
                      <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>{profile.address || profile.phone}</span>
                    </div>
                  )}
                </div>

                {/* Contact Support to Switch Role Action & Form */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <button
                    type="button"
                    data-testid="contact-support-role-btn"
                    onClick={() => setShowRoleForm((prev) => !prev)}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      borderRadius: "12px",
                      border: "1px solid #0284c7",
                      background: showRoleForm ? "#f0f9ff" : "#ffffff",
                      color: "#0369a1",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>🎧 Contact Support to Switch Role</span>
                    <span>{showRoleForm ? "▲" : "▼"}</span>
                  </button>

                  {/* Role Switch Form */}
                  {showRoleForm && (
                    <div
                      data-testid="role-switch-form"
                      style={{
                        marginTop: "0.85rem",
                        padding: "1.25rem",
                        background: "#f0f9ff",
                        borderRadius: "12px",
                        border: "1px solid #bae6fd",
                      }}
                    >
                      <h4 style={{ margin: "0 0 0.4rem 0", color: "#0369a1", fontSize: "1.05rem", fontWeight: 800 }}>
                        Support Role Conversion Request
                      </h4>
                      <p style={{ margin: "0 0 1rem 0", color: "#0c4a6e", fontSize: "0.82rem" }}>
                        Contact operations support to switch platform role and update permissions via Identity Microservice.
                      </p>

                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#0369a1", marginBottom: "0.35rem" }}>
                        Target Role to Switch
                      </label>
                      <select
                        data-testid="role-switch-select"
                        value={supportTargetRole}
                        onChange={(e) => setSupportTargetRole(e.target.value as UserRole)}
                        style={{
                          width: "100%",
                          padding: "0.65rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid #7dd3fc",
                          marginBottom: "0.85rem",
                          fontSize: "0.9rem",
                          background: "#ffffff",
                          fontWeight: 600,
                        }}
                      >
                        <option value="merchant">Kirana Merchant (🏪 Wholesale sourcing & credit)</option>
                        <option value="vehicle">Fleet Rider (🛵 Logistics delivery & payouts)</option>
                        <option value="supplier">Depot / Supplier (🏭 Bulk mill catalogue & settlement)</option>
                        <option value="support">Platform Operations (🛡️ AML, KYC & governance)</option>
                        <option value="buyer">Consumer / Buyer (🛒 Mandi grocery ordering)</option>
                      </select>

                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#0369a1", marginBottom: "0.35rem" }}>
                        Reason for Role Switch
                      </label>
                      <textarea
                        data-testid="role-switch-reason"
                        value={supportReason}
                        onChange={(e) => setSupportReason(e.target.value)}
                        placeholder="e.g. Registered kirana store owner in Kandukur requesting merchant terminal privileges."
                        rows={2}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid #7dd3fc",
                          marginBottom: "0.85rem",
                          fontSize: "0.85rem",
                        }}
                      />

                      <button
                        type="button"
                        data-testid="submit-role-switch-btn"
                        disabled={supportSubmitting}
                        onClick={async () => {
                          if (!user) return;
                          setSupportSubmitting(true);
                          try {
                            await ops.convertBuyerToRole(user.uid, {
                              targetRole: supportTargetRole,
                              reason: supportReason.trim() || "User requested role change via Support Desk",
                            });
                            await refreshProfile();
                            push(`Role updated to ${supportTargetRole.toUpperCase()} successfully via Support`);
                            setShowRoleForm(false);
                          } catch (err) {
                            push((err as Error).message);
                          } finally {
                            setSupportSubmitting(false);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          borderRadius: "8px",
                          border: "none",
                          background: supportSubmitting ? "#94a3b8" : "#0284c7",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          cursor: supportSubmitting ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
                        }}
                      >
                        {supportSubmitting ? "Updating Role via Microservice..." : "Submit Role Switch Request ➔"}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <button
                    type="button"
                    data-testid="open-app-btn"
                    onClick={() => window.location.assign(roleHome(profile?.role ?? "buyer"))}
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      borderRadius: "12px",
                      border: "none",
                      background: "#16a34a",
                      color: "#ffffff",
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 10px rgba(22, 163, 74, 0.3)"
                    }}
                  >
                    Open App ➔
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      push("Signed out successfully");
                    }}
                    style={{
                      width: "100%",
                      padding: "0.8rem",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#475569",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Sign Out & Switch Account
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Sign In or Register
              </h2>
              {/* Country & Language Switcher Pill */}
              <button
                type="button"
                onClick={() => nav("/language")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "20px",
                  padding: "4px 12px",
                  fontSize: "0.82rem",
                  color: "#334155",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <span>🌐 {country?.name ?? "India"}</span>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>• {locale.toUpperCase()}</span>
                <span>▾</span>
              </button>
            </div>

            {/* Country Selector */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#475569", marginBottom: "0.4rem" }}>
                {t("country")}
              </label>
              <select
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.95rem",
                  background: "#f8fafc",
                  color: "#0f172a"
                }}
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobilePrefix})
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Number Field */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#475569", marginBottom: "0.4rem" }}>
                {t("mobile")}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 14px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontWeight: 700,
                    color: "#334155",
                    fontSize: "0.95rem"
                  }}
                >
                  {prefix}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  maxLength={len + 2}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: error ? "2px solid #ef4444" : "1px solid #cbd5e1",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    outline: "none"
                  }}
                />
              </div>
              {error && (
                <div style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: "6px", fontWeight: 600 }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* Initial Profile Information Gathering (Name, Primary Role, Pincode) */}
            <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Quick Profile Setup (Optional)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "0.25rem" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "0.25rem" }}>
                    Postal Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 560001"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>
                  Primary Platform Role
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {roleOptions.map((opt) => {
                    const isSelected = targetRole === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setTargetRole(opt.id)}
                        style={{
                          padding: "0.5rem 0.65rem",
                          borderRadius: "8px",
                          border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                          background: isSelected ? "#f0f9ff" : "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>{opt.icon}</span>
                        <div style={{ fontSize: "0.78rem", fontWeight: isSelected ? 800 : 600, color: isSelected ? "#0369a1" : "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opt.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={busy || !online}
              onClick={() => void onOtp()}
              style={{
                width: "100%",
                padding: "0.95rem",
                borderRadius: "12px",
                border: "none",
                background: busy ? "#94a3b8" : "#16a34a",
                color: "#ffffff",
                fontSize: "1.05rem",
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: "0 4px 10px rgba(22, 163, 74, 0.3)",
                transition: "all 0.15s ease"
              }}
            >
              {busy ? "Sending Secure Verification Code..." : `${t("sendOtp")} ➔`}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0", color: "#94a3b8", fontSize: "0.85rem" }}>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
              <span>{t("or")}</span>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>

            {/* Google OAuth Alternative */}
            <button
              type="button"
              disabled={!online}
              onClick={() => void google().catch((e) => push(e.message))}
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              {t("google")}
            </button>

            {/* Supplier / Help footnote */}
            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#64748b" }}>
              Are you a bulk depot or FMCG mill? <Link to="/suppliers" style={{ color: "#0284c7", fontWeight: 600 }}>Explore Supplier Portal ➔</Link>
            </div>
            </>
            )}

            <div id="recaptcha-host" />
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}

export function OtpScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { pendingPhone, confirmOtp, registerToken, refreshProfile } = useSession();
  const { push } = useToast();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(30);
  const [busy, setBusy] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const code = digits.join("");

  async function verify() {
    setBusy(true);
    try {
      await confirmOtp(code);
      try {
        await registerToken();
      } catch {
        // Token registration failure is non-fatal
      }

      // Read pre-signup onboarding info if captured on login screen
      try {
        const stored = sessionStorage.getItem("lc_pending_onboarding");
        if (stored) {
          const preInfo = JSON.parse(stored);
          const currentUser = getFirebaseAuth().currentUser;
          if (currentUser) {
            await ops.updateUserProfile(currentUser.uid, {
              name: preInfo.fullName || undefined,
              role: preInfo.role || "buyer",
              address: preInfo.pincode ? `Pincode: ${preInfo.pincode}` : undefined,
              locale: preInfo.locale || undefined,
            });
            await refreshProfile();
          }
          sessionStorage.removeItem("lc_pending_onboarding");
        }
      } catch (err) {
        console.warn("Could not sync pre-signup onboarding info", err);
      }

      nav("/login");
    } catch (e) {
      push((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleDigitChange(idx: number, val: string) {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  }

  return (
    <PublicLayout>
      <div style={{ maxWidth: "540px", margin: "3rem auto", padding: "0 1.5rem" }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            padding: "2.5rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
            textAlign: "center"
          }}
        >
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f0fdf4", color: "#16a34a", fontSize: "2rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto" }}>
            📲
          </div>

          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
            {t("verifyPhone")}
          </h2>

          <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0 0 2rem 0" }}>
            Enter the 6-digit verification code sent to <strong style={{ color: "#0f172a" }}>{pendingPhone || "your mobile"}</strong>
          </p>

          {/* 6 Digit Input Boxes */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "2rem" }}>
            {digits.map((d, i) => (
              <input
                key={i}
                data-testid={`otp-digit-${i}`}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: "48px",
                  height: "56px",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: "10px",
                  border: d ? "2px solid #16a34a" : "1px solid #cbd5e1",
                  background: d ? "#f0fdf4" : "#ffffff",
                  outline: "none"
                }}
              />
            ))}
          </div>

          <button
            type="button"
            data-testid="verify-otp-btn"
            disabled={code.length !== 6 || busy}
            onClick={() => void verify()}
            style={{
              width: "100%",
              padding: "0.95rem",
              borderRadius: "12px",
              border: "none",
              background: code.length === 6 ? "#16a34a" : "#cbd5e1",
              color: "#ffffff",
              fontSize: "1.05rem",
              fontWeight: 800,
              cursor: code.length === 6 ? "pointer" : "not-allowed",
              boxShadow: code.length === 6 ? "0 4px 10px rgba(22, 163, 74, 0.3)" : "none",
              marginBottom: "1.5rem"
            }}
          >
            {busy ? "Verifying..." : `${t("verify")} ➔`}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "#64748b" }}>
            <button
              type="button"
              onClick={() => nav("/login")}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", textDecoration: "underline" }}
            >
              Change Mobile Number
            </button>

            <div>
              {cooldown > 0 ? (
                <span>Resend code in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#0284c7", fontWeight: 700, cursor: "pointer" }}
                  onClick={() => nav("/login")}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function UnauthorizedScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  return (
    <PublicLayout>
      <div style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center", padding: "0 1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>Unauthorized Access</h2>
        <p style={{ color: "#64748b", margin: "0.5rem 0 1.5rem 0" }}>
          You do not have the required permissions to view this corridor portal with your current role.
        </p>
        <button
          type="button"
          onClick={() => nav("/")}
          style={{ padding: "0.75rem 1.5rem", borderRadius: "10px", background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
        >
          {t("back")} to Home
        </button>
      </div>
    </PublicLayout>
  );
}

export function RoleChangedScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  return (
    <PublicLayout>
      <div style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center", padding: "0 1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔄</div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>Role Updated</h2>
        <p style={{ color: "#64748b", margin: "0.5rem 0 1.5rem 0" }}>
          Your corridor account permissions were updated by an administrator. Please re-launch your session.
        </p>
        <button
          type="button"
          onClick={() => nav("/home")}
          style={{ padding: "0.75rem 1.5rem", borderRadius: "10px", background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
        >
          {t("continue")} ➔
        </button>
      </div>
    </PublicLayout>
  );
}

export function LegalScreen() {
  const nav = useNavigate();
  return (
    <PublicLayout>
      <div style={{ maxWidth: "800px", margin: "3rem auto", padding: "0 1.5rem" }}>
        <button
          type="button"
          onClick={() => nav(-1)}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, marginBottom: "1rem" }}
        >
          ← Back
        </button>
        <div style={{ background: "#ffffff", padding: "2rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: "0 0 1rem 0" }}>Logikchain Terms &amp; Policies</h2>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Please review our platform terms of service, merchant escrow commitments, buyer privacy disclosures, and driver partner guidelines.
          </p>
          <div style={{ marginTop: "1.5rem" }}>
            <Link to="/legal" style={{ color: "#0284c7", fontWeight: 700 }}>
              Visit Full Legal &amp; Policies Center ➔
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
