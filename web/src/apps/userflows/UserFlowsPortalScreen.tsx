import { useState } from "react";
import { PublicLayout } from "@/apps/public/PublicLayout";

interface UserFlowStep {
  step: number;
  title: string;
  description: string;
  screenPath: string;
  actor: string;
}

interface UserFlowItem {
  id: string;
  title: string;
  role: "Buyer" | "Merchant" | "Rider / Driver" | "Supplier" | "Support / Admin";
  summary: string;
  entryPoint: string;
  wireframeRef: string;
  steps: UserFlowStep[];
}

const FLOWS_DATA: UserFlowItem[] = [
  {
    id: "FLOW-BUYER-01",
    title: "Neighborhood Buyer Discovery, Pamphlet Cart & Order Pickup",
    role: "Buyer",
    summary: "End-to-end journey of a consumer exploring nearby kirana inventories, building an order, paying via UPI, and collecting via QR code.",
    entryPoint: "http://localhost:5173/download",
    wireframeRef: "constitution/wireframes/Buyer.md",
    steps: [
      { step: 1, title: "App Launch & PWA Install", description: "User visits download screen or launches installed PWA with persistent session token.", screenPath: "/download", actor: "Buyer" },
      { step: 2, title: "Corridor Discovery & Pamphlet View", description: "Browses local village depot catalog with live prices directly sourced from wholesale mill batches.", screenPath: "/home", actor: "Buyer" },
      { step: 3, title: "Checkout & Instant Escrow Payment", description: "Completes order via UPI deep-link; money is held in platform escrow until goods verification.", screenPath: "/checkout", actor: "Buyer" },
      { step: 4, title: "Secure OTP Handover & Pickup", description: "Receives dynamic pickup QR code and SMS OTP to release payout to merchant upon goods receipt.", screenPath: "/orders/:orderId/pickup-code", actor: "Buyer" }
    ]
  },
  {
    id: "FLOW-MERCHANT-02",
    title: "Kirana Merchant Direct Supply Sourcing & Credit Financing",
    role: "Merchant",
    summary: "A rural retail shop owner buys wholesale inventory directly from regional depots, receives delivery in <24h, and applies micro-credit.",
    entryPoint: "http://localhost:5173/merchants",
    wireframeRef: "constitution/wireframes/Merchant.md",
    steps: [
      { step: 1, title: "Merchant Registration & GST Verification", description: "Enters shop details, GSTIN/Udyam number, and sets delivery hub pin.", screenPath: "/merchants", actor: "Merchant" },
      { step: 2, title: "Bulk Wholesale Order Placement", description: "Selects rice, pulses, and oil consignments directly from supplier mill lists with zero middlemen markup.", screenPath: "/m/catalog", actor: "Merchant" },
      { step: 3, title: "Micro-Credit Working Capital Drawdown", description: "Draws credit line for 14-day deferred repayment powered by credit-service.", screenPath: "/m/credit", actor: "Merchant" },
      { step: 4, title: "Stock Delivery Verification", description: "Scans consignments upon arrival; automated GST invoice sent to WhatsApp.", screenPath: "/m/orders", actor: "Merchant" }
    ]
  },
  {
    id: "FLOW-RIDER-03",
    title: "Gig Delivery Partner Route Batching & Instant Payouts",
    role: "Rider / Driver",
    summary: "A local vehicle owner accepts multi-hub corridor batches, navigates optimized rural drops, and receives instant UPI cash disbursements.",
    entryPoint: "http://localhost:5173/riders",
    wireframeRef: "constitution/wireframes/Driver.md",
    steps: [
      { step: 1, title: "Rider Onboarding & Driving License KYC", description: "Uploads Aadhaar, RC, and driving license with automated governance validation.", screenPath: "/riders", actor: "Rider" },
      { step: 2, title: "Corridor Batch Acceptance", description: "Accepts clustered delivery run between Mandi Hub A and 4 Kirana drop points.", screenPath: "/d/gigs", actor: "Rider" },
      { step: 3, title: "Hub Dispatch & Custody Handover", description: "Scans barcoded bags at the depot and confirms physical custody.", screenPath: "/d/pickup", actor: "Rider" },
      { step: 4, title: "Instant UPI Payout Settlement", description: "Delivery confirmed via customer OTP; fare is immediately disbursed to bank account.", screenPath: "/d/payouts", actor: "Rider" }
    ]
  },
  {
    id: "FLOW-SUPPLIER-04",
    title: "Primary Mill Supplier Ingestion & Direct Bulk Liquidation",
    role: "Supplier",
    summary: "A grain mill or wholesale depot uploads product lines via Excel/API, gets orders from 50+ retail stores simultaneously, and receives guaranteed payments.",
    entryPoint: "http://localhost:5173/suppliers",
    wireframeRef: "constitution/wireframes/Supplier.md",
    steps: [
      { step: 1, title: "Supplier Portal Registration", description: "Registers mill depot location and uploads bulk product catalogue.", screenPath: "/suppliers", actor: "Supplier" },
      { step: 2, title: "Bulk Ingestion & Batch Pricing", description: "Sets truckload bulk rates and stock thresholds via bulk ingestion pipeline.", screenPath: "/s/inventory", actor: "Supplier" },
      { step: 3, title: "Dispatch Consolidation", description: "Consolidates individual kirana orders into single corridor dispatch runs.", screenPath: "/s/orders", actor: "Supplier" },
      { step: 4, title: "T+1 Bank Settlement", description: "Receives guaranteed T+1 payment directly from platform escrow account.", screenPath: "/s/finance", actor: "Supplier" }
    ]
  }
];

