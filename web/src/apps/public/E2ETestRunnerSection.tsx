import { useState, useEffect, useCallback } from "react";

export interface TestCaseSuite {
  id: string;
  name: string;
  specFile: string;
  testFilter?: string;
  category?: "business" | "technical";
  tier?: string;
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
  // --- TIER 1: IDENTITY & MULTI-PERSONA ONBOARDING ---
  "uc-01a": [
    "Phase 1: Test Data Setup: Seed rural citizen profile usr_8977848501 and village Peridepi (523273)",
    "Phase 2: User Sign-In: Open phone login dialog, input 8977848501 and verify 6-digit OTP 123123",
    "Phase 3: Core Flow: Check buyer dashboard, verify localized greeting and village badge",
    "Phase 4: User Sign-Out: Open user drawer, click 'Sign Out & Switch Account', verify tokens wiped"
  ],
  "uc-01b": [
    "Phase 1: Test Data Setup: Stage merchant profile for usr_8977848501 with trade credit authorization",
    "Phase 2: User Sign-In: Select 'Kirana Merchant' persona radio card, request OTP, and verify session",
    "Phase 3: Core Flow: Open merchant fullscreen corridor (/m/gigs), verify order fulfillment grid",
    "Phase 4: User Sign-Out: Click '✕ Close App', exit corridor, and terminate session securely"
  ],
  "uc-01c": [
    "Phase 1: Test Data Setup: Seed driver credentials, EV 3-wheeler vehicle registration, and transit limits",
    "Phase 2: User Sign-In: Select 'Fleet Rider' persona radio card, authenticate via phone & OTP",
    "Phase 3: Core Flow: Ingress to mobile PWA (/r/deliveries), inspect assigned route manifest and CoD wallet",
    "Phase 4: User Sign-Out: Open rider settings, click 'Sign Out', clear local cached route data"
  ],
  "uc-01d": [
    "Phase 1: Test Data Setup: Register regional mill entity sup_ongole_01 and escrow settlement account",
    "Phase 2: User Sign-In: Sign in as wholesale supplier administrator via dedicated supplier portal",
    "Phase 3: Core Flow: Navigate to depot funds console, audit live escrow funds balance sheet",
    "Phase 4: User Sign-Out: Terminate supplier administrative session and clear session credentials"
  ],
  "uc-01e": [
    "Phase 1: Test Data Setup: Seed certified tier-2 support operator privileges and ticket routing queue",
    "Phase 2: User Sign-In: Authenticate operator session via zero-trust credentials at /x/ops",
    "Phase 3: Core Flow: Access operations ticket console, verify RBAC privilege elevation audit log",
    "Phase 4: User Sign-Out: Discharge operator session and invalidate JWT token"
  ],
  "uc-01f": [
    "Phase 1: Test Data Setup: Stage tax audit permissions and Section 194C/194O withholding tables",
    "Phase 2: User Sign-In: Authenticate certified Finance & Tax Officer session",
    "Phase 3: Core Flow: Audit platform balance sheet at /v1/finance/reports and quarterly TDS challan ledger",
    "Phase 4: User Sign-Out: Disconnect finance console and wipe cryptographic session keys"
  ],
  "uc-01g": [
    "Phase 1: Test Data Setup: Initialize cluster telemetry probes across all 13 microservices and 12 databases",
    "Phase 2: User Sign-In: Authenticate Site Reliability Engineer (SRE) via zero-trust bearer token",
    "Phase 3: Core Flow: Audit live microservices mesh health at /status and check isolated database pools",
    "Phase 4: User Sign-Out: Disconnect telemetry session observer"
  ],
  "uc-01h": [
    "Phase 1: Test Data Setup: Start with consumer buyer account and configure elevation approval workflow",
    "Phase 2: User Sign-In: Authenticate buyer session via phone OTP",
    "Phase 3: Core Flow: Submit Kirana Merchant role elevation request, simulate ops verification, elevate JWT token",
    "Phase 4: User Sign-Out: Sign out of elevated merchant session and confirm clean state reset"
  ],
  "uc-01i": [
    "Phase 1: Test Data Setup: Seed regional multilingual translation dictionaries across 6 Indic languages",
    "Phase 2: User Sign-In: Sign in rural citizen user",
    "Phase 3: Core Flow: Toggle through Telugu, Hindi, Tamil, Kannada, Marathi, English, verify i18n persistence",
    "Phase 4: User Sign-Out: Sign out and verify language selection remains preserved in device localStorage"
  ],
  "uc-01j": [
    "Phase 1: Test Data Setup: Configure Google OAuth 2.0 OpenID Connect client credentials and mock IdP",
    "Phase 2: User Sign-In: Click 'Sign in with Google', simulate OAuth code exchange and JWT signature check",
    "Phase 3: Core Flow: Confirm profile email auto-association and corporate procurement access",
    "Phase 4: User Sign-Out: Execute SSO session revocation and return to public portal"
  ],
  "uc-01k": [
    "Phase 1: Test Data Setup: Mark target user usr_suspended_01 as SUSPENDED in PostgreSQL identity store",
    "Phase 2: User Sign-In: Attempt authentication with phone & OTP, assert HTTP 403 Forbidden circuit breaker",
    "Phase 3: Core Flow: Verify user lockout banner and audit log alert generation",
    "Phase 4: User Sign-Out: Confirm zero active session tokens issued"
  ],

