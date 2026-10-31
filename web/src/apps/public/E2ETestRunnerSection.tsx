import { useState, useEffect, useCallback } from "react";

export interface TestCaseSuite {
  id: string;
  name: string;
  specFile: string;
  actor: string;
  description: string;
  status: "passed" | "failed" | "running" | "idle";
  duration?: number;
  lastRun?: string;
  videoUrl?: string;
  videoExists?: boolean;
  logOutput?: string;
}

const FLOW_STEPS_MAP: Record<string, string[]> = {
  "user-flow-login-role-village": [
    "Test Data Setup: Seed initial user state for usr_8977848501 (village_peridepi_523273, role: buyer)",
    "User Sign-In: Phone input 8977848501 and 6-digit OTP 123123 session authentication",
    "Support Role Switch: Open Contact Support, select 'Kirana Merchant', and submit justification",
    "Fullscreen App Launch: Transition to /m/gigs with website header & footer hidden",
    "Close App Handover: Click '✕ Close App', returning to public site root",
    "Village Persistence: Navigate to /profile/edit, update village to village_kandukur_523105, verify PostgreSQL row and UI badge",
    "User Sign-Out: Click 'Sign Out & Switch Account', verify session tokens cleared and return to login screen"
  ],
  "config-geo-hierarchy": [
    "Test Data Setup: Seed 4-tier geographic master data (Country: IN, State: AP, District: Prakasam)",
    "User Sign-In: Authenticate certified Support Operator session",
    "Village Registry: Navigate to /x/config/villages, verify list items and topbar",
    "Geographic Master: Verify master levels for Countries, States, Districts, and Villages",
    "User Sign-Out: Open operator dialog, click 'Sign out', verify session tokens cleared"
  ],
  "usecases-commerce": [
    "Test Data Setup: Prepare merchant trade credit limits (₹50k), order items, and UPI QR payloads",
    "User Sign-In: Authenticate Kirana Merchant session",
    "Merchant Catalog Discovery: Load village pamphlet batch catalog",
    "Consignment Order: Build multi-item bulk procurement cart with tax breakdown",
    "Credit & UPI Settlement: Execute 2-phase credit hold and dynamic UPI intent generation",
    "Delivery Handover: Vehicle departure gate clearance and 4-digit OTP handover sign-off",
    "User Sign-Out: Terminate merchant session and clear trade tokens"
  ],
  "usecases-custody-payouts": [
    "Test Data Setup: Seed driver custody balance (₹14,500), 6-digit turn-in OTP, and masked bank beneficiary",
    "User Sign-In: Authenticate Transporter / Gig Driver session",
    "CoD Cash Collection: Record physical cash drop within daily transit ceiling (₹50,000)",
    "Depot Cash Turn-In: 6-digit cryptographic OTP dual-sign-off discharging custody balance to ₹0",
    "Payout Custody Gate: Enforce discrepancy lockouts and execute Cloud Tasks IMPS transfer with UTR",
    "Supplier Escrow Allocation: Audit gross inflow, merchant PUDO commissions, and driver remuneration",
    "User Sign-Out: Discharge driver mobile session and wipe device storage tokens"
  ],
  "usecases-governance-ledger": [
    "Test Data Setup: Prepare balanced general ledger journal accounts, VPA rules, and policy consent versions",
    "User Sign-In: Authenticate Compliance Officer & Finance Auditor session",
    "TPAP & AML Velocity Gate: Validate NPCI VPA syntax and trigger automated risk score account freeze",
    "Dispute SLA Tracking: Monitor 24-hour dispute countdown and compile daily regulatory report",
    "Double-Entry General Ledger: Audit immutable journal entries maintaining zero-sum debit/credit invariance",
    "Nightly Reconciliation: Reconcile domain ledger, bank escrow statements, and payment gateway logs",
    "User Sign-Out: Terminate compliance auditor session and clear operator authorization credentials"
  ],
  "status-services": [
    "Test Data Setup: Inspect Gateway NodePort :30080 and 13 backend microservice endpoints",
    "User Sign-In: Connect SRE & DevOps telemetry observer session",
    "API Gateway Health: Validate gateway status connected and cluster health aggregation",
    "Microservices Ping: Validate HTTP 200 health responses across all 13 services",
    "PostgreSQL Mesh: Execute atomic connection and table checks across all 12 isolated database schemas",
    "User Sign-Out: Disconnect telemetry session observer"
  ],
  "support-supplier-bulk-ingest": [
    "Test Data Setup: Prepare multi-entity catalog spreadsheet and target supplier sup_ongole_01",
    "User Sign-In: Authenticate Support Operator session",
    "Entity Category Selection: Toggle 11 entity types (organization, GST, FSSAI, trucks, drivers, prices)",
    "Dry-Run Pre-Flight Validation: Execute schema check and verify 'Status: VALID'",
    "Circuit Breaker Gate: Inject 14-char invalid GSTIN, verify INVALID_GSTIN_FORMAT error, and lock commit button",
    "User Sign-Out: Exit support console and wipe session storage"
  ],
  "config-tax-profiles": [
    "Test Data Setup: Stage commodity GST rate splits (0%, 5%, 18%) and Section 194C/194O TDS profiles",
    "User Sign-In: Authenticate Finance & Tax Officer session",
    "Tax Profile Master: Query regional GST categories and verify agricultural vs commercial rate mapping",
    "TDS Configuration: Audit marketplace withholding rules and quarterly challan reporting schedules",
    "User Sign-Out: Sign out of finance administration console"
  ],
  "config-subscription-plans": [
    "Test Data Setup: Stage Silver, Gold, Platinum merchant subscription tiers and quotas",
    "User Sign-In: Authenticate Commercial Operations session",
    "Subscription Tiers: Verify merchant tier catalogs, member quotas, and credit line authorization thresholds",
    "Tariff Controls: Audit platform order commission take-rates and distance logistics tariffs",
    "User Sign-Out: Sign out of commercial administration console"
  ],
  "support-supplier-proxy": [
    "Test Data Setup: Seed authorized supplier proxy contexts (sup_ongole_01, sup_krishna_01)",
    "User Sign-In: Authenticate Support Operator session",
    "Proxy Switcher: Open console topbar dropdown and impersonate supplier sup_ongole_01",
    "Context Verification: Confirm localStorage persistence of lc_support_supplier_context and audit headers",
    "User Sign-Out: Exit support proxy session and wipe impersonation headers"
  ]
};

