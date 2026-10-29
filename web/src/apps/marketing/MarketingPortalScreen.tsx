import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/apps/public/PublicLayout";

interface CampaignItem {
  id: string;
  name: string;
  medium: string[];
  channel_type: string;
  target_role: string;
  target_audience: string;
  entry_point: {
    base_path: string;
    full_url: string;
    alternative_entry_points?: string[];
  };
  cost: {
    currency: string;
    budget_allocated: number;
    spent_to_date: number;
    cost_model: string;
    avg_cpc?: number;
  };
  estimated_revenue_inflow: {
    currency: string;
    projected_gmv: number;
    projected_platform_net_fee: number;
    roi_multiple: number;
  };
  html_preview: string;
}

const CAMPAIGNS_DATA: CampaignItem[] = [
  {
    id: "CAMP-FB-MKT-001",
    name: "Kirana Merchant Direct Supply Sourcing - Marketplace Boost",
    medium: ["Facebook Marketplace", "Facebook Feed"],
    channel_type: "Paid Social",
    target_role: "Merchant (Kirana)",
    target_audience: "Local Kirana & Retail Shop Owners across Tier-2/3 logistics corridors",
    entry_point: {
      base_path: "/merchants",
      full_url: "http://localhost:5173/merchants?utm_source=facebook&utm_medium=marketplace&utm_campaign=kirana_direct_supply&utm_content=fb_marketplace_card_01",
      alternative_entry_points: [
        "http://localhost:5173/how-it-works?utm_source=facebook&utm_medium=marketplace&ref=merch_learn",
        "http://localhost:5173/download?utm_source=facebook&utm_medium=marketplace&ref=merch_app"
      ]
    },
    cost: {
      currency: "INR",
      budget_allocated: 45000,
      spent_to_date: 18500,
      cost_model: "CPC (~₹3.70)",
      avg_cpc: 3.7
    },
    estimated_revenue_inflow: {
      currency: "INR",
      projected_gmv: 1250000,
      projected_platform_net_fee: 62500,
      roi_multiple: 2.78
    },
    html_preview: `
      <div style="background:#0f172a; color:#fff; padding:18px; border-radius:10px; text-align:center;">
        <span style="background:#16a34a; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:700;">DIRECT MANDI SOURCING</span>
        <h3 style="margin:8px 0; font-size:18px;">Save 8% to 15% on FMCG & Grain Inventory</h3>
        <p style="font-size:13px; color:#94a3b8; margin:0 0 12px 0;">Doorstep Kirana Delivery in &lt; 24h. No Advance Cash.</p>
        <button style="background:#0284c7; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">Sign Up Store ➔</button>
      </div>
    `
  },
  {
    id: "CAMP-YT-INF-002",
    name: "Tech & Logistics Creator Deep-Dive: How Bharat Corridor Works",
    medium: ["YouTube Video Sponsor", "YouTube Shorts"],
    channel_type: "Creator / Influencer",
    target_role: "General Corridor Users",
    target_audience: "Rural entrepreneurs, logistics operators, tech-savvy youth",
    entry_point: {
      base_path: "/how-it-works",
      full_url: "http://localhost:5173/how-it-works?utm_source=youtube&utm_medium=influencer&utm_campaign=how_it_works_creator_review&utm_content=pinned_comment_link&creator_id=bharat_logistics_tech",
      alternative_entry_points: [
        "http://localhost:5173/download?utm_source=youtube&utm_medium=influencer&utm_campaign=how_it_works_creator_review&utm_content=desc_download_link"
      ]
    },
    cost: {
      currency: "INR",
      budget_allocated: 75000,
      spent_to_date: 75000,
      cost_model: "Fixed Creator Fee",
      avg_cpc: 6.25
    },
    estimated_revenue_inflow: {
      currency: "INR",
      projected_gmv: 2100000,
      projected_platform_net_fee: 105000,
      roi_multiple: 2.40
    },
    html_preview: `
      <div style="background:#000; color:#fff; padding:16px; border-radius:10px; border-left:4px solid #ff0000;">
        <div style="font-weight:700; font-size:14px; margin-bottom:4px;">▶ Bharat Supply Chain Explorer (Pinned Comment)</div>
        <div style="font-size:13px; color:#ccc; line-height:1.5;">Watch how Logikchain cuts out 3 middlemen layers across mandi corridors! Use code <b>BHARATLOGISTICS</b> for ₹250 first-order credit.</div>
        <div style="margin-top:10px;"><a style="color:#3ea6ff; text-decoration:none; font-size:13px; font-weight:600;">Visit /how-it-works & download app ↗</a></div>
      </div>
    `
  },
  {
    id: "CAMP-IG-REEL-003",
    name: "Fleet Rider & Delivery Partner Instant Payouts Reel",
    medium: ["Instagram Reels", "Instagram Stories"],
    channel_type: "Paid Social",
    target_role: "Riders & Fleet",
    target_audience: "Gig workers, 2-wheeler & 3-wheeler vehicle owners aged 19-35",
    entry_point: {
      base_path: "/riders",
      full_url: "http://localhost:5173/riders?utm_source=instagram&utm_medium=reels&utm_campaign=rider_daily_cash_payouts&utm_content=reel_instant_payout_cta",
      alternative_entry_points: [
        "http://localhost:5173/download?utm_source=instagram&utm_medium=reels&utm_campaign=rider_daily_cash_payouts&ref=rider_apk"
      ]
    },
    cost: {
      currency: "INR",
      budget_allocated: 30000,
      spent_to_date: 12000,
      cost_model: "CPC (~₹2.40)",
      avg_cpc: 2.4
    },
    estimated_revenue_inflow: {
      currency: "INR",
      projected_gmv: 980000,
      projected_platform_net_fee: 49000,
      roi_multiple: 2.63
    },
    html_preview: `
      <div style="background:linear-gradient(135deg, #18181b, #27272a); color:#fff; padding:16px; border-radius:10px; border:1px solid #3f3f46;">
        <span style="background:#22c55e; color:#000; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">HIRING RIDERS</span>
        <div style="font-size:24px; font-weight:900; color:#4ade80; margin:6px 0;">₹800 - ₹1,400 / Day</div>
        <div style="font-size:12px; color:#a1a1aa; margin-bottom:10px;">Instant UPI settlement after every corridor trip.</div>
        <div style="background:#e11d48; text-align:center; padding:8px; border-radius:6px; font-weight:700; font-size:13px;">Swipe Up / Join Fleet ➔</div>
      </div>
    `
  },
  {
    id: "CAMP-GG-SEARCH-004",
    name: "B2B Agro & FMCG Wholesale Bulk Sourcing - Search Intent",
    medium: ["Google Search Ads", "Google Performance Max"],
    channel_type: "Paid Search",
    target_role: "Suppliers & Mills",
    target_audience: "Wholesale Distributors, FMCG Millers, Commodity Aggregators",
    entry_point: {
      base_path: "/suppliers",
      full_url: "http://localhost:5173/suppliers?utm_source=google&utm_medium=cpc&utm_campaign=bulk_fmcg_agro_wholesale&utm_content=headline_wholesale_supply_direct",
      alternative_entry_points: [
        "http://localhost:5173/how-it-works?utm_source=google&utm_medium=cpc&utm_campaign=bulk_fmcg_agro_wholesale&ref=supplier_overview"
      ]
    },
    cost: {
      currency: "INR",
      budget_allocated: 60000,
      spent_to_date: 24500,
      cost_model: "CPC (~₹12.20)",
      avg_cpc: 12.2
    },
    estimated_revenue_inflow: {
      currency: "INR",
      projected_gmv: 3500000,
      projected_platform_net_fee: 175000,
      roi_multiple: 3.91
    },
    html_preview: `
      <div style="background:#fff; border:1px solid #dfe1e5; border-radius:8px; padding:14px; color:#202124;">
        <div style="font-size:11px; color:#5f6368; font-weight:700;">Sponsored • https://logikchain.com/suppliers</div>
        <div style="color:#1a0dab; font-size:16px; font-weight:600; margin:4px 0;">Sell Direct to 5,000+ Kirana Stores | Guaranteed T+1 Escrow</div>
        <div style="font-size:12px; color:#4d5156;">List bulk agro & FMCG stocks. Excel catalogue upload & ERP sync.</div>
      </div>
    `
  },
  {
    id: "CAMP-APP-DOWNLOAD-005",
    name: "Consumer & Neighborhood Buyer Quick Ordering App Launch",
    medium: ["Instagram Feed", "Google App Campaigns", "YouTube Shorts"],
    channel_type: "Omnichannel / App Installs",
    target_role: "Buyer (Consumer)",
    target_audience: "Urban and semi-urban household buyers seeking local farm-fresh prices",
    entry_point: {
      base_path: "/download",
      full_url: "http://localhost:5173/download?utm_source=omnichannel&utm_medium=app_promo&utm_campaign=download_and_save_100&utm_content=install_app_direct_btn",
      alternative_entry_points: [
        "http://localhost:5173/how-it-works?utm_source=omnichannel&utm_medium=app_promo&ref=app_guide",
        "http://localhost:5173/login?signup=true&utm_source=omnichannel&utm_medium=app_promo&ref=quick_signup"
      ]
    },
    cost: {
      currency: "INR",
      budget_allocated: 50000,
      spent_to_date: 21000,
      cost_model: "CPI / CPC (~₹4.10)",
      avg_cpc: 4.1
    },
    estimated_revenue_inflow: {
      currency: "INR",
      projected_gmv: 1800000,
      projected_platform_net_fee: 90000,
      roi_multiple: 2.80
    },
    html_preview: `
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <div style="width:40px; height:40px; background:#0284c7; border-radius:8px; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold;">LC</div>
          <div>
            <div style="font-weight:700; font-size:14px; color:#0f172a;">Logikchain App</div>
            <div style="font-size:11px; color:#f59e0b;">★ 4.8 Rating • ₹100 Off First Order</div>
          </div>
        </div>
        <div style="margin-top:12px; background:#0f172a; color:#fff; text-align:center; padding:8px; border-radius:6px; font-size:12px; font-weight:700;">Download App APK / PWA ➔</div>
      </div>
    `
  }
];

