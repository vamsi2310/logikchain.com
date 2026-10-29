import { Link } from "react-router-dom";
import { PublicLayout } from "./PublicLayout";

export function PublicHomeScreen() {
  return (
    <PublicLayout>
      {/* Hero */}
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

      {/* Main Container */}
      <div className="pub-container">
        {/* Choose Your Persona Section */}
        <div className="pub-section-header">
          <h2>Select Your Experience</h2>
          <p>Logikchain powers purpose-built interfaces for every actor in the hyper-local supply chain.</p>
        </div>

        <div className="pub-actor-grid">
          {/* Merchant */}
          <div className="pub-card">
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
                Open App →
              </Link>
            </div>
          </div>

          {/* Supplier */}
          <div className="pub-card">
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
                Open App →
              </Link>
            </div>
          </div>

          {/* Delivery Partner */}
          <div className="pub-card">
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
                Open App →
              </Link>
            </div>
          </div>

          {/* Consumer */}
          <div className="pub-card">
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
              <Link to="/login" className="pub-btn pub-btn-primary pub-btn-sm">
                Order Now →
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

