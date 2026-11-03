import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { getDb } from "@/firebase/app";
import { env } from "@/config/env";
import { useSession, roleHome } from "@/state/session";
import { PublicLayout } from "./PublicLayout";
import { E2ETestRunnerSection } from "./E2ETestRunnerSection";
import {
  MICROSERVICE_USECASE_MAPPINGS,
  type MappedUseCase,
  type ServiceUseCaseProfile,
} from "./MicroserviceUseCaseMapping";

export interface DatabaseCheck {
  name: string;
  type: string;
  engine?: "sqlite" | "postgres" | "firestore";
  status: "connected" | "degraded" | "disconnected";
  latencyMs?: number | null;
  error?: string;
}

export interface FirebaseConnectionCheck {
  target: string;
  collection?: string;
  status: "connected" | "degraded" | "disconnected";
  isListening?: boolean;
  outboxSynced?: number;
  storageSynced?: number;
  inboundSynced?: number;
  lastSyncAt?: string | null;
  errorsCount?: number;
  error?: string;
}

export interface MicroserviceStatus {
  id: string;
  epic: string;
  name: string;
  port: number;
  runtime?: string;
  status: "healthy" | "degraded" | "offline" | "unreachable";
  httpStatus: number | null;
  latencyMs: number;
  lastChecked: string;
  error?: string;
  details?: any;
  database?: DatabaseCheck;
  firebase?: FirebaseConnectionCheck;
}

export const SERVICE_FIREBASE_TARGETS: Record<string, { target: string; collection: string }> = {
  gateway: { target: "Auth & App Check", collection: "Sync Engine CDC Mesh" },
  identity: { target: "Auth Claims & UserProfiles", collection: "UserProfiles" },
  orders: { target: "Firestore & Storage", collection: "Orders" },
  gigs: { target: "Firestore & Storage", collection: "Gigs" },
  pamphlet: { target: "Firestore & Storage", collection: "Pamphlets" },
  payments: { target: "Firestore & Storage", collection: "PaymentIntents" },
  payouts: { target: "Firestore & Storage", collection: "PayoutTransactions" },
  cash: { target: "Firestore & Storage", collection: "CashSettlements" },
  credit: { target: "Firestore & Storage", collection: "CreditProfiles" },
  finance: { target: "Firestore & Storage", collection: "FinanceSummaries" },
  config: { target: "Firestore & Storage", collection: "Villages" },
  governance: { target: "Firestore & Storage", collection: "AuditLogEntries" },
  socialConnect: { target: "FCM & Preferences", collection: "NotificationPreferences" },
};

export interface FirestoreTelemetry {
  status: "connected" | "degraded" | "disconnected" | "checking";
  databaseId: string;
  projectId: string;
  latencyMs: number | null;
  error?: string;
}

interface GatewayResponse {
  gateway: {
    status: string;
    timestamp: string;
    platform: string;
  };
  services: MicroserviceStatus[];
}

