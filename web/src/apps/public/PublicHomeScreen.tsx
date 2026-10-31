import { Link } from "react-router-dom";
import { useSession, roleHome } from "@/state/session";
import { greeting } from "@/format";
import { PublicLayout } from "./PublicLayout";
import type { UserRole } from "@/types/domain";

interface RoleWorkflowItem {
  icon: string;
  title: string;
  desc: string;
  to: string;
  actionText: string;
}

interface RoleConfigItem {
  title: string;
  shortName: string;
  tag: string;
  icon: string;
  headline: string;
  subtitle: string;
  primaryPath: string;
  primaryActionText: string;
  contextDetail: string;
  workflows: RoleWorkflowItem[];
}

const ROLE_CONFIG: Record<UserRole, RoleConfigItem> = {
  merchant: {
    title: "Kirana Merchant",
    shortName: "Kirana",
    tag: "🏪 Kirana Retail Counter",
    icon: "🏪",
    headline: "Kirana Restocking & Customer Pickup Hub",
    subtitle: "Automate store restocking from verified mill depots, manage customer pickup handovers, and access instant working capital credit.",
    primaryPath: "/m/gigs",
    primaryActionText: "Open Merchant Console →",
    contextDetail: "PUDO Pickup Station & Local Retail Ledger",
    workflows: [
      {
        icon: "🚚",
        title: "Incoming Depot Deliveries",
        desc: "Track scheduled delivery batch runs arriving at your store from regional depots.",
        to: "/m/gigs",
        actionText: "Inspect Gigs →",
      },
      {
        icon: "📦",
        title: "Buyer Pickup Handovers",
        desc: "Validate customer 6-digit pickup OTPs and record verified physical cash collections.",
        to: "/m/orders",
        actionText: "Manage Pickups →",
      },
      {
        icon: "💳",
        title: "Working Capital Credit",
        desc: "Access up to ₹50,000 instant revolving credit line for wholesale purchase orders.",
        to: "/m/credit",
        actionText: "View Credit Line →",
      },
      {
        icon: "🛒",
        title: "Bulk Restocking Order",
        desc: "Place wholesale commodity restocking orders directly with certified suppliers.",
        to: "/m/bulk/new",
        actionText: "Order Wholesale →",
      },
    ],
  },
  buyer: {
    title: "Consumer / Buyer",
    shortName: "Buyer",
    tag: "🛒 Neighborhood Mandi Access",
    icon: "🛍️",
    headline: "Local Groceries & Direct Mandi Deliveries",
    subtitle: "Shop fresh produce and household staples sourced directly from regional mill depots, delivered to your neighborhood kirana store.",
    primaryPath: "/home",
    primaryActionText: "Shop Today's Mandi Run →",
    contextDetail: "Neighborhood Pickup & Group Mandi Buying",
    workflows: [
      {
        icon: "🌾",
        title: "Live Mandi & Depot Runs",
        desc: "Browse fresh batches and mill pamphlets arriving today at your village corridor.",
        to: "/home",
        actionText: "Explore Products →",
      },
      {
        icon: "🛒",
        title: "Cart & Quick Checkout",
        desc: "Review reserved groceries, choose UPI or cash on pickup, and place orders.",
        to: "/cart",
        actionText: "Review Cart →",
      },
      {
        icon: "📦",
        title: "Orders & Pickup Codes",
        desc: "Access your 6-digit pickup security codes, ETA delivery status, and receipts.",
        to: "/orders",
        actionText: "View My Orders →",
      },
      {
        icon: "📍",
        title: "Corridor Village & Kirana",
        desc: "Select your neighborhood village hub and preferred kirana pickup partner.",
        to: "/setup",
        actionText: "Change Hub →",
      },
    ],
  },
  supplier: {
    title: "Depot / Supplier",
    shortName: "Depot",
    tag: "🏭 Wholesale Distribution Depot",
    icon: "🏭",
    headline: "Regional Depot & Wholesale Syndication",
    subtitle: "Broadcast wholesale commodity pamphlets to hundreds of verified retail shops, assign delivery routes, and receive automated T+1 settlements.",
    primaryPath: "/s/dashboard",
    primaryActionText: "Open Depot Dashboard →",
    contextDetail: "Bulk Commodity Dispatch & T+1 Settlement",
    workflows: [
      {
        icon: "▣",
        title: "Depot Command Overview",
        desc: "Monitor live aggregate dispatch volume, active transport corridors, and metrics.",
        to: "/s/dashboard",
        actionText: "View Metrics →",
      },
      {
        icon: "🚚",
        title: "Corridor Gigs & Dispatches",
        desc: "Schedule vehicle departure runs, assign delivery drivers, and track drop-offs.",
        to: "/s/gigs",
        actionText: "Manage Runs →",
      },
      {
        icon: "📦",
        title: "Wholesale Inventory & Pamphlets",
        desc: "Publish stock catalogues at wholesale pricing and syndicate digital pamphlets.",
        to: "/s/inventory",
        actionText: "Syndicate Stock →",
      },
      {
        icon: "₹",
        title: "Finance & T+1 Settlements",
        desc: "Track completed order escrows, automated merchant collections, and bank transfers.",
        to: "/s/finance",
        actionText: "View Ledgers →",
      },
    ],
  },
  vehicle: {
    title: "Fleet & Gig Driver",
    shortName: "Rider",
    tag: "🛵 Logistics Fleet Partner",
    icon: "🚚",
    headline: "Delivery Corridors & Shift Earnings",
    subtitle: "Execute designated village depot runs, validate secure OTP handshakes at kirana counters, and receive transparent daily UPI payouts.",
    primaryPath: "/d/gigs",
    primaryActionText: "Open Driver Console →",
    contextDetail: "Last-Mile Corridor Fleet & Physical Custody",
    workflows: [
      {
        icon: "🚚",
        title: "Today's Delivery Gigs",
        desc: "Inspect active consignment manifests, pickup depots, and scheduled store drop-offs.",
        to: "/d/gigs",
        actionText: "View Consignments →",
      },
      {
        icon: "📍",
        title: "Corridor Route Navigation",
        desc: "Turn-by-turn waypoint navigation between supply depots and local village retailers.",
        to: "/d/tracking",
        actionText: "Start Navigation →",
      },
      {
        icon: "₹",
        title: "Daily Shift Earnings",
        desc: "Track completed trip payouts, fuel milestone bonuses, and physical cash float ledger.",
        to: "/d/earnings",
        actionText: "Check Payouts →",
      },
      {
        icon: "📱",
        title: "Android Native Driver App",
        desc: "Download the native APK for background GPS telemetry and hardware barcode scanning.",
        to: "/download",
        actionText: "Install Driver APK →",
      },
    ],
  },
  support: {
    title: "Platform Operations",
    shortName: "Ops",
    tag: "🛡️ Operations & Network Governance",
    icon: "⬡",
    headline: "Network Operations & Governance Console",
    subtitle: "Supervise hyper-local commerce corridors, resolve merchant-driver discrepancies, verify KYC profiles, and manage system configuration.",
    primaryPath: "/x/ops",
    primaryActionText: "Open Operations Console →",
    contextDetail: "Platform Administration & System Governance",
    workflows: [
      {
        icon: "⬡",
        title: "Live Operations Overview",
        desc: "Real-time network telemetry, order states, suspended shipments, and exceptions.",
        to: "/x/ops",
        actionText: "Live Operations →",
      },
      {
        icon: "👤",
        title: "User Management & KYC",
        desc: "Review and approve kirana merchant registrations, supplier profiles, and drivers.",
        to: "/x/users",
        actionText: "Verify Profiles →",
      },
      {
        icon: "⚙",
        title: "Platform Configuration",
        desc: "Configure regional geo-hierarchies, PIN codes, corridor fees, and tax profiles.",
        to: "/x/config",
        actionText: "System Config →",
      },
      {
        icon: "⚙️",
        title: "Microservices Status Portal",
        desc: "Inspect live health check and latency across all 14 decoupled platform microservices.",
        to: "/status",
        actionText: "Network Health →",
      },
    ],
  },
};