export function MarketingPortalScreen() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"campaigns" | "entry_points" | "creatives">("campaigns");

  const filteredCampaigns = selectedChannel === "all"
    ? CAMPAIGNS_DATA
    : CAMPAIGNS_DATA.filter((c) => c.medium.some((m) => m.toLowerCase().includes(selectedChannel.toLowerCase())));

  const totalBudget = CAMPAIGNS_DATA.reduce((acc, c) => acc + c.cost.budget_allocated, 0);
  const totalSpent = CAMPAIGNS_DATA.reduce((acc, c) => acc + c.cost.spent_to_date, 0);
  const totalProjectedGMV = CAMPAIGNS_DATA.reduce((acc, c) => acc + c.estimated_revenue_inflow.projected_gmv, 0);
  const totalProjectedFees = CAMPAIGNS_DATA.reduce((acc, c) => acc + c.estimated_revenue_inflow.projected_platform_net_fee, 0);

  return (
    <PublicLayout>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header Breadcrumb & Hero */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Department Portal • /marketing
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#0f172a", margin: "0.25rem 0" }}>
              Marketing & Growth Intelligence Hub
            </h1>
            <p style={{ color: "#475569", fontSize: "1.05rem", maxWidth: "700px", margin: "0" }}>
              Explore version-controlled ad campaigns, omnichannel social acquisition channels, live HTML creatives, and targeted user entry-point funnels.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link to="/marketing/creatives" style={{ padding: "0.6rem 1rem", background: "#f1f5f9", color: "#0f172a", borderRadius: "8px", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
              🎨 Creative Gallery
            </Link>
            <Link to="/marketing/entry-points" style={{ padding: "0.6rem 1rem", background: "#0284c7", color: "#ffffff", borderRadius: "8px", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
              🔗 Entry Point Matrix
            </Link>
          </div>
        </div>

        {/* High-Level Financial Metrics Banner */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Total Ad Budget</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", margin: "0.35rem 0" }}>₹{totalBudget.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>Active Across 5 Major Mediums</div>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Spent To Date</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0284c7", margin: "0.35rem 0" }}>₹{totalSpent.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{((totalSpent / totalBudget) * 100).toFixed(1)}% of budget utilized</div>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Projected Corridor GMV</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#15803d", margin: "0.35rem 0" }}>₹{(totalProjectedGMV / 100000).toFixed(1)} Lakhs</div>
            <div style={{ fontSize: "0.85rem", color: "#15803d", fontWeight: 600 }}>High-velocity wholesale & retail volume</div>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Est. Platform Revenue Inflow</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#7c3aed", margin: "0.35rem 0" }}>₹{totalProjectedFees.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: "0.85rem", color: "#7c3aed", fontWeight: 600 }}>{(totalProjectedFees / totalBudget).toFixed(2)}x Platform ROI</div>
          </div>
        </div>

        {/* View Switcher & Channel Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setActiveTab("campaigns")}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "campaigns" ? "#0f172a" : "#f1f5f9",
                color: activeTab === "campaigns" ? "#ffffff" : "#475569"
              }}
            >
              📊 All Campaigns ({CAMPAIGNS_DATA.length})
            </button>
            <button
              onClick={() => setActiveTab("entry_points")}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "entry_points" ? "#0f172a" : "#f1f5f9",
                color: activeTab === "entry_points" ? "#ffffff" : "#475569"
              }}
            >
              📍 Entry Points & Referrals
            </button>
            <button
              onClick={() => setActiveTab("creatives")}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "creatives" ? "#0f172a" : "#f1f5f9",
                color: activeTab === "creatives" ? "#ffffff" : "#475569"
              }}
            >
              🖼️ Ad Creative Mocks
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Filter Medium:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            >
              <option value="all">All Channels</option>
              <option value="facebook">Facebook / Marketplace</option>
              <option value="youtube">YouTube / Influencer</option>
              <option value="instagram">Instagram / Reels</option>
              <option value="google">Google Ads</option>
              <option value="omnichannel">Omnichannel / App Installs</option>
            </select>
          </div>
        </div>

        {/* Tab 1: Detailed Campaigns Grid */}
        {activeTab === "campaigns" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
            {filteredCampaigns.map((camp) => (
              <div
                key={camp.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  padding: "1.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: "4px" }}>
                      {camp.id}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "3px 8px", borderRadius: "4px" }}>
                      {camp.target_role}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
                    {camp.name}
                  </h3>

                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem 0", lineHeight: "1.5" }}>
                    {camp.target_audience}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
                    {camp.medium.map((med, idx) => (
                      <span key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                        {med}
                      </span>
                    ))}
                  </div>

                  {/* Financials pill */}
                  <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                      <span style={{ color: "#64748b" }}>Allocated Budget:</span>
                      <strong style={{ color: "#0f172a" }}>₹{camp.cost.budget_allocated.toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                      <span style={{ color: "#64748b" }}>Est. Revenue Inflow:</span>
                      <strong style={{ color: "#15803d" }}>₹{camp.estimated_revenue_inflow.projected_platform_net_fee.toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "#64748b" }}>Model / ROI:</span>
                      <span style={{ color: "#7c3aed", fontWeight: 700 }}>{camp.cost.cost_model} • {camp.estimated_revenue_inflow.roi_multiple}x</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.35rem" }}>
                    Entry Point Destination:
                  </div>
                  <a
                    href={camp.entry_point.full_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      background: "#0f172a",
                      color: "#ffffff",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textAlign: "center"
                    }}
                  >
                    Test Live Entry Point ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Entry Points & Referrals Matrix */}
        {activeTab === "entry_points" && (
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.5rem", overflowX: "auto" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>
              Live Entry Points, Signup Paths & Referrals
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Every entry point routes into the main client application while automatically preserving campaign attribution, creator codes, and target onboarding roles.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Channel / Source</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Target Role</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Landing Route</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Attribution Query</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS_DATA.map((camp) => (
                  <tr key={camp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "1rem" }}>
                      <strong>{camp.medium.join(", ")}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{camp.id}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600 }}>
                        {camp.target_role}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", color: "#0284c7", fontWeight: 600 }}>
                      {camp.entry_point.base_path}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.8rem", color: "#64748b", maxWidth: "340px", wordBreak: "break-all" }}>
                      {camp.entry_point.full_url.split("?")[1]}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <a
                        href={camp.entry_point.full_url}
                        style={{ padding: "6px 12px", background: "#0284c7", color: "#fff", textDecoration: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}
                      >
                        Visit ➔
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: HTML Creative Mocks */}
        {activeTab === "creatives" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "2rem" }}>
            {CAMPAIGNS_DATA.map((camp) => (
              <div key={camp.id} style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>{camp.name}</h4>
                  <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                    {camp.channel_type}
                  </span>
                </div>
                <div
                  dangerouslySetInnerHTML={{ __html: camp.html_preview }}
                  style={{ marginBottom: "1rem" }}
                />
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Attached File: <code style={{ color: "#0284c7" }}>marketing/ads/{camp.id}.html</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