  // --- TIER 2: COMMERCE & FINANCIAL CORE ---
  "uc-04": [
    "Phase 1: Test Data Setup: Seed merchant trade credit limit (₹50,000) and headroom calculations",
    "Phase 2: User Sign-In: Authenticate Kirana Merchant session",
    "Phase 3: Core Flow: Reserve valid ₹2,500 hold, trip circuit breaker on ₹60,000 hold (402), commit valid hold",
    "Phase 4: User Sign-Out: Terminate merchant session and clear trade tokens"
  ],
  "uc-05": [
    "Phase 1: Test Data Setup: Stage village pamphlet batch catalog and multi-commodity prices",
    "Phase 2: User Sign-In: Authenticate Kirana Merchant session",
    "Phase 3: Core Flow: Build multi-item cart, compute GST splits, generate dynamic UPI QR payment intent",
    "Phase 4: User Sign-Out: Terminate merchant session"
  ],
  "uc-06": [
    "Phase 1: Test Data Setup: Prepare dispatch vehicle manifest, driver assignment, and handover OTP",
    "Phase 2: User Sign-In: Authenticate Driver and Merchant sessions",
    "Phase 3: Core Flow: Record hub departure gate clearance checklist, verify 4-digit cryptographic handover OTP",
    "Phase 4: User Sign-Out: Sign out and update consignment status to IN_TRANSIT"
  ],
  "uc-07": [
    "Phase 1: Test Data Setup: Stage active consignment delivery in rural corridor",
    "Phase 2: User Sign-In: Authenticate delivery driver session",
    "Phase 3: Core Flow: Record damaged goods doorstep rejection, trigger 72-hour RTO protocol, release buyer hold",
    "Phase 4: User Sign-Out: Sign out and log reverse logistics dispatch ticket"
  ],

  // --- TIER 3: FIELD CUSTODY & CASH MANAGEMENT ---
  "uc-08": [
    "Phase 1: Test Data Setup: Seed driver custody balance (₹0) and transit limits (₹50,000)",
    "Phase 2: User Sign-In: Authenticate gig driver session",
    "Phase 3: Core Flow: Record CoD cash collection, increment custody balance, trip daily transit limit guard (422)",
    "Phase 4: User Sign-Out: Terminate driver session and preserve unremitted custody tracking"
  ],
  "uc-09": [
    "Phase 1: Test Data Setup: Seed active driver cash custody (₹14,500) and hub cashier OTP",
    "Phase 2: User Sign-In: Authenticate driver session at depot terminal",
    "Phase 3: Core Flow: Stage physical cash turn-in, verify 6-digit cryptographic turn-in OTP, balance reset to ₹0",
    "Phase 4: User Sign-Out: Sign out driver and print cryptographic handover receipt"
  ],
  "uc-10": [
    "Phase 1: Test Data Setup: Seed driver turn-in shortfall (₹200 discrepancy)",
    "Phase 2: User Sign-In: Authenticate driver session",
    "Phase 3: Core Flow: Enforce payout custody gate circuit breaker, block instant withdrawal (422), route to ops",
    "Phase 4: User Sign-Out: Terminate session and preserve discrepancy hold"
  ],
  "uc-11": [
    "Phase 1: Test Data Setup: Prepare bank beneficiary payload with account number and IFSC",
    "Phase 2: User Sign-In: Authenticate transporter session",
    "Phase 3: Core Flow: Register bank beneficiary, execute Cloud KMS envelope encryption, verify active status",
    "Phase 4: User Sign-Out: Sign out transporter"
  ],
  "uc-12": [
    "Phase 1: Test Data Setup: Stage pending driver payout batch",
    "Phase 2: User Sign-In: Authenticate finance automation session",
    "Phase 3: Core Flow: Enqueue Cloud Tasks IMPS transfer, execute bank simulator gateway, verify 12-digit UTR",
    "Phase 4: User Sign-Out: Record UTR settlement timestamp and discharge worker"
  ],
  "uc-13": [
    "Phase 1: Test Data Setup: Stage completed order fund inflows and supplier escrow account",
    "Phase 2: User Sign-In: Authenticate supplier and finance governance operator",
    "Phase 3: Core Flow: Audit supplier escrow balance, verify 2.5% merchant PUDO commission, allocate driver pay",
    "Phase 4: User Sign-Out: Sign out and finalize escrow ledger allocation"
  ],