export function PublicHomeScreen() {
  const { user, profile } = useSession();
  const currentRole = (profile?.role ?? "buyer") as UserRole;
  const roleCfg = ROLE_CONFIG[currentRole] ?? ROLE_CONFIG.buyer;
  const appDestination = roleHome(currentRole);
  const userName = profile?.name || user?.displayName || user?.phoneNumber || "Partner";

  return (
    <PublicLayout>
      {/* Dynamic Hero Section */}
      {user ? (
        <section className="pub-hero pub-hero-auth">
          <div className="pub-auth-banner">
            <span className="pub-auth-status-dot">●</span>
            <span>Active Session • <strong>{roleCfg.title}</strong></span>
            <span className="pub-auth-phone">{profile?.phone || user?.phoneNumber || user?.email}</span>
          </div>
          <h1>{greeting()}, {userName}!</h1>
          <p className="subtitle">{roleCfg.subtitle}</p>
          <div className="pub-hero-actions">
            <Link to={appDestination} className="pub-btn pub-btn-primary pub-btn-lg">
              {roleCfg.primaryActionText}
            </Link>
            <Link to="/profile" className="pub-btn pub-btn-outline pub-btn-lg">
              Account & Settings ⚙
            </Link>
          </div>
        </section>
      ) : (
        <section className="pub-hero">
          <span className="pub-hero-tag">Decentralized Logistics Infrastructure</span>
          <h1>Bridging Rural & Regional Commerce Across India</h1>
          <p className="subtitle">
            A unified, reliable platform connecting retail store merchants, bulk supply depots, independent delivery fleets, and everyday buyers with zero friction.
          </p>
          <div className="pub-hero-actions">
            <Link to="/login" className="pub-btn pub-btn-primary pub-btn-lg">
              Launch Logikchain Web App
            </Link>
            <Link to="/download" className="pub-btn pub-btn-outline pub-btn-lg">
              Install Mobile App (PWA / Android / iOS)
            </Link>
          </div>
        </section>
      )}

      {/* Main Container */}
      <div className="pub-container">
        {/* If Logged In: Show Active Role Command Hub */}
        {user && (
          <>
            <div className="pub-account-context-strip">
              <div className="pub-context-item">
                <span>📍 Registered Corridor:</span>
                <strong>{profile?.villageId ? `Village ID: ${profile.villageId}` : "Regional Grid Active"}</strong>
              </div>
              <div className="pub-context-item">
                <span>🛡️ Platform Status:</span>
                <strong style={{ color: "#16a34a" }}>🟢 All 14 Microservices Online</strong>
              </div>
              <div className="pub-context-item">
                <span>🏷️ Active Persona:</span>
                <strong>{roleCfg.title}</strong>
              </div>
              <div>
                <Link to={appDestination} className="pub-btn pub-btn-primary pub-btn-sm">
                  Jump to {roleCfg.shortName} App ➔
                </Link>
              </div>
            </div>

            <div className="pub-section-header">
              <span className="pub-hero-tag">{roleCfg.tag}</span>
              <h2>Your {roleCfg.title} Command Hub</h2>
              <p>Quick access to your core workflows, daily operational tasks, and transaction ledgers.</p>
            </div>

            <div className="pub-role-hub-grid">
              {roleCfg.workflows.map((wf) => (
                <div key={wf.title} className="pub-role-hub-card">
                  <div className="pub-role-hub-icon">{wf.icon}</div>
                  <h3>{wf.title}</h3>
                  <p>{wf.desc}</p>
                  <div style={{ marginTop: "auto" }}>
                    <Link to={wf.to} className="pub-btn pub-btn-primary pub-btn-sm" style={{ width: "100%" }}>
                      {wf.actionText}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Persona Experiences Section */}
        <div className="pub-section-header">
          <h2>{user ? "Explore Other Grid Interfaces" : "Select Your Experience"}</h2>
          <p>
            {user
              ? `Your active persona is ${roleCfg.title}. You can preview or switch to any other interface across the Logikchain commerce grid:`
              : "Logikchain powers purpose-built interfaces for every actor in the hyper-local supply chain."}
          </p>
        </div>

        <div className="pub-actor-grid">
          {/* Merchant */}
          <div className={`pub-card ${user && currentRole === "merchant" ? "pub-card-active" : ""}`}>
            {user && currentRole === "merchant" && <span className="pub-card-active-tag">● Your Active Role</span>}
            <div className="pub-card-icon">🏪</div>
            <h3>Kirana & Retailers</h3>
            <p>
              Automate local inventory restocking, access revolving working capital credit, and sell directly to customers in your locality.
            </p>
            <ul className="pub-feature-list">
              <li>Up to ₹50,000 instant credit line</li>
              <li>Next-morning depot deliveries</li>
              <li>Digital ledger & UPI QR collection</li>
            </ul>
            <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
              <Link to="/merchants" className="pub-btn pub-btn-secondary pub-btn-sm" style={{ flex: 1 }}>
                Learn More
              </Link>
              <Link to="/m" className="pub-btn pub-btn-primary pub-btn-sm">
                {user && currentRole === "merchant" ? "Open Your App →" : "Preview App →"}
              </Link>
            </div>
          </div>

          {/* Supplier */}
          <div className={`pub-card ${user && currentRole === "supplier" ? "pub-card-active" : ""}`}>
            {user && currentRole === "supplier" && <span className="pub-card-active-tag">● Your Active Role</span>}
            <div className="pub-card-icon">🏭</div>
            <h3>Suppliers & Depots</h3>
            <p>
              Connect your regional warehouse or FMCG distribution center directly to hundreds of verified local stores without manual calls.
            </p>
            <ul className="pub-feature-list">
              <li>Direct wholesale order broadcast</li>
              <li>T+1 automated bank settlement</li>
              <li>Batch pamphlet & inventory syndication</li>
            </ul>
            <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
              <Link to="/suppliers" className="pub-btn pub-btn-secondary pub-btn-sm" style={{ flex: 1 }}>
                Learn More
              </Link>
              <Link to="/s" className="pub-btn pub-btn-primary pub-btn-sm">
                {user && currentRole === "supplier" ? "Open Your App →" : "Preview App →"}
              </Link>
            </div>
          </div>

          {/* Delivery Partner */}
          <div className={`pub-card ${user && currentRole === "vehicle" ? "pub-card-active" : ""}`}>
            {user && currentRole === "vehicle" && <span className="pub-card-active-tag">● Your Active Role</span>}
            <div className="pub-card-icon">🚚</div>
            <h3>Fleet & Gig Drivers</h3>
            <p>
              Turn your two-wheeler, auto, or light commercial vehicle into consistent daily earnings with transparent routes and quick payouts.
            </p>
            <ul className="pub-feature-list">
              <li>Instant daily UPI payouts</li>
              <li>Zero deposit onboarding</li>
              <li>Fuel & trip milestone bonuses</li>
            </ul>
            <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
              <Link to="/riders" className="pub-btn pub-btn-secondary pub-btn-sm" style={{ flex: 1 }}>
                Learn More
              </Link>
              <Link to="/d" className="pub-btn pub-btn-primary pub-btn-sm">
                {user && currentRole === "vehicle" ? "Open Your App →" : "Preview App →"}
              </Link>
            </div>
          </div>

          {/* Consumer */}
          <div className={`pub-card ${user && currentRole === "buyer" ? "pub-card-active" : ""}`}>
            {user && currentRole === "buyer" && <span className="pub-card-active-tag">● Your Active Role</span>}
            <div className="pub-card-icon">🛍️</div>
            <h3>Consumers & Buyers</h3>
            <p>
              Shop fresh produce, groceries, and essentials from your local neighborhood shops with reliable local courier delivery.
            </p>
            <ul className="pub-feature-list">
              <li>Real-time gig vehicle tracking</li>
              <li>Cash on Delivery or UPI payments</li>
              <li>Support local small businesses</li>
            </ul>
            <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
              <Link to="/shop" className="pub-btn pub-btn-secondary pub-btn-sm" style={{ flex: 1 }}>
                Learn More
              </Link>
              <Link to={user ? "/home" : "/login"} className="pub-btn pub-btn-primary pub-btn-sm">
                {user && currentRole === "buyer" ? "Open Your App →" : "Order Now →"}
              </Link>
            </div>
          </div>
        </div>

        {/* Why Logikchain Section */}
        <div style={{ marginTop: "4.5rem" }} className="pub-section-header">
          <h2>Engineered for High-Reliability Operations</h2>
          <p>Eliminating middleman friction through transparent digital verification and distributed cash custody.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          <div style={{ background: "#ffffff", padding: "1.75rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ fontSize: "1.1rem", color: "#1b7f3b", marginBottom: "0.5rem" }}>⚡ Real-Time OTP & QR Handshakes</h4>
            <p style={{ color: "#475569", fontSize: "0.95rem" }}>
              Every package transfer between depot, driver, and merchant is validated cryptographically via single-use digital handshakes, completely eliminating loss and dispute ambiguities.
            </p>
          </div>
          <div style={{ background: "#ffffff", padding: "1.75rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ fontSize: "1.1rem", color: "#1b7f3b", marginBottom: "0.5rem" }}>🛡️ Secure Cash Custody</h4>
            <p style={{ color: "#475569", fontSize: "0.95rem" }}>
              Built-in float verification and cash limits ensure transparent physical cash custody without risking courier safety or merchant capital.
            </p>
          </div>
          <div style={{ background: "#ffffff", padding: "1.75rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ fontSize: "1.1rem", color: "#1b7f3b", marginBottom: "0.5rem" }}>📱 Offline-First PWA</h4>
            <p style={{ color: "#475569", fontSize: "0.95rem" }}>
              Field apps function reliably even in low-connectivity rural belts with automated outbox sync as soon as cellular data recovers.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