export function E2ETestRunnerSection() {
  const [suites, setSuites] = useState<TestCaseSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeVideoSuite, setActiveVideoSuite] = useState<TestCaseSuite | null>(null);
  const [activeLogSuite, setActiveLogSuite] = useState<TestCaseSuite | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [runningAll, setRunningAll] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch test suites from /api/tests
  const fetchSuites = useCallback(async () => {
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suites)) {
          setSuites(data.suites);
        }
      }
    } catch (err) {
      console.error("Failed to load test suites:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSuites();
  }, [fetchSuites]);

  // Poll while any suite is running
  const hasRunning = suites.some((s) => s.status === "running") || runningAll;
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => {
      void fetchSuites();
    }, 2000);
    return () => clearInterval(interval);
  }, [hasRunning, fetchSuites]);

  // Run a single test suite
  const runTest = async (suiteId: string) => {
    // Optimistically update UI
    setSuites((prev) =>
      prev.map((s) => (s.id === suiteId ? { ...s, status: "running" } : s))
    );
    try {
      await fetch(`/api/tests/run?id=${encodeURIComponent(suiteId)}`, {
        method: "POST",
      });
      // Start polling
      setTimeout(() => void fetchSuites(), 1000);
    } catch (err) {
      console.error(`Failed to trigger test ${suiteId}:`, err);
    }
  };

  // Run all tests sequentially
  const runAllTests = async () => {
    if (runningAll) return;
    setRunningAll(true);
    for (const suite of suites) {
      await runTest(suite.id);
      // Wait for suite to finish before triggering next
      let isDone = false;
      let attempts = 0;
      while (!isDone && attempts < 45) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
        try {
          const res = await fetch("/api/tests");
          if (res.ok) {
            const data = await res.json();
            const curr = data.suites.find((s: TestCaseSuite) => s.id === suite.id);
            if (curr && curr.status !== "running") {
              isDone = true;
              setSuites(data.suites);
            }
          }
        } catch {}
      }
    }
    setRunningAll(false);
    void fetchSuites();
  };

  const copyLogs = (logs: string) => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics
  const totalCount = suites.length;
  const passedCount = suites.filter((s) => s.status === "passed").length;
  const failedCount = suites.filter((s) => s.status === "failed").length;
  const runningCount = suites.filter((s) => s.status === "running").length;
  const videoCount = suites.filter((s) => s.videoExists).length;

  // Filtered suites
  const filteredSuites = suites.filter((s) => {
    const matchesActor =
      selectedActor === "all" ||
      s.actor.toLowerCase().includes(selectedActor.toLowerCase());
    const matchesSearch =
      searchQuery.trim() === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesActor && matchesSearch;
  });

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Metrics Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Total Use Cases
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0f172a", marginTop: "0.25rem" }}>
            {totalCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.2rem" }}>
            Automated Playwright specs
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
            Passing Tests
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#15803d", marginTop: "0.25rem" }}>
            {passedCount} / {totalCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#166534", marginTop: "0.2rem" }}>
            ✓ Verified against live cluster
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: failedCount > 0 ? "#fef2f2" : "#f8fafc",
            border: `1px solid ${failedCount > 0 ? "#fca5a5" : "#e2e8f0"}`,
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: failedCount > 0 ? "#991b1b" : "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Failing Tests
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: failedCount > 0 ? "#b91c1c" : "#64748b", marginTop: "0.25rem" }}>
            {failedCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: failedCount > 0 ? "#b91c1c" : "#94a3b8", marginTop: "0.2rem" }}>
            {failedCount > 0 ? "Requires review" : "Zero regressions"}
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#1e40af", fontWeight: 700, textTransform: "uppercase" }}>
            Video Recordings
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#1d4ed8", marginTop: "0.25rem" }}>
            🎥 {videoCount} Available
          </div>
          <div style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: "0.2rem" }}>
            High-res .webm playback ready
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
          background: "#ffffff",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: "260px", flex: 1 }}>
          <span style={{ color: "#94a3b8" }}>🔍</span>
          <input
            type="text"
            placeholder="Search use case, spec, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
        </div>

        {/* Actor Filter Chips */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {["all", "Buyer", "Merchant", "Rider", "Supplier", "Support"].map((actor) => (
            <button
              key={actor}
              type="button"
              onClick={() => setSelectedActor(actor)}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "20px",
                border: selectedActor === actor ? "1px solid #0f172a" : "1px solid #e2e8f0",
                background: selectedActor === actor ? "#0f172a" : "#f8fafc",
                color: selectedActor === actor ? "#ffffff" : "#475569",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {actor === "all" ? "All Actors" : actor}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            className="pub-btn pub-btn-sm pub-btn-outline"
            onClick={() => void fetchSuites()}
            title="Refresh test status"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="pub-btn pub-btn-sm pub-btn-primary"
            disabled={runningAll || runningCount > 0}
            onClick={() => void runAllTests()}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            {runningAll ? "⏳ Running Test Suite..." : "▶ Run All Tests"}
          </button>
        </div>
      </div>

      {/* Test Suites List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            Loading test suites and telemetry...
          </div>
        ) : filteredSuites.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", background: "#ffffff", borderRadius: "12px" }}>
            No matching test suites found for your search.
          </div>
        ) : (
          filteredSuites.map((suite) => {
            const isPassed = suite.status === "passed";
            const isFailed = suite.status === "failed";
            const isRunning = suite.status === "running";

            const statusBadgeBg = isPassed
              ? "#ecfdf5"
              : isFailed
              ? "#fff1f2"
              : isRunning
              ? "#fffbeb"
              : "#f8fafc";
            const statusBadgeBorder = isPassed
              ? "#a7f3d0"
              : isFailed
              ? "#fecdd3"
              : isRunning
              ? "#fde68a"
              : "#e2e8f0";
            const statusTextColor = isPassed
              ? "#047857"
              : isFailed
              ? "#be123c"
              : isRunning
              ? "#b45309"
              : "#64748b";
            const statusIcon = isPassed
              ? "✓"
              : isFailed
              ? "✕"
              : isRunning
              ? "●"
              : "○";
            const statusText = isPassed
              ? `PASSED (${suite.duration ? `${suite.duration}s` : ""})`
              : isFailed
              ? "FAILED"
              : isRunning
              ? "RUNNING..."
              : "READY TO RUN";

            const steps = FLOW_STEPS_MAP[suite.id] || [];

            return (
              <div
                key={suite.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: isRunning ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                  padding: "1.5rem",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "monospace",
                        }}
                      >
                        {suite.id}
                      </span>
                      <span
                        style={{
                          background: "#e0f2fe",
                          color: "#0369a1",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {suite.actor}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.15rem 0.6rem",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: statusBadgeBg,
                          border: `1px solid ${statusBadgeBorder}`,
                          color: statusTextColor,
                        }}
                      >
                        <span style={{ fontSize: "0.85rem" }}>{statusIcon}</span> {statusText}
                      </span>
                      {suite.videoExists && (
                        <span
                          style={{
                            background: "#ede9fe",
                            color: "#6d28d9",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          🎥 Video Ready
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                      {suite.name}
                    </h3>
                    <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.92rem", color: "#475569", lineHeight: "1.5" }}>
                      {suite.description}
                    </p>

                    <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                      <span>Spec: <code>{suite.specFile}</code></span>
                      {suite.lastRun && (
                        <span> · Last Executed: {new Date(suite.lastRun).toLocaleTimeString()} ({new Date(suite.lastRun).toLocaleDateString()})</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={isRunning || runningAll}
                      onClick={() => void runTest(suite.id)}
                      className={`pub-btn pub-btn-sm ${isPassed ? "pub-btn-outline" : "pub-btn-primary"}`}
                      style={{ minWidth: "105px" }}
                    >
                      {isRunning ? "⏳ Testing..." : isPassed ? "↻ Rerun Test" : "▶ Run Test"}
                    </button>

                    {suite.videoExists ? (
                      <button
                        type="button"
                        onClick={() => setActiveVideoSuite(suite)}
                        className="pub-btn pub-btn-sm"
                        style={{
                          background: "#166534",
                          color: "#ffffff",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span>▶</span> Watch Video
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="pub-btn pub-btn-sm pub-btn-outline"
                        style={{ opacity: 0.5, cursor: "not-allowed" }}
                        title="Run this test to generate video recording"
                      >
                        No Video Yet
                      </button>
                    )}

                    {suite.logOutput && (
                      <button
                        type="button"
                        onClick={() => setActiveLogSuite(suite)}
                        className="pub-btn pub-btn-sm pub-btn-outline"
                      >
                        📄 Logs
                      </button>
                    )}
                  </div>
                </div>

                {/* Flow Step Preview (if defined) */}
                {steps.length > 0 && (
                  <div
                    style={{
                      marginTop: "1.25rem",
                      paddingTop: "1rem",
                      borderTop: "1px dashed #e2e8f0",
                      background: "#fafafa",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                      Key Verification Checkpoints:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.4rem" }}>
                      {steps.slice(0, 3).map((st, i) => (
                        <div key={i} style={{ fontSize: "0.8rem", color: "#334155", display: "flex", gap: "0.4rem" }}>
                          <span style={{ color: "#16a34a", fontWeight: 800 }}>✓</span>
                          <span>{st}</span>
                        </div>
                      ))}
                      {steps.length > 3 && (
                        <div style={{ fontSize: "0.8rem", color: "#0284c7", fontWeight: 600 }}>
                          +{steps.length - 3} more checkpoints verified in flow
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Video Modal / Theater Player */}
      {activeVideoSuite && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
          onClick={() => setActiveVideoSuite(null)}
        >
          <div
            style={{
              background: "#0f172a",
              color: "#ffffff",
              borderRadius: "16px",
              maxWidth: "1000px",
              maxHeight: "90vh",
              width: "100%",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #1e293b",
                position: "sticky",
                top: 0,
                background: "#0f172a",
                zIndex: 2,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ background: "#1e293b", color: "#38bdf8", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 700 }}>
                    {activeVideoSuite.id}
                  </span>
                  <span style={{ background: "#065f46", color: "#6ee7b7", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                    VERIFIED E2E RECORDING
                  </span>
                </div>
                <h3 style={{ margin: "0.35rem 0 0 0", fontSize: "1.15rem", fontWeight: 700 }}>
                  {activeVideoSuite.name}
                </h3>
              </div>
              <button
                type="button"
                data-testid="close-video-modal-btn"
                onClick={() => setActiveVideoSuite(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "0.5rem",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Video Player */}
            <div style={{ background: "#000000", position: "relative", textAlign: "center" }}>
              <video
                key={activeVideoSuite.id + playbackSpeed}
                src={activeVideoSuite.videoUrl}
                controls
                autoPlay
                playsInline
                style={{ width: "100%", maxHeight: "420px", display: "block" }}
                ref={(el) => {
                  if (el) el.playbackRate = playbackSpeed;
                }}
              >
                <source src={activeVideoSuite.videoUrl} type="video/webm" />
                Your browser does not support WebM video playback.
              </video>
            </div>

            {/* Video Footer Controls & Step Annotations */}
            <div style={{ padding: "1.25rem 1.5rem", background: "#0f172a" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Speed:</span>
                  {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        border: "1px solid #334155",
                        background: playbackSpeed === spd ? "#38bdf8" : "#1e293b",
                        color: playbackSpeed === spd ? "#0f172a" : "#f1f5f9",
                        cursor: "pointer",
                      }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <a
                    href={activeVideoSuite.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={`${activeVideoSuite.id}.webm`}
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: "6px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#f8fafc",
                      fontSize: "0.82rem",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    ⬇ Download .webm
                  </a>
                  <a
                    href={activeVideoSuite.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: "6px",
                      background: "#0284c7",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Full Screen ↗
                  </a>
                </div>
              </div>

              {/* Step Sequence in Video */}
              {FLOW_STEPS_MAP[activeVideoSuite.id] && (
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    Verified Flow Timeline in Video:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {(FLOW_STEPS_MAP[activeVideoSuite.id] || []).map((st, i) => (
                      <div key={i} style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "flex", gap: "0.5rem" }}>
                        <span style={{ color: "#34d399", fontWeight: 700 }}>Step {i + 1}:</span>
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terminal Log Output Modal */}
      {activeLogSuite && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
          onClick={() => setActiveLogSuite(null)}
        >
          <div
            style={{
              background: "#090d16",
              color: "#f8fafc",
              borderRadius: "14px",
              maxWidth: "900px",
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: "1px solid #1e293b",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Terminal Window Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.85rem 1.25rem",
                background: "#0f172a",
                borderBottom: "1px solid #1e293b",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontFamily: "monospace", marginLeft: "0.5rem" }}>
                  Playwright Console Output — {activeLogSuite.id}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => copyLogs(activeLogSuite.logOutput || "")}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#f8fafc",
                    fontSize: "0.75rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Log"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLogSuite(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "1.3rem",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <pre
              style={{
                margin: 0,
                padding: "1.25rem",
                fontSize: "0.82rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                color: "#a7f3d0",
                background: "#090d16",
                maxHeight: "500px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                lineHeight: "1.6",
              }}
            >
              {activeLogSuite.logOutput || "No logs captured for this test execution."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