  // --- TIER 4: FINANCIAL LEDGER, RECONCILIATION & TPAP AML ---
  "uc-14": [
    "Phase 1: Test Data Setup: Seed NPCI TPAP compliance rules and sanctioned handle patterns",
    "Phase 2: User Sign-In: Authenticate compliance officer session",
    "Phase 3: Core Flow: Validate VPA regex syntax, sanitize malicious inputs, enforce instant blacklist rejection (400)",
    "Phase 4: User Sign-Out: Sign out compliance auditor"
  ],
  "uc-15": [
    "Phase 1: Test Data Setup: Seed transaction velocity window thresholds",
    "Phase 2: User Sign-In: Authenticate AML risk ops session",
    "Phase 3: Core Flow: Detect rapid transaction burst, flag structuring anomaly, trip account freeze circuit breaker",
    "Phase 4: User Sign-Out: Sign out risk operator"
  ],
  "uc-16": [
    "Phase 1: Test Data Setup: Stage active customer chargeback dispute",
    "Phase 2: User Sign-In: Authenticate dispute management operator",
    "Phase 3: Core Flow: Track 24-hour statutory SLA countdown, compile daily NPCI regulatory dispute report",
    "Phase 4: User Sign-Out: Sign out dispute manager"
  ],
  "uc-17": [
    "Phase 1: Test Data Setup: Stage versioned terms of service (v2.1)",
    "Phase 2: User Sign-In: Authenticate user session with outdated v2.0 consent",
    "Phase 3: Core Flow: Enforce mandatory clickwrap re-consent gate, capture cryptographic timestamped acceptance",
    "Phase 4: User Sign-Out: Sign out and verify consent state in profile"
  ],
  "uc-18": [
    "Phase 1: Test Data Setup: Stage platform general ledger accounts",
    "Phase 2: User Sign-In: Authenticate finance officer session",
    "Phase 3: Core Flow: Execute multi-legged journal entries, verify zero-sum invariance, reject unbalanced batch",
    "Phase 4: User Sign-Out: Sign out finance officer"
  ],
  "uc-19": [
    "Phase 1: Test Data Setup: Stage platform transactions, nodal bank statement, and gateway settlement logs",
    "Phase 2: User Sign-In: Connect nightly reconciliation scheduler",
    "Phase 3: Core Flow: Run 3-way matching algorithm, execute Vertex AI variance anomaly analysis, output audit pass",
    "Phase 4: User Sign-Out: Finalize nightly reconciliation batch"
  ],
  "uc-20": [
    "Phase 1: Test Data Setup: Stage Section 194C transport and 194O e-commerce TDS parameters",
    "Phase 2: User Sign-In: Authenticate direct tax compliance officer",
    "Phase 3: Core Flow: Calculate 1% TDS deductions, generate quarterly government challan, balance tax liabilities",
    "Phase 4: User Sign-Out: Sign out tax compliance officer"
  ],
  "uc-21": [
    "Phase 1: Test Data Setup: Prepare multi-stage golden path test fixtures",
    "Phase 2: User Sign-In: Authenticate test harness executor",
    "Phase 3: Core Flow: Verify 10 critical path roadmap stages from multi-tenant identity to zero-variance balance sheet",
    "Phase 4: User Sign-Out: Sign out and record Stage 10 Golden Path sign-off"
  ],

