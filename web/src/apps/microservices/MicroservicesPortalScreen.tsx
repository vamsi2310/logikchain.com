import { useState } from "react";
import { PublicLayout } from "@/apps/public/PublicLayout";

interface ServiceItem {
  id: string;
  name: string;
  port: number;
  database: string;
  category: "Core Gateway" | "Identity & Security" | "Orders & Inventory" | "Fintech & Payments" | "Logistics & Communication";
  status: "Operational" | "Provisioned";
  description: string;
  endpoints: string[];
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: "gateway",
    name: "API Gateway & Router Orchestrator",
    port: 4000,
    database: "N/A (Stateless Proxy / JWT verify)",
    category: "Core Gateway",
    status: "Operational",
    description: "Central ingress router terminating client requests, enforcing auth claims, corridor rate-limiting, and microservice proxying.",
    endpoints: ["GET /health", "ALL /api/v1/*"]
  },
  {
    id: "identity-service",
    name: "Identity, Access & RBAC Service",
    port: 4001,
    database: "identity_db (PostgreSQL)",
    category: "Identity & Security",
    status: "Operational",
    description: "Manages Phone Auth, OTP verification, multi-persona RBAC profiles (buyer, merchant, driver, supplier), and device sessions.",
    endpoints: ["POST /api/v1/auth/request-otp", "POST /api/v1/auth/verify-otp", "GET /api/v1/users/:id"]
  },
  {
    id: "orders-service",
    name: "Orders & Fulfillment Lifecycle Service",
    port: 4002,
    database: "orders_db (PostgreSQL + Outbox)",
    category: "Orders & Inventory",
    status: "Operational",
    description: "Orchestrates cart checkouts, order states (PLACED, ACCEPTED, IN_TRANSIT, DELIVERED), OTP handovers, and cancellation logic.",
    endpoints: ["POST /api/v1/orders", "GET /api/v1/orders/:id", "PUT /api/v1/orders/:id/status"]
  },
  {
    id: "gigs-service",
    name: "Gig Logistics & Delivery Matchmaking",
    port: 4003,
    database: "gigs_db (PostGIS Spatial)",
    category: "Logistics & Communication",
    status: "Operational",
    description: "Geospatial batching, corridor rider assignments, route optimization between rural mandi hubs and local retail kiranas.",
    endpoints: ["GET /api/v1/gigs/available", "POST /api/v1/gigs/accept", "PUT /api/v1/gigs/:id/complete"]
  },
  {
    id: "pamphlet-service",
    name: "Pamphlet & Catalog Inventory Service",
    port: 4004,
    database: "pamphlet_db (PostgreSQL)",
    category: "Orders & Inventory",
    status: "Operational",
    description: "Digital micro-catalogues, SKU price discovery, mill batch listings, and inventory availability tracking.",
    endpoints: ["GET /api/v1/pamphlets", "POST /api/v1/pamphlets/items", "GET /api/v1/catalog/search"]
  },
  {
    id: "payments-service",
    name: "Payments & Ingress Collections Service",
    port: 4005,
    database: "payments_db (PostgreSQL)",
    category: "Fintech & Payments",
    status: "Operational",
    description: "Handles UPI payment links, QR code generation, webhook reconciliation, and escrow status for all corridor orders.",
    endpoints: ["POST /api/v1/payments/initiate", "POST /api/v1/payments/webhook", "GET /api/v1/payments/:id"]
  },
  {
    id: "payouts-service",
    name: "Disbursements & Automated Payouts Service",
    port: 4006,
    database: "payouts_db (PostgreSQL)",
    category: "Fintech & Payments",
    status: "Operational",
    description: "Executes instant corridor earnings transfers for riders, supplier settlements, and bank IMPS/NEFT transfers.",
    endpoints: ["POST /api/v1/payouts/instant-transfer", "GET /api/v1/payouts/history"]
  },
  {
    id: "cash-service",
    name: "Cash Custody & COD Reconciliation Service",
    port: 4007,
    database: "cash_db (PostgreSQL)",
    category: "Fintech & Payments",
    status: "Operational",
    description: "Tracks physical cash balances held by gig riders, hub deposit reconciliation, and discrepancy resolution.",
    endpoints: ["POST /api/v1/cash/collect", "POST /api/v1/cash/deposit", "GET /api/v1/cash/custody-summary"]
  },
  {
    id: "credit-service",
    name: "Merchant Micro-Credit & Ledger Service",
    port: 4008,
    database: "credit_db (PostgreSQL)",
    category: "Fintech & Payments",
    status: "Operational",
    description: "Manages merchant credit lines, repayment schedules, interest calculations, and NBFC partner integrations.",
    endpoints: ["GET /api/v1/credit/balance", "POST /api/v1/credit/draw", "POST /api/v1/credit/repay"]
  },
  {
    id: "finance-service",
    name: "Financial Auditing & Ledger Engine",
    port: 4009,
    database: "finance_db (PostgreSQL Double-Entry)",
    category: "Fintech & Payments",
    status: "Operational",
    description: "Immutable double-entry book-keeping ledger, GST tax reporting, platform take-rate calculations, and audit trails.",
    endpoints: ["GET /api/v1/finance/ledger", "GET /api/v1/finance/reports/gst"]
  },
  {
    id: "config-service",
    name: "Platform Configuration, Route Matrix & Pincode Boundaries",
    port: 4010,
    database: "config_db (PostgreSQL) + DuckDB OLAP (Parquet)",
    category: "Core Gateway",
    status: "Operational",
    description: "Dynamic feature flags, corridor definitions, wholesale bulk ingestion, and full 19,312 India pincode boundary polygon hierarchy (Circle ➔ Region ➔ Division ➔ Office).",
    endpoints: [
      "GET /v1/config/postal/circles",
      "GET /v1/config/postal/regions?circle=Kerala",
      "GET /v1/config/postal/divisions?circle=Kerala&region=Kochi",
      "GET /v1/config/postal/pincodes?search=682553",
      "GET /api/v1/config/routes"
    ]
  },
  {
    id: "governance-service",
    name: "Platform Governance, KYC & Compliance",
    port: 4011,
    database: "governance_db (PostgreSQL)",
    category: "Identity & Security",
    status: "Operational",
    description: "Aadhaar/PAN KYC document audits, dispute resolution arbitration, and merchant/driver suspension controls.",
    endpoints: ["GET /api/v1/governance/kyc-queue", "POST /api/v1/governance/arbitrate"]
  },
  {
    id: "social-connect-service",
    name: "Social Connect & Multi-Channel Notifications",
    port: 4012,
    database: "social_connect_db (PostgreSQL)",
    category: "Logistics & Communication",
    status: "Operational",
    description: "WhatsApp Business Cloud API integration, SMS alerts, FCM push messaging, and automated GST billing delivery.",
    endpoints: ["POST /api/v1/notifications/dispatch", "GET /api/v1/preferences/:userId", "PUT /api/v1/preferences/:userId"]
  }
];