export function UserFlowsPortalScreen() {
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [expandedFlow, setExpandedFlow] = useState<string>("FLOW-BUYER-01");

  const filteredFlows = selectedRole === "all"
    ? FLOWS_DATA
    : FLOWS_DATA.filter((f) => f.role.toLowerCase().includes(selectedRole.toLowerCase()));

  return (
    <PublicLayout>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Hero Section */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Experience Portal • /user-flows
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#0f172a", margin: "0.25rem 0" }}>
            Actor Journeys & Interactive User Flows
          </h1>
          <p style={{ color: "#475569", fontSize: "1.05rem", maxWidth: "800px", margin: "0" }}>
            Explore the validated end-to-end user journeys across all 5 corridor platform actors. Step through each screen, interaction pattern, and architectural wireframe link.
          </p>
        </div>

        {/* Actor Role Filter */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {["all", "Buyer", "Merchant", "Rider", "Supplier"].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                background: selectedRole === r ? "#0f172a" : "#f1f5f9",
                color: selectedRole === r ? "#ffffff" : "#475569"
              }}
            >
              {r === "all" ? "All Actors" : `${r} Journey`}
            </button>
          ))}
        </div>

        {/* User Flows Accordion / Card View */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {filteredFlows.map((flow) => {
            const isExpanded = expandedFlow === flow.id;
            return (
              <div
                key={flow.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: isExpanded ? "2px solid #0284c7" : "1px solid #e2e8f0",
                  padding: "1.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>
                        {flow.id}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px" }}>
                        {flow.role}
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
                      {flow.title}
                    </h2>
                    <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0", maxWidth: "800px" }}>
                      {flow.summary}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <a
                      href={flow.entryPoint}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: "0.5rem 1rem", background: "#0284c7", color: "#fff", textDecoration: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 }}
                    >
                      Launch Entry ↗
                    </a>
                    <button
                      onClick={() => setExpandedFlow(isExpanded ? "" : flow.id)}
                      style={{ padding: "0.5rem 1rem", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      {isExpanded ? "Collapse ▲" : "View Steps ▼"}
                    </button>
                  </div>
                </div>

                {/* Expanded Stepper View */}
                {isExpanded && (
                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", marginBottom: "1rem" }}>
                      Sequential Interaction Steps:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                      {flow.steps.map((st) => (
                        <div
                          key={st.step}
                          style={{
                            background: "#f8fafc",
                            padding: "1.2rem",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#0284c7", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold" }}>
                              {st.step}
                            </span>
                            <code style={{ fontSize: "0.75rem", color: "#64748b" }}>{st.screenPath}</code>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: "0.4rem" }}>
                            {st.title}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: "1.5" }}>
                            {st.description}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "#64748b" }}>
                      Source Wireframe Reference: <code style={{ color: "#0284c7" }}>{flow.wireframeRef}</code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