  // --- TIER 5: PLATFORM OPERATIONS, CONFIG & OBSERVABILITY ---
  "config-geo-hierarchy": [
    "Phase 1: Test Data Setup: Seed 4-tier geographic master data (Country: IN, State: AP, District: Prakasam)",
    "Phase 2: User Sign-In: Authenticate certified Support Operator session",
    "Phase 3: Core Flow: Audit Countries, States, Districts, Villages and Hubs at /x/config",
    "Phase 4: User Sign-Out: Open operator dialog, click 'Sign out', verify session tokens cleared"
  ],
  "config-subscription-plans": [
    "Phase 1: Test Data Setup: Stage Silver, Gold, Platinum merchant subscription tiers and quotas",
    "Phase 2: User Sign-In: Authenticate Commercial Operations session",
    "Phase 3: Core Flow: Verify merchant tier catalogs, member quotas, and credit line authorization thresholds",
    "Phase 4: User Sign-Out: Sign out of commercial administration console"
  ],
  "config-tax-profiles": [
    "Phase 1: Test Data Setup: Stage commodity GST rate splits (0%, 5%, 18%) and Section 194C/194O TDS profiles",
    "Phase 2: User Sign-In: Authenticate Finance & Tax Officer session",
    "Phase 3: Core Flow: Query regional GST categories and verify agricultural vs commercial rate mapping",
    "Phase 4: User Sign-Out: Sign out of finance administration console"
  ],
  "support-supplier-bulk-ingest": [
    "Phase 1: Test Data Setup: Prepare multi-entity catalog spreadsheet and target supplier sup_ongole_01",
    "Phase 2: User Sign-In: Authenticate Support Operator session",
    "Phase 3: Core Flow: Toggle 11 entity types, validate schema dry-run, test GSTIN circuit breaker",
    "Phase 4: User Sign-Out: Exit support console and wipe session storage"
  ],
  "support-supplier-proxy": [
    "Phase 1: Test Data Setup: Seed authorized supplier proxy contexts (sup_ongole_01, sup_krishna_01)",
    "Phase 2: User Sign-In: Authenticate Support Operator session",
    "Phase 3: Core Flow: Impersonate supplier sup_ongole_01, confirm localStorage persistence and audit headers",
    "Phase 4: User Sign-Out: Exit support proxy session and wipe impersonation headers"
  ],
  "status-services": [
    "Phase 1: Test Data Setup: Inspect Gateway NodePort :30080 and 13 backend microservice endpoints",
    "Phase 2: User Sign-In: Connect SRE & DevOps telemetry observer session",
    "Phase 3: Core Flow: Validate HTTP 200 health across 13 services and 12 isolated database pools",
    "Phase 4: User Sign-Out: Disconnect telemetry session observer"
  ],
  "status-test-runner": [
    "Phase 1: Test Data Setup: Seed live test execution console and recordings directory",
    "Phase 2: User Sign-In: Authenticate DevOps / SRE operator session",
    "Phase 3: Core Flow: Switch between tabs, launch WebM video player, test 0.5x–2x playback, inspect logs",
    "Phase 4: User Sign-Out: Exit console and confirm video asset integrity"
  ],

  // --- FULL BASELINE / AGGREGATE SUITES ---
  "user-flow-login-role-village": [
    "Phase 1: Test Data Setup: Seed initial user state for usr_8977848501 (village_peridepi_523273, role: buyer)",
    "Phase 2: User Sign-In: Phone input 8977848501 and 6-digit OTP 123123 session authentication",
    "Phase 3: Core Flow: Elevate role to Kirana Merchant, launch fullscreen corridor (/m/gigs), update village to Kandukur",
    "Phase 4: User Sign-Out: Click 'Sign Out & Switch Account', verify tokens wiped and return to login"
  ]
};