export function MicroservicesPortalScreen() {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredServices = SERVICES_DATA.filter((s) => {
    const matchesCategory = filterCategory === "all" || s.category === filterCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["all", "Core Gateway", "Identity & Security", "Orders & Inventory", "Fintech & Payments", "Logistics & Communication"];

  return (
    <PublicLayout>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Hero Section */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Architecture Portal • /microservices
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#0f172a", margin: "0.25rem 0" }}>
            Logikchain Distributed Microservices Architecture
          </h1>
          <p style={{ color: "#475569", fontSize: "1.05rem", maxWidth: "800px", margin: "0" }}>
            Real-time interactive dashboard detailing the 13 decoupled backend microservices powering high-throughput rural commerce, outbox event streaming, and resilient transaction processing.
          </p>
        </div>

        {/* System Topology Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Total Microservices</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0" }}>13</div>
            <div style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 600 }}>Containerized Node/TS Services</div>
          </div>
          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Gateway Entry</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0284c7", margin: "0.25rem 0" }}>Port 4000</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Unified Ingress & Routing</div>
          </div>
          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Database Topology</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#7c3aed", margin: "0.25rem 0" }}>PostgreSQL</div>
            <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600 }}>Isolated Schema Per Service</div>
          </div>
          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Deployment Target</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ea580c", margin: "0.25rem 0" }}>GCP Cloud Run</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Fully Autoscaled Serverless</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  background: filterCategory === cat ? "#0f172a" : "#f1f5f9",
                  color: filterCategory === cat ? "#ffffff" : "#475569"
                }}
              >
                {cat === "all" ? "All Services" : cat}
              </button>
            ))}
          </div>

          <div>
            <input
              type="text"
              placeholder="Search service, endpoint, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", width: "260px", fontSize: "0.9rem" }}
            />
          </div>
        </div>

        {/* Services Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", fontFamily: "monospace", fontWeight: 700, color: "#0284c7", background: "#f0f9ff", padding: "2px 8px", borderRadius: "4px" }}>
                    :{srv.port}
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "4px" }}>
                    ● {srv.status}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
                  {srv.name}
                </h3>

                <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: "1.5", margin: "0 0 1rem 0" }}>
                  {srv.description}
                </p>

                <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1rem", fontSize: "0.8rem" }}>
                  <div style={{ color: "#64748b", marginBottom: "0.25rem" }}>Database: <strong style={{ color: "#0f172a" }}>{srv.database}</strong></div>
                  <div style={{ color: "#64748b" }}>Category: <strong style={{ color: "#7c3aed" }}>{srv.category}</strong></div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "0.4rem" }}>
                  Key API Endpoints:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {srv.endpoints.map((ep, idx) => (
                    <code key={idx} style={{ background: "#f1f5f9", padding: "3px 6px", borderRadius: "4px", fontSize: "0.75rem", color: "#0f172a" }}>
                      {ep}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