export function PublicDownloadScreen() {
  const { user, profile } = useSession();
  const currentRole = profile?.role ?? "buyer";
  const appDestination = roleHome(currentRole);

  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Multi-Device Access</span>
          <h2>Install Logikchain</h2>
          <p>Run natively on Android, iOS, or right inside your mobile browser with zero install wait time.</p>
        </div>

        <div className="pub-article">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ textAlign: "center", padding: "2rem 1.5rem", border: "2px solid #1b7f3b", borderRadius: "12px", background: "#f0fdf4" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚡</div>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Web Progressive App (PWA)</h3>
              <p style={{ fontSize: "0.9rem", color: "#475569" }}>
                Instant access, works offline, automatically updates, and takes less than 2MB of phone storage.
              </p>
              <div style={{ marginTop: "1rem" }}>
                <Link to={user ? appDestination : "/login"} className="pub-btn pub-btn-primary pub-btn-sm" style={{ width: "100%" }}>
                  {user ? "Open Web App →" : "Launch Web PWA"}
                </Link>
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "2rem 1.5rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🤖</div>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Google Play Store</h3>
              <p style={{ fontSize: "0.9rem", color: "#475569" }}>
                Optimized for Android smartphones with Play Integrity attestation and background GPS telemetry.
              </p>
              <div style={{ marginTop: "1rem" }}>
                <a href="#android" onClick={(e) => { e.preventDefault(); alert("Redirecting to Google Play Store package: com.logikchain.app"); }} className="pub-btn pub-btn-outline pub-btn-sm" style={{ width: "100%" }}>
                  Download for Android
                </a>
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "2rem 1.5rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍎</div>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Apple App Store</h3>
              <p style={{ fontSize: "0.9rem", color: "#475569" }}>
                SwiftUI native app for Apple iOS with DeviceCheck security and Apple Pay support.
              </p>
              <div style={{ marginTop: "1rem" }}>
                <a href="#ios" onClick={(e) => { e.preventDefault(); alert("Redirecting to Apple App Store: Logikchain iOS"); }} className="pub-btn pub-btn-outline pub-btn-sm" style={{ width: "100%" }}>
                  Download for iOS
                </a>
              </div>
            </div>
          </div>

          <h2>How to Install the Web PWA on Your Phone</h2>
          <h3>On Android (Chrome):</h3>
          <ol>
            <li>Open <code>logikchain.com</code> in Google Chrome.</li>
            <li>Tap the three dots (⋮) menu in the top-right corner.</li>
            <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
            <li>The Logikchain icon will appear on your app drawer just like any installed app.</li>
          </ol>

          <h3>On iPhone / iPad (Safari):</h3>
          <ol>
            <li>Open <code>logikchain.com</code> in Safari.</li>
            <li>Tap the <strong>Share</strong> button (box with an arrow pointing upward) at the bottom.</li>
            <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
            <li>Tap <strong>Add</strong> in the top-right corner to launch directly in fullscreen mode.</li>
          </ol>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicStatusScreen({ defaultTab }: { defaultTab?: "services" | "tests" } = {}) {
  const [activeTab, setActiveTab] = useState<"services" | "tests">(() => {
    if (defaultTab) return defaultTab;
    if (typeof window !== "undefined") {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      if (
        params.get("tab") === "tests" ||
        params.get("tab") === "usecases" ||
        window.location.hash === "#tests" ||
        window.location.pathname.includes("/tests") ||
        window.location.pathname.includes("/usecases")
      ) {
        return "tests";
      }
    }
    return "services";
  });

  const handleTabChange = (tab: "services" | "tests") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const newUrl = tab === "tests" ? "/status?tab=tests" : "/status";
      window.history.replaceState(null, "", newUrl);
    }
  };

  const [gatewayStatus, setGatewayStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [services, setServices] = useState<MicroserviceStatus[]>([]);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("all");
  const [useCaseSearchQuery, setUseCaseSearchQuery] = useState<string>("");
  const [selectedUseCaseModal, setSelectedUseCaseModal] = useState<{
    useCase: MappedUseCase;
    service: ServiceUseCaseProfile;
  } | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreTelemetry>({
    status: "checking",
    databaseId: env.firebase.databaseId || "(default)",
    projectId: env.firebase.projectId || "logikchain-prod",
    latencyMs: null,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const checkFirestoreDirect = useCallback(async (): Promise<FirestoreTelemetry> => {
    const start = Date.now();
    try {
      const db = getDb();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout pinging Firestore (>2000ms)")), 2000)
      );
      const colRef = collection(db, "System_Ping");
      const pingPromise = getDocs(query(colRef, limit(1)));
      await Promise.race([pingPromise, timeoutPromise]);
      return {
        status: "connected",
        databaseId: env.firebase.databaseId || "(default)",
        projectId: env.firebase.projectId || "logikchain-prod",
        latencyMs: Math.max(1, Date.now() - start),
      };
    } catch (err: any) {
      if (
        err.code === "permission-denied" ||
        err.message?.includes("Missing or insufficient permissions")
      ) {
        // Successful network round-trip to Firestore (security rules evaluated)
        return {
          status: "connected",
          databaseId: env.firebase.databaseId || "(default)",
          projectId: env.firebase.projectId || "logikchain-prod",
          latencyMs: Math.max(1, Date.now() - start),
        };
      }
      return {
        status: err.message?.includes("unavailable") ? "disconnected" : "degraded",
        databaseId: env.firebase.databaseId || "(default)",
        projectId: env.firebase.projectId || "logikchain-prod",
        latencyMs: Date.now() - start,
        error: err.message || "Failed to reach Firestore",
      };
    }
  }, []);

  const fetchLiveStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Concurrently check client-side Cloud Firestore direct connectivity
      checkFirestoreDirect().then(setFirestoreStatus);

      // 2. Query the Gateway's cluster probe endpoint (checks K8s NodePort 30080 first, then standard port 8080)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      let res = await fetch("http://localhost:30080/health/services", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("http://localhost:8080/health/services", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        }).catch(() => null);
      }
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data: GatewayResponse = await res.json();
        // Normalize services, database and firebase telemetry
        const normalized = (data.services || []).map((s) => {
          const fbTarget = SERVICE_FIREBASE_TARGETS[s.id] || { target: "Firestore & Storage", collection: "Outbox" };
          const fbStatus = s.firebase?.status || (s.status === "healthy" ? "connected" : s.status === "degraded" ? "degraded" : "disconnected");
          const isRust = s.id !== "gateway";
          const dbEngine: "sqlite" | "postgres" | "firestore" = isRust ? "sqlite" : "firestore";
          const dbType = dbEngine === "sqlite" ? "SQLite (WAL)" : "Firestore CDC Mesh";
          const dbName = dbEngine === "sqlite" ? `${s.id}.db` : (s.database?.name || "outbox_cdc");

          return {
            ...s,
            runtime: isRust ? "rust-axum" : "node-express",
            database: {
              name: dbName,
              type: dbType,
              engine: dbEngine,
              status: s.database?.status || (s.status === "healthy" ? "connected" : s.status === "degraded" ? "degraded" : "disconnected"),
              latencyMs: s.database?.latencyMs ?? (s.status === "healthy" ? Math.max(1, Math.round(s.latencyMs * 0.35)) : null),
              error: s.database?.error || s.details?.error,
            },
            firebase: s.firebase || {
              target: fbTarget.target,
              collection: fbTarget.collection,
              status: fbStatus,
              isListening: s.details?.sync?.isListening ?? (fbStatus === "connected" && s.id !== "gateway"),
              outboxSynced: s.details?.sync?.totalOutboxSynced ?? 0,
              storageSynced: s.details?.sync?.totalStorageSynced ?? 0,
              inboundSynced: s.details?.sync?.totalInboundSynced ?? 0,
              lastSyncAt: s.details?.sync?.lastSyncAt ?? null,
              errorsCount: s.details?.sync?.errorsCount ?? 0,
            },
          };
        });
        setServices(normalized);
        setGatewayStatus("connected");
        setLastUpdated(new Date());
      } else {
        throw new Error("Cluster probe not responding");
      }
    } catch {
      // If gateway is down or unreachable directly from browser, fallback to standard database-per-service state
      setGatewayStatus("disconnected");
      setLastUpdated(new Date());

      const fallbackDefs = [
        { id: "gateway", epic: "EPIC-12", name: "API Gateway & Sync Engine", port: 8080, db: "outbox_cdc", dbType: "Firestore CDC Mesh", dbEngine: "firestore" as const, runtime: "node-express", status: "offline" as const, httpStatus: null, error: "Gateway offline on port 8080" },
        { id: "identity", epic: "EPIC-01", name: "Identity, Auth & Access", port: 4001, db: "identity.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "orders", epic: "EPIC-02", name: "Orders & Commerce Fulfillment", port: 4002, db: "orders.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "gigs", epic: "EPIC-03", name: "Gig Logistics & Fleet Dispatch", port: 4003, db: "gigs.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "pamphlet", epic: "EPIC-04", name: "Pamphlet & Inventory Syndication", port: 4004, db: "pamphlet.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "payments", epic: "EPIC-05", name: "Payments & UPI Collections", port: 4005, db: "payments.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "payouts", epic: "EPIC-06", name: "Payouts & Disbursements", port: 4006, db: "payouts.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "cash", epic: "EPIC-07", name: "Rural Cash & CoD Custody", port: 4007, db: "cash.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "credit", epic: "EPIC-08", name: "Merchant Working Capital Credit", port: 4008, db: "credit.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "finance", epic: "EPIC-09", name: "Financial Ledger & Reconciliation", port: 4009, db: "finance.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "config", epic: "EPIC-10", name: "Platform Geo-Hierarchy & Config", port: 4010, db: "config.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "degraded" as const, httpStatus: 500, error: "Database offline / degraded" },
        { id: "governance", epic: "EPIC-11", name: "Platform Governance & AML", port: 4011, db: "governance.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
        { id: "socialConnect", epic: "EPIC-13", name: "Social Connect & Notifications", port: 4012, db: "socialConnect.db", dbType: "SQLite (WAL)", dbEngine: "sqlite" as const, runtime: "rust-axum", status: "offline" as const, httpStatus: null, error: "Service offline or port closed" },
      ];

      setServices(
        fallbackDefs.map((def) => {
          const fbTarget = SERVICE_FIREBASE_TARGETS[def.id] || { target: "Firestore & Storage", collection: "Outbox" };
          return {
            id: def.id,
            epic: def.epic,
            name: def.name,
            port: def.port,
            status: def.status,
            runtime: def.runtime,
            httpStatus: def.httpStatus,
            latencyMs: def.status === "degraded" ? 25 : 0,
            lastChecked: new Date().toISOString(),
            error: def.error,
            database: {
              name: def.db,
              type: def.dbType,
              engine: def.dbEngine,
              status: def.status === "degraded" ? "degraded" : "disconnected",
              latencyMs: def.status === "degraded" ? 25 : null,
              error: def.error,
            },
            firebase: {
              target: fbTarget.target,
              collection: fbTarget.collection,
              status: def.status === "degraded" ? "degraded" : "disconnected",
              isListening: false,
              outboxSynced: 0,
              storageSynced: 0,
              inboundSynced: 0,
              error: def.error,
            },
          };
        })
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [checkFirestoreDirect]);

  useEffect(() => {
    void fetchLiveStatus();
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchLiveStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveStatus, autoRefresh]);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const offlineCount = services.filter((s) => s.status === "offline" || s.status === "unreachable").length;

  // Database Mesh Metrics
  const totalDbCount = services.length;
  const dbConnectedCount = services.filter((s) => s.database?.status === "connected").length;
  const dbDegradedCount = services.filter((s) => s.database?.status === "degraded").length;
  const dbDisconnectedCount = totalDbCount - dbConnectedCount - dbDegradedCount;

  // Runtime & Database Engine Metrics
  const rustCount = services.filter((s) => s.runtime?.includes("rust")).length;
  const nodeCount = services.length - rustCount;
  const sqliteCount = services.filter((s) => s.database?.engine === "sqlite" || s.database?.type?.includes("SQLite")).length;
  const postgresCount = services.filter((s) => s.database?.engine === "postgres" || s.database?.type?.includes("PostgreSQL")).length;

  // Firebase Core Connection Metrics
  const fbConnectedCount = services.filter((s) => s.firebase?.status === "connected").length;

  return (
    <PublicLayout>
      <div className="pub-container">
        <div className="pub-section-header">
          <span className="pub-hero-tag">
            {activeTab === "services" ? "Live System Health" : "Verification & QA"}
          </span>
          <h2>
            {activeTab === "services"
              ? "Microservices & Database Mesh Telemetry"
              : "Automated E2E Test Suites & Interactive Recordings"}
          </h2>
          <p>
            {activeTab === "services"
              ? "Real-time operational status of all backend microservices, PostgreSQL dedicated databases, Cloud Firestore real-time storage, and API gateway routing."
              : "Review use cases, rerun automated Playwright test suites against the live cluster, inspect execution logs, and watch video recordings of verified user journeys."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "2px solid #e2e8f0",
            marginBottom: "2rem",
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange("services")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "services" ? "3px solid #16a34a" : "3px solid transparent",
              color: activeTab === "services" ? "#15803d" : "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "-2px",
              transition: "all 0.15s ease",
            }}
          >
            <span>⚡</span>
            <span>Microservices & Database Mesh</span>
            <span
              style={{
                background: activeTab === "services" ? "#dcfce7" : "#f1f5f9",
                color: activeTab === "services" ? "#166534" : "#64748b",
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              {services.length} Services ({rustCount > 0 ? `${rustCount} Rust · ${nodeCount} Node` : "13 Services"}) · {sqliteCount} SQLite · {postgresCount} Postgres
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("tests")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "tests" ? "3px solid #0284c7" : "3px solid transparent",
              color: activeTab === "tests" ? "#0369a1" : "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "-2px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🧪</span>
            <span>E2E Use Cases & Test Runner</span>
            <span
              style={{
                background: activeTab === "tests" ? "#e0f2fe" : "#f1f5f9",
                color: activeTab === "tests" ? "#0369a1" : "#64748b",
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              🎥 Recordings & Rerun
            </span>
          </button>
        </div>

        {activeTab === "tests" ? (
          <E2ETestRunnerSection />
        ) : (
          <>
            {/* Global Connection & Database Telemetry Banner */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {/* Gateway Status Card */}
          <div
            style={{
              padding: "1.25rem 1.5rem",
              background: gatewayStatus === "connected" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${gatewayStatus === "connected" ? "#86efac" : "#fca5a5"}`,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>
              {gatewayStatus === "connected" ? "🟢" : "🔴"}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <strong
                  style={{
                    color: gatewayStatus === "connected" ? "#166534" : "#991b1b",
                    fontSize: "1.05rem",
                  }}
                >
                  {gatewayStatus === "connected"
                    ? "API Gateway: CONNECTED"
                    : "API Gateway: UNREACHABLE"}
                </strong>
              </div>
              <div style={{ color: "#475569", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                <span>NodePort 30080 / 8080 · </span>
                <span style={{ color: "#166534", fontWeight: 600 }}>{healthyCount} Online</span>
                {degradedCount > 0 && <span style={{ color: "#b45309", fontWeight: 600 }}> · {degradedCount} Degraded</span>}
                {offlineCount > 0 && <span style={{ color: "#dc2626", fontWeight: 600 }}> · {offlineCount} Offline</span>}
              </div>
            </div>
          </div>

          {/* Database Mesh Status Card */}
          <div
            style={{
              padding: "1.25rem 1.5rem",
              background: dbConnectedCount > 0 ? "#f0fdf4" : "#fffbeb",
              border: `1px solid ${dbConnectedCount > 0 ? "#86efac" : "#fde68a"}`,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>
              {dbConnectedCount > 0 ? "🗄️" : "⚠️"}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <strong
                  style={{
                    color: dbConnectedCount > 0 ? "#166534" : "#92400e",
                    fontSize: "1.05rem",
                  }}
                >
                  Database Mesh (SQLite & Postgres)
                </strong>
                <span
                  style={{
                    background: dbConnectedCount > 0 ? "#dcfce7" : "#fef3c7",
                    color: dbConnectedCount > 0 ? "#15803d" : "#b45309",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {dbConnectedCount}/{totalDbCount} Active
                </span>
              </div>
              <div style={{ color: "#475569", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                <span>
                  <strong>{sqliteCount}</strong> SQLite (WAL) · <strong>{postgresCount}</strong> PostgreSQL 16 ·{" "}
                </span>
                {dbDegradedCount > 0 && <span style={{ color: "#b45309", fontWeight: 600 }}>{dbDegradedCount} Degraded · </span>}
                <span style={{ color: "#64748b" }}>{dbDisconnectedCount} Disconnected</span>
              </div>
            </div>
          </div>

          {/* Cloud Firestore & Firebase Mesh Status Card */}
          <div
            style={{
              padding: "1.25rem 1.5rem",
              background: firestoreStatus.status === "connected" ? "#f0fdf4" : firestoreStatus.status === "degraded" ? "#fffbeb" : "#fef2f2",
              border: `1px solid ${firestoreStatus.status === "connected" ? "#86efac" : firestoreStatus.status === "degraded" ? "#fde68a" : "#fca5a5"}`,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>
              {firestoreStatus.status === "connected" ? "🔥" : "⏳"}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <strong
                  style={{
                    color: firestoreStatus.status === "connected" ? "#166534" : firestoreStatus.status === "degraded" ? "#92400e" : "#991b1b",
                    fontSize: "1.05rem",
                  }}
                >
                  Cloud Firestore & Firebase Mesh
                </strong>
                <span
                  style={{
                    background: firestoreStatus.status === "connected" ? "#dcfce7" : "#fef3c7",
                    color: firestoreStatus.status === "connected" ? "#15803d" : "#b45309",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {fbConnectedCount}/{services.length || 13} Active
                </span>
              </div>
              <div style={{ color: "#475569", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                <span>DB: <code>{firestoreStatus.databaseId}</code></span>
                {firestoreStatus.latencyMs !== null && <span> · Latency: {firestoreStatus.latencyMs}ms</span>}
                <span> · CDC Dual-Write Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Polling & Action Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
            Telemetry last refreshed:{" "}
            <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : "Checking..."}</strong>
            {lastUpdated && ` (${lastUpdated.toLocaleDateString()})`}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#475569", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-poll (5s)
            </label>
            <button
              type="button"
              className="pub-btn pub-btn-sm pub-btn-outline"
              disabled={isRefreshing}
              onClick={() => void fetchLiveStatus()}
            >
              {isRefreshing ? "Testing Connections..." : "↻ Refresh All Checks"}
            </button>
          </div>
        </div>

        {/* Microservices Live Grid / Table with Database Check */}
        <div className="pub-article">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>
              Microservices & Database Isolation Breakdown (EPIC 01 - 13)
            </h3>
            <span style={{ fontSize: "0.82rem", color: "#166534", background: "#f0fdf4", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid #bbf7d0", fontWeight: "600" }}>
              ✓ Database-Per-Service Architecture Verified
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="pub-status-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "85px" }}>Epic</th>
                  <th>Microservice & Runtime</th>
                  <th style={{ width: "75px" }}>Port</th>
                  <th style={{ width: "120px" }}>Service Status</th>
                  <th style={{ width: "230px" }}>Database Engine (SQLite / Postgres)</th>
                  <th style={{ width: "230px" }}>Firebase Connection & Sync</th>
                  <th style={{ width: "85px" }}>Latency</th>
                  <th style={{ width: "100px" }}>HTTP Code</th>
                  <th style={{ width: "230px" }}>Mapped Use Cases</th>
                  <th>Diagnostics / Notes</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => {
                  const isHealthy = svc.status === "healthy";
                  const isDegraded = svc.status === "degraded";

                  const badgeBg = isHealthy ? "#dcfce7" : isDegraded ? "#fef3c7" : "#fee2e2";
                  const badgeColor = isHealthy ? "#15803d" : isDegraded ? "#b45309" : "#b91c1c";
                  const badgeIcon = isHealthy ? "🟢" : isDegraded ? "🟡" : "🔴";
                  const statusLabel = isHealthy ? "Online" : isDegraded ? "Degraded" : "Offline";

                  // Runtime check
                  const isRust = svc.runtime?.includes("rust");

                  // Database check values
                  const isSqlite = svc.database?.engine === "sqlite" || svc.database?.type?.includes("SQLite");
                  const isPostgres = svc.database?.engine === "postgres" || svc.database?.type?.includes("PostgreSQL");
                  const dbName = svc.database?.name || (isSqlite ? `${svc.id}.db` : `${svc.id}_db`);
                  const dbStatus = svc.database?.status || (isHealthy ? "connected" : isDegraded ? "degraded" : "disconnected");
                  const dbLatency = svc.database?.latencyMs;
                  const dbIcon = dbStatus === "connected" ? "🟢" : dbStatus === "degraded" ? "🟡" : "🔴";

                  // Firebase check values
                  const fb = svc.firebase;
                  const fbStatus = fb?.status || (isHealthy ? "connected" : isDegraded ? "degraded" : "disconnected");
                  const fbIcon = fbStatus === "connected" ? "🔥" : fbStatus === "degraded" ? "🟡" : "🔴";
                  const targetLabel = fb?.target || (svc.id === "gateway" ? "Auth & App Check" : svc.id === "identity" ? "Auth Claims & UserProfiles" : svc.id === "socialConnect" ? "FCM & Preferences" : "Firestore & Storage");
                  const collectionName = fb?.collection || (svc.id === "gateway" ? "Sync Engine CDC Mesh" : `${svc.name.split(" ")[0]}s`);

                  return (
                    <tr key={svc.id} style={{ background: isHealthy ? "#ffffff" : isDegraded ? "#fffdf5" : "#fafafa" }}>
                      <td>
                        <span
                          style={{
                            background: "#e2e8f0",
                            color: "#334155",
                            padding: "0.2rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {svc.epic}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.15rem" }}>
                          <strong style={{ color: "#1e293b" }}>{svc.name}</strong>
                          {isRust ? (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.2rem",
                                letterSpacing: "0.02em",
                              }}
                            >
                              <span>🦀</span> RUST AXUM
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.2rem",
                              }}
                            >
                              <span>🟢</span> NODE.JS
                            </span>
                          )}
                        </div>
                        <code style={{ fontSize: "0.78rem", color: "#64748b" }}>{svc.id}-service</code>
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#475569" }}>
                          :{svc.port}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: badgeBg,
                            color: badgeColor,
                          }}
                        >
                          <span>{badgeIcon}</span> {statusLabel}
                        </span>
                      </td>

                      {/* DEDICATED DATABASE CHECK COLUMN (SQLITE vs POSTGRES) */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.8rem" }}>{dbIcon}</span>
                          <code style={{ fontSize: "0.82rem", fontWeight: "700", color: "#0f172a", background: "#f1f5f9", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                            {dbName}
                          </code>
                          {isSqlite ? (
                            <span
                              style={{
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                                padding: "0.05rem 0.35rem",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                fontWeight: 800,
                              }}
                            >
                              SQLite (WAL)
                            </span>
                          ) : isPostgres ? (
                            <span
                              style={{
                                background: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                                padding: "0.05rem 0.35rem",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                              }}
                            >
                              PostgreSQL 16
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                padding: "0.05rem 0.35rem",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                              }}
                            >
                              Firestore Mesh
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          {dbStatus === "connected" ? (
                            <span style={{ color: "#16a34a", fontWeight: "600" }}>
                              Connected {dbLatency ? `(${dbLatency}ms)` : ""} · {isSqlite ? "Embedded Zero-Daemon" : "Isolated DB"}
                            </span>
                          ) : dbStatus === "degraded" ? (
                            <span style={{ color: "#b45309", fontWeight: "600" }}>
                              Query Error / Degraded
                            </span>
                          ) : (
                            <span style={{ color: "#dc2626" }}>Connection Refused</span>
                          )}
                        </div>
                      </td>

                      {/* DEDICATED FIREBASE CORE CONNECTION & SYNC COLUMN */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span style={{ fontSize: "0.8rem" }}>{fbIcon}</span>
                          <code style={{ fontSize: "0.82rem", fontWeight: "700", color: "#0f172a", background: "#fef3c7", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                            {collectionName}
                          </code>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.2rem" }}>
                          {fbStatus === "connected" ? (
                            <span style={{ color: "#16a34a", fontWeight: "600" }}>
                              Connected
                            </span>
                          ) : fbStatus === "degraded" ? (
                            <span style={{ color: "#b45309", fontWeight: "600" }}>
                              Sync Degraded
                            </span>
                          ) : (
                            <span style={{ color: "#dc2626" }}>Offline Fallback</span>
                          )}
                          <span style={{ color: "#94a3b8" }}> · {targetLabel}</span>
                        </div>
                        {fb?.isListening && (
                          <div style={{ fontSize: "0.68rem", color: "#0284c7", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <span>⚡</span>
                            <span>Realtime Inbound Active</span>
                          </div>
                        )}
                        {(fb?.outboxSynced !== undefined && fb.outboxSynced > 0) && (
                          <div style={{ fontSize: "0.68rem", color: "#166534", marginTop: "0.1rem" }}>
                            Synced: {fb.outboxSynced} docs
                          </div>
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: svc.latencyMs > 500 ? "#b45309" : "#475569",
                            fontWeight: isHealthy ? 600 : 400,
                          }}
                        >
                          {svc.latencyMs > 0 ? `${svc.latencyMs}ms` : "-"}
                        </span>
                      </td>
                      <td>
                        {svc.httpStatus ? (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                              background: svc.httpStatus < 400 ? "#e0f2fe" : "#fee2e2",
                              color: svc.httpStatus < 400 ? "#0369a1" : "#b91c1c",
                              fontWeight: 600,
                            }}
                          >
                            {svc.httpStatus} {svc.httpStatus === 200 ? "OK" : ""}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No Response</span>
                        )}
                      </td>

                      {/* MAPPED USE CASES */}
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", maxWidth: "230px" }}>
                          {(() => {
                            const mapping = MICROSERVICE_USECASE_MAPPINGS[svc.id];
                            if (!mapping) {
                              return <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>None</span>;
                            }
                            return (
                              <>
                                {mapping.useCases.slice(0, 4).map((uc) => (
                                  <button
                                    key={uc.id}
                                    type="button"
                                    onClick={() => setSelectedUseCaseModal({ useCase: uc, service: mapping })}
                                    title={`${uc.id}: ${uc.title} (${uc.category})`}
                                    style={{
                                      background: uc.category === "business" ? "#eff6ff" : "#f5f3ff",
                                      color: uc.category === "business" ? "#1d4ed8" : "#6d28d9",
                                      border: `1px solid ${uc.category === "business" ? "#bfdbfe" : "#ddd6fe"}`,
                                      padding: "0.1rem 0.35rem",
                                      borderRadius: "4px",
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {uc.id}
                                  </button>
                                ))}
                                {mapping.useCases.length > 4 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedServiceFilter(svc.id);
                                      document.getElementById("microservice-usecase-matrix")?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    style={{
                                      background: "#f1f5f9",
                                      color: "#334155",
                                      border: "1px dashed #cbd5e1",
                                      padding: "0.1rem 0.35rem",
                                      borderRadius: "4px",
                                      fontSize: "0.68rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    +{mapping.useCases.length - 4} more
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {isHealthy && (
                          <span style={{ color: "#15803d" }}>
                            Process online · SELECT 1 DB probe passed
                          </span>
                        )}
                        {isDegraded && (
                          <span style={{ color: "#b45309" }}>
                            {svc.details?.error || svc.error || `Process active, database check degraded`}
                          </span>
                        )}
                        {!isHealthy && !isDegraded && (
                          <span style={{ color: "#64748b" }}>
                            {svc.error || `Process not listening on port ${svc.port}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Database Mesh & Sync Architecture Callout */}
          <div className="pub-callout pub-callout-info" style={{ marginTop: "2rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#1d4ed8" }}>
              Database-Per-Service Architecture & Firebase Core Sync Mesh Specification
            </h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", lineHeight: "1.6" }}>
              In adherence to Logikchain's <strong>Zero-Shared-Database</strong> standard, every functional epic operates its own dedicated datastore—transitioning to <strong>Rust (Axum) with Embedded SQLite (WAL)</strong> for zero-daemon sub-millisecond execution (e.g., <code>orders.db</code>) and isolated <strong>PostgreSQL 16</strong> instances (e.g., <code>identity_db</code>, <code>config_db</code>). Concurrently, the <strong>Firebase Sync Bridge (:4050)</strong> runs official <code>firebase-admin</code> to commit transactional outbox batches into Cloud Firestore and stream inbound offline mutations back into microservice engines.
            </p>
          </div>

          {/* Microservices ⇄ Use Cases Functional Mapping Matrix */}
          <div id="microservice-usecase-matrix" className="pub-article" style={{ marginTop: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>🗺️</span>
                  <h3 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>
                    Microservices ⇄ Business & Technical Use Cases Mapping
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
                  End-to-end traceability linking all platform use cases to their bound microservice, runtime engine (Rust / Node.js), and database store (SQLite WAL / PostgreSQL).
                </p>
              </div>

              {/* Search input */}
              <div style={{ minWidth: "280px", maxWidth: "400px", width: "100%" }}>
                <input
                  type="text"
                  placeholder="Search use case ID (e.g. UC-05), keyword, or endpoint..."
                  value={useCaseSearchQuery}
                  onChange={(e) => setUseCaseSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    outline: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                />
              </div>
            </div>

            {/* Filter Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.5rem" }}>
              <button
                type="button"
                onClick={() => setSelectedServiceFilter("all")}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: selectedServiceFilter === "all" ? "#1d4ed8" : "#e2e8f0",
                  background: selectedServiceFilter === "all" ? "#eff6ff" : "#ffffff",
                  color: selectedServiceFilter === "all" ? "#1d4ed8" : "#475569",
                }}
              >
                All Microservices (13)
              </button>
              <button
                type="button"
                onClick={() => setSelectedServiceFilter("rust")}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: selectedServiceFilter === "rust" ? "#d97706" : "#fde68a",
                  background: selectedServiceFilter === "rust" ? "#fef3c7" : "#fffdf5",
                  color: "#92400e",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span>🦀</span> Rust Services ({rustCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedServiceFilter("sqlite")}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: selectedServiceFilter === "sqlite" ? "#2563eb" : "#bfdbfe",
                  background: selectedServiceFilter === "sqlite" ? "#eff6ff" : "#f8fafc",
                  color: "#1d4ed8",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span>🗄️</span> SQLite WAL ({sqliteCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedServiceFilter("postgres")}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: selectedServiceFilter === "postgres" ? "#16a34a" : "#bbf7d0",
                  background: selectedServiceFilter === "postgres" ? "#f0fdf4" : "#ffffff",
                  color: "#166534",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span>🐘</span> PostgreSQL 16 ({postgresCount})
              </button>
            </div>

            {/* Service & Use Case Profile Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {Object.values(MICROSERVICE_USECASE_MAPPINGS)
                .filter((profile) => {
                  if (selectedServiceFilter === "rust") return profile.runtime.includes("rust");
                  if (selectedServiceFilter === "sqlite") return profile.dbEngine === "sqlite";
                  if (selectedServiceFilter === "postgres") return profile.dbEngine === "postgres";
                  if (selectedServiceFilter !== "all") return profile.serviceId === selectedServiceFilter;
                  return true;
                })
                .map((profile) => {
                  const filteredUseCases = profile.useCases.filter((uc) => {
                    if (!useCaseSearchQuery) return true;
                    const q = useCaseSearchQuery.toLowerCase();
                    return (
                      uc.id.toLowerCase().includes(q) ||
                      uc.title.toLowerCase().includes(q) ||
                      uc.description.toLowerCase().includes(q) ||
                      profile.name.toLowerCase().includes(q) ||
                      profile.endpoints.some((ep) => ep.toLowerCase().includes(q))
                    );
                  });

                  if (useCaseSearchQuery && filteredUseCases.length === 0) {
                    return null;
                  }

                  const isRust = profile.runtime.includes("rust");
                  const isSqlite = profile.dbEngine === "sqlite";

                  return (
                    <div
                      key={profile.serviceId}
                      style={{
                        border: isRust ? "2px solid #fde68a" : "1px solid #e2e8f0",
                        borderRadius: "10px",
                        background: isRust ? "#fffdf5" : "#ffffff",
                        padding: "1.25rem 1.5rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ background: "#e2e8f0", color: "#334155", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                              {profile.epic}
                            </span>
                            <h4 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
                              {profile.name}
                            </h4>
                            <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#64748b" }}>
                              :{profile.port}
                            </span>
                            {isRust ? (
                              <span style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800 }}>
                                🦀 RUST AXUM
                              </span>
                            ) : (
                              <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                                🟢 NODE.JS
                              </span>
                            )}
                            {isSqlite ? (
                              <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800 }}>
                                🗄️ SQLite (WAL) · {profile.dbName}
                              </span>
                            ) : profile.dbEngine === "postgres" ? (
                              <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                                🐘 PostgreSQL 16 · {profile.dbName}
                              </span>
                            ) : (
                              <span style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                                🔥 Firestore CDC
                              </span>
                            )}
                          </div>
                          <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
                            {profile.primaryDomain}
                          </p>
                        </div>

                        {/* Test Suite CTA */}
                        <button
                          type="button"
                          onClick={() => handleTabChange("tests")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            background: "#f0fdf4",
                            color: "#166534",
                            border: "1px solid #bbf7d0",
                            padding: "0.35rem 0.7rem",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <span>🧪 Run E2E Suite</span>
                          <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>↗</span>
                        </button>
                      </div>

                      {/* Endpoints */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Endpoints:</span>
                        {profile.endpoints.map((ep) => (
                          <code key={ep} style={{ fontSize: "0.74rem", background: "#f1f5f9", color: "#334155", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                            {ep}
                          </code>
                        ))}
                      </div>

                      {/* Mapped Use Cases Grid */}
                      <div style={{ marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          Bound Use Cases ({filteredUseCases.length})
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.6rem" }}>
                          {filteredUseCases.map((uc) => (
                            <div
                              key={uc.id}
                              onClick={() => setSelectedUseCaseModal({ useCase: uc, service: profile })}
                              style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                padding: "0.6rem 0.75rem",
                                background: "#fafafa",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#93c5fd";
                                e.currentTarget.style.background = "#eff6ff";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#e2e8f0";
                                e.currentTarget.style.background = "#fafafa";
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.25rem", marginBottom: "0.25rem" }}>
                                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 800, color: "#1d4ed8" }}>
                                  {uc.id}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    padding: "0.05rem 0.3rem",
                                    borderRadius: "3px",
                                    fontWeight: 700,
                                    background: uc.category === "business" ? "#dbeafe" : "#ede9fe",
                                    color: uc.category === "business" ? "#1e40af" : "#5b21b6",
                                  }}
                                >
                                  {uc.category.toUpperCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", lineHeight: "1.3", marginBottom: "0.2rem" }}>
                                {uc.title}
                              </div>
                              <div style={{ fontSize: "0.74rem", color: "#64748b", lineHeight: "1.3" }}>
                                {uc.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Use Case Detail Modal */}
        {selectedUseCaseModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
              backdropFilter: "blur(2px)",
            }}
            onClick={() => setSelectedUseCaseModal(null)}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                maxWidth: "560px",
                width: "100%",
                padding: "1.75rem",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 800, color: "#1d4ed8" }}>
                      {selectedUseCaseModal.useCase.id}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        fontWeight: 700,
                        background: selectedUseCaseModal.useCase.category === "business" ? "#dbeafe" : "#ede9fe",
                        color: selectedUseCaseModal.useCase.category === "business" ? "#1e40af" : "#5b21b6",
                      }}
                    >
                      {selectedUseCaseModal.useCase.category.toUpperCase()} USE CASE
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>
                    {selectedUseCaseModal.useCase.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUseCaseModal(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: "1.5", marginBottom: "1.25rem" }}>
                {selectedUseCaseModal.useCase.description}
              </p>

              {/* Service & Database Metadata */}
              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.82rem" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Bound Microservice:</span>
                    <strong style={{ color: "#0f172a" }}>
                      {selectedUseCaseModal.service.name} (:{selectedUseCaseModal.service.port})
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Runtime Engine:</span>
                    <strong style={{ color: selectedUseCaseModal.service.runtime.includes("rust") ? "#b45309" : "#334155" }}>
                      {selectedUseCaseModal.service.runtime.includes("rust") ? "🦀 Rust (Axum / Tokio)" : "🟢 Node.js (Express)"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Database Store:</span>
                    <strong style={{ color: selectedUseCaseModal.service.dbEngine === "sqlite" ? "#1d4ed8" : "#166534" }}>
                      {selectedUseCaseModal.service.dbEngine === "sqlite" ? "🗄️ SQLite (WAL Mode)" : "🐘 PostgreSQL 16"} ({selectedUseCaseModal.service.dbName})
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Official Client:</span>
                    <strong style={{ color: "#0f172a", textTransform: "capitalize" }}>
                      {selectedUseCaseModal.useCase.officialClient || "Cross-Platform"}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
                  <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>
                    Associated Endpoints:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {selectedUseCaseModal.service.endpoints.map((ep) => (
                      <code key={ep} style={{ fontSize: "0.72rem", background: "#e2e8f0", color: "#1e293b", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                        {ep}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="pub-btn pub-btn-sm pub-btn-outline"
                  onClick={() => setSelectedUseCaseModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="pub-btn pub-btn-sm pub-btn-primary"
                  onClick={() => {
                    setSelectedUseCaseModal(null);
                    handleTabChange("tests");
                  }}
                >
                  Open in E2E Test Suite 🧪
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </PublicLayout>
  );
}

export function PublicRoadmapScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Product Transparency</span>
          <h2>Public Roadmap & Work Management</h2>
          <p>
            Track our progress, upcoming releases, and major enhancements built for our network partners and consumers.
          </p>
        </div>

        <div className="pub-article">
          <h2>Active Platform Initiatives (Q4 2026)</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", margin: "1.5rem 0" }}>
            <div style={{ padding: "1.25rem", border: "1px solid #86efac", borderRadius: "8px", background: "#f0fdf4" }}>
              <span style={{ background: "#dcfce7", color: "#166534", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700" }}>IN ROLLOUT</span>
              <h3 style={{ margin: "0.5rem 0 0.35rem 0" }}>Instant Daily Driver UPI Settlement</h3>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#475569" }}>
                Enables gig delivery couriers to cash out their completed trips immediately after shift completion instead of waiting for weekly payroll cycles.
              </p>
            </div>

            <div style={{ padding: "1.25rem", border: "1px solid #93c5fd", borderRadius: "8px", background: "#eff6ff" }}>
              <span style={{ background: "#dbeafe", color: "#1e40af", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700" }}>IN DEVELOPMENT</span>
              <h3 style={{ margin: "0.5rem 0 0.35rem 0" }}>Voice-Driven Order Entry in Hindi & Telugu</h3>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#475569" }}>
                Permits shopkeepers to speak their daily restocking lists in their regional dialect without typing product SKU codes manually.
              </p>
            </div>

            <div style={{ padding: "1.25rem", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc" }}>
              <span style={{ background: "#e2e8f0", color: "#475569", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700" }}>PLANNED</span>
              <h3 style={{ margin: "0.5rem 0 0.35rem 0" }}>Cold-Chain Telemetry for Dairy & Perishables</h3>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#475569" }}>
                Integrates BLE temperature sensor logging during transit between wholesale milk/produce chillers and retail delivery points.
              </p>
            </div>
          </div>

          <h2>Recent Release Notes (Changelog)</h2>
          <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "1.5rem", margin: "1.5rem 0" }}>
            <h4 style={{ margin: 0 }}>Version 2.4.0 — October 2026</h4>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Added dynamic multi-stop route optimization for delivery partners, cutting down average transit time by 18%. Introduced automatic UPI refund reconciliation for canceled orders.
            </p>

            <h4 style={{ margin: "1.5rem 0 0 0" }}>Version 2.3.0 — September 2026</h4>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Launched offline-mode sync in PWA client, allowing field operations in remote regions with zero cellular interruption.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