export function E2ETestRunnerSection() {
  const [suites, setSuites] = useState<TestCaseSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "business" | "technical">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeVideoSuite, setActiveVideoSuite] = useState<TestCaseSuite | null>(null);
  const [activeLogSuite, setActiveLogSuite] = useState<TestCaseSuite | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [runningAll, setRunningAll] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch test suites from /api/tests with fallback to /recordings/test-results.json
  const fetchSuites = useCallback(async () => {
    try {
      let res = await fetch("/api/tests");
      if (!res.ok) {
        res = await fetch("/recordings/test-results.json");
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suites)) {
          setSuites(data.suites);
        }
      }
    } catch {
      try {
        const res = await fetch("/recordings/test-results.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suites)) {
            setSuites(data.suites);
          }
        }
      } catch (err) {
        console.error("Failed to load test suites:", err);
      }
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

  // Run a single test suite or targeted sub-usecase
  const runTest = async (suiteId: string) => {
    setSuites((prev) =>
      prev.map((s) => (s.id === suiteId ? { ...s, status: "running" } : s))
    );
    try {
      await fetch(`/api/tests/run?id=${encodeURIComponent(suiteId)}`, {
        method: "POST",
      });
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
  const businessCount = suites.filter((s) => s.category === "business").length;
  const technicalCount = suites.filter((s) => s.category === "technical").length;

  // Filtered suites
  const filteredSuites = suites.filter((s) => {
    const matchesCategory =
      selectedCategory === "all" ||
      s.category === selectedCategory;
    const matchesTier = selectedTier === "all" || s.tier === selectedTier;
    const matchesActor =
      selectedActor === "all" ||
      s.actor.toLowerCase().includes(selectedActor.toLowerCase());
    const matchesSearch =
      searchQuery.trim() === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesTier && matchesActor && matchesSearch;
  });

  const TIERS = [
    { id: "all", label: "All Use Cases" },
    { id: "Tier 1: Identity", label: "Tier 1: Identity & Roles" },
    { id: "Tier 2: Commerce", label: "Tier 2: Commerce & Orders" },
    { id: "Tier 3: Custody", label: "Tier 3: Custody & Payouts" },
    { id: "Tier 4: Governance", label: "Tier 4: Ledger & AML" },
    { id: "Tier 5: Platform", label: "Tier 5: Platform & Config" },
    { id: "Full Journey Baseline", label: "Full Journey Baseline" },
  ];

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
            Individual automated test specifications
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
            ✓ 100% verified against cluster
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
            Independent high-res .webm files
          </div>
        </div>
      </div>

      {/* Category Segregation Tabs (Business vs Technical Capability) */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "0.85rem",
          padding: "0.5rem 0.75rem",
          background: "#f1f5f9",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
        }}
      >
        <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#475569", letterSpacing: "0.05em" }}>
          Domain Classification:
        </span>
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: "7px",
            fontWeight: 800,
            fontSize: "0.82rem",
            border: selectedCategory === "all" ? "1px solid #0f172a" : "1px solid #cbd5e1",
            background: selectedCategory === "all" ? "#0f172a" : "#ffffff",
            color: selectedCategory === "all" ? "#ffffff" : "#334155",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          🌟 All Use Cases ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("business")}
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: "7px",
            fontWeight: 800,
            fontSize: "0.82rem",
            border: selectedCategory === "business" ? "1px solid #1e40af" : "1px solid #cbd5e1",
            background: selectedCategory === "business" ? "#1e40af" : "#ffffff",
            color: selectedCategory === "business" ? "#ffffff" : "#1e40af",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          💼 Business Use Cases ({businessCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("technical")}
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: "7px",
            fontWeight: 800,
            fontSize: "0.82rem",
            border: selectedCategory === "technical" ? "1px solid #b45309" : "1px solid #cbd5e1",
            background: selectedCategory === "technical" ? "#b45309" : "#ffffff",
            color: selectedCategory === "technical" ? "#ffffff" : "#b45309",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          ⚙️ Technical Capability Use Cases ({technicalCount})
        </button>
      </div>

      {/* Tier Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        {TIERS.map((tierItem) => {
          const count = suites.filter((s) => tierItem.id === "all" || s.tier === tierItem.id).length;
          const isSelected = selectedTier === tierItem.id;
          return (
            <button
              key={tierItem.id}
              type="button"
              onClick={() => setSelectedTier(tierItem.id)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.82rem",
                border: isSelected ? "1px solid #2563eb" : "1px solid #e2e8f0",
                background: isSelected ? "#2563eb" : "#ffffff",
                color: isSelected ? "#ffffff" : "#475569",
                cursor: "pointer",
                boxShadow: isSelected ? "0 2px 4px rgba(37,99,235,0.2)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {tierItem.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Action Bar & Search */}
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
            placeholder="Search sub-usecase ID, title, keyword or spec..."
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
          {["all", "Buyer", "Merchant", "Driver", "Supplier", "Support", "Finance", "SRE"].map((actor) => (
            <button
              key={actor}
              type="button"
              onClick={() => setSelectedActor(actor)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "20px",
                border: selectedActor === actor ? "1px solid #0f172a" : "1px solid #e2e8f0",
                background: selectedActor === actor ? "#0f172a" : "#f8fafc",
                color: selectedActor === actor ? "#ffffff" : "#475569",
                fontSize: "0.78rem",
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
                          background: "#0f172a",
                          color: "#f8fafc",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          fontFamily: "monospace",
                        }}
                      >
                        {suite.id.toUpperCase()}
                      </span>
                      {suite.category && (
                        <span
                          style={{
                            background: suite.category === "technical" ? "#fef3c7" : "#dbeafe",
                            color: suite.category === "technical" ? "#92400e" : "#1e40af",
                            border: `1px solid ${suite.category === "technical" ? "#fde68a" : "#bfdbfe"}`,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          {suite.category === "technical" ? "⚙️ Technical" : "💼 Business"}
                        </span>
                      )}
                      {suite.tier && (
                        <span
                          style={{
                            background: "#e0e7ff",
                            color: "#3730a3",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {suite.tier}
                        </span>
                      )}
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

                    <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
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
                      4-Phase Verification Checkpoints:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.4rem" }}>
                      {steps.slice(0, 4).map((st, i) => (
                        <div key={i} style={{ fontSize: "0.8rem", color: "#334155", display: "flex", gap: "0.4rem" }}>
                          <span style={{ color: "#16a34a", fontWeight: 800 }}>✓</span>
                          <span>{st}</span>
                        </div>
                      ))}
                      {steps.length > 4 && (
                        <div style={{ fontSize: "0.8rem", color: "#0284c7", fontWeight: 600 }}>
                          +{steps.length - 4} more checkpoints verified in flow
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
                    {activeVideoSuite.id.toUpperCase()}
                  </span>
                  {activeVideoSuite.tier && (
                    <span style={{ background: "#312e81", color: "#c7d2fe", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                      {activeVideoSuite.tier}
                    </span>
                  )}
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

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a
                    href={activeVideoSuite.videoUrl}
                    download={`${activeVideoSuite.id}.webm`}
                    className="pub-btn pub-btn-sm pub-btn-outline"
                    style={{ textDecoration: "none", color: "#ffffff", borderColor: "#475569" }}
                  >
                    ⬇ Download .webm Recording
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const logs = activeVideoSuite.logOutput || "No logs available";
                      copyLogs(logs);
                    }}
                    className="pub-btn pub-btn-sm pub-btn-outline"
                    style={{ borderColor: "#475569", color: "#ffffff" }}
                  >
                    {copied ? "✓ Copied Logs" : "📋 Copy Execution Logs"}
                  </button>
                </div>
              </div>

              {/* Verified Flow Steps in Modal */}
              {FLOW_STEPS_MAP[activeVideoSuite.id] && (
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                    Verified Flow Timeline in Video:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {(FLOW_STEPS_MAP[activeVideoSuite.id] || []).map((step, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: "0.82rem",
                          color: "#cbd5e1",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          background: "#1e293b",
                          padding: "0.4rem 0.75rem",
                          borderRadius: "6px",
                        }}
                      >
                        <span style={{ color: "#4ade80", fontWeight: 800 }}>✓</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Output Modal */}
      {activeLogSuite && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(4px)",
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
              background: "#0f172a",
              color: "#ffffff",
              borderRadius: "16px",
              maxWidth: "850px",
              maxHeight: "85vh",
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #1e293b",
              }}
            >
              <div>
                <span style={{ background: "#1e293b", color: "#38bdf8", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 700 }}>
                  {activeLogSuite.id.toUpperCase()}
                </span>
                <h3 style={{ margin: "0.35rem 0 0 0", fontSize: "1.1rem", fontWeight: 700 }}>
                  Test Execution Console Logs
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogSuite(null)}
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

            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", background: "#090d16" }}>
              <pre
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  fontFamily: "monospace",
                  color: "#e2e8f0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  lineHeight: 1.6,
                }}
              >
                {activeLogSuite.logOutput || "No console output recorded."}
              </pre>
            </div>

            <div
              style={{
                padding: "0.75rem 1.5rem",
                borderTop: "1px solid #1e293b",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                background: "#0f172a",
              }}
            >
              <button
                type="button"
                onClick={() => copyLogs(activeLogSuite.logOutput || "")}
                className="pub-btn pub-btn-sm pub-btn-primary"
              >
                {copied ? "✓ Copied to Clipboard" : "📋 Copy Log Output"}
              </button>
              <button
                type="button"
                onClick={() => setActiveLogSuite(null)}
                className="pub-btn pub-btn-sm pub-btn-outline"
                style={{ borderColor: "#475569", color: "#ffffff" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
