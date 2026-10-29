import { Link } from "react-router-dom";
import { PublicLayout } from "./PublicLayout";

export function PublicHowItWorksScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">The Architecture of Hyper-Local Trade</span>
          <h2>How Logikchain Works</h2>
          <p>
            An end-to-end synchronized logistics and finance protocol connecting local shops, wholesale suppliers, and last-mile gig fleets.
          </p>
        </div>

        <div className="pub-article">
          <h2>1. The Four-Stage Lifecycle</h2>
          <p>
            Logikchain eliminates multi-tier wholesaler markups and chaotic logistics by standardizing physical distribution into four transparent stages:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", margin: "2rem 0" }}>
            <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
              <strong style={{ color: "#1b7f3b", fontSize: "1.1rem" }}>Step 1: Digital Sourcing & Catalog Sync</strong>
              <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                Wholesale depots and regional FMCG suppliers publish digitized pamphlets and verified price lists. Neighborhood merchants browse and order stock directly with pre-approved working capital micro-credit.
              </p>
            </div>

            <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
              <strong style={{ color: "#1b7f3b", fontSize: "1.1rem" }}>Step 2: Smart Gig Dispatch & Assignment</strong>
              <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                When an order or replenishment batch is confirmed, the Logikchain routing engine bundles orders into optimal delivery runs and broadcasts them to verified gig drivers and fleet operators nearby.
              </p>
            </div>

            <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
              <strong style={{ color: "#1b7f3b", fontSize: "1.1rem" }}>Step 3: Cryptographic Handover & Verification</strong>
              <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                At the depot, drivers scan container QR codes. At the retailer or consumer doorstep, an encrypted OTP or scan confirms receipt. Goods never transition status without verifiable two-party confirmation.
              </p>
            </div>

            <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
              <strong style={{ color: "#1b7f3b", fontSize: "1.1rem" }}>Step 4: Automated Instant Settlement</strong>
              <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                Upon delivery, funds are instantly disbursed via UPI to the delivery driver, supplier invoices are updated, and merchant credit balances reflect automatically. Zero paper reconciliation.
              </p>
            </div>
          </div>

          <h2>2. Transparent Handover Security</h2>
          <p>
            Logikchain uses a multi-layer verification system to prevent lost inventory and disputed deliveries:
          </p>
          <ul>
            <li><strong>Single-use OTP Verification:</strong> Delivered items require customer OTP entry on the driver app.</li>
            <li><strong>Tamper-evident Bag Seals:</strong> High-value orders are secured with scanned barcode seal tags.</li>
            <li><strong>GPS Geofenced Confirmations:</strong> Deliveries are only validated when driver telemetry aligns with destination coordinates.</li>
          </ul>

          <div className="pub-callout">
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#1b7f3b" }}>Ready to join the network?</h4>
            <p style={{ margin: 0 }}>
              Whether you run a local retail store, a distribution warehouse, or drive a commercial vehicle, getting started takes less than 5 minutes.
            </p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
              <Link to="/download" className="pub-btn pub-btn-primary pub-btn-sm">Download App</Link>
              <Link to="/contact" className="pub-btn pub-btn-outline pub-btn-sm">Contact Support</Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicMerchantScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Empowering Neighborhood Retail</span>
          <h2>Logikchain for Merchants & Kiranas</h2>
          <p>Restock faster at wholesale prices, unlock collateral-free credit, and grow your local customer base.</p>
        </div>

        <div className="pub-article">
          <p>
            Traditional retail store owners spend hours every week traveling to distant wholesale mandis, negotiating with multiple salesmen, and struggling with unpredictable cash flows. Logikchain transforms your smartphone into a 24/7 restocking command center.
          </p>

          <h2>Key Merchant Benefits</h2>
          <div className="pub-actor-grid" style={{ margin: "1.5rem 0" }}>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong>💰 ₹50,000 Micro-Credit Line</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                Order inventory now and pay after selling. Repay over 7 or 14-day cycles with zero interest for on-time settlements.
              </p>
            </div>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong>📦 Morning Doorstep Delivery</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                Place replenishment orders before 9:00 PM and receive goods at your shop counter by 8:00 AM the next morning.
              </p>
            </div>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong>📱 Digital Khata & QR Collections</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                Keep track of customer dues, generate automated WhatsApp payment reminders, and accept UPI payments at 0% MDR.
              </p>
            </div>
          </div>

          <h2>How to Onboard in 3 Steps</h2>
          <ol>
            <li><strong>Download the Merchant App (`/m`)</strong>: Enter your phone number and verify via instant SMS OTP.</li>
            <li><strong>Upload Basic Shop Proof</strong>: Provide GSTIN or Udhyam Aadhaar / Shop & Establishment photo.</li>
            <li><strong>Instant Credit Check & First Order</strong>: Get approved within 2 hours and receive your first batch of stock the next day.</li>
          </ol>

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link to="/m" className="pub-btn pub-btn-primary pub-btn-lg">
              Launch Merchant Web App →
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicSupplierScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Wholesale Supply Automation</span>
          <h2>Logikchain for Suppliers & Depots</h2>
          <p>Expand distribution to hundreds of rural and semi-urban retailers with guaranteed payment settlements.</p>
        </div>

        <div className="pub-article">
          <p>
            Eliminate the risk of merchant defaults, reduce field agent expenses, and maximize inventory turnover. Logikchain connects your stock directly to high-volume retail buyers in your region.
          </p>

          <h2>Supplier Capabilities</h2>
          <ul>
            <li><strong>Automated Stock Syndication:</strong> Upload CSV price lists or ERP sync to publish real-time stock levels and tiered bulk pricing.</li>
            <li><strong>Underwritten Receivables:</strong> Logikchain platform guarantees payment settlement on T+1 directly to your bank account via RTGS/NEFT.</li>
            <li><strong>Managed Logistics Fleet:</strong> You pick and pack; Logikchain fleet partners handle pickup from your dock and distribution to stores.</li>
            <li><strong>Real-Time Sales Heatmaps:</strong> Identify high-demand SKU trends across pincodes to forecast warehouse replenishment.</li>
          </ul>

          <div className="pub-callout">
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#1b7f3b" }}>Need a Custom ERP or SAP Integration?</h4>
            <p style={{ margin: 0 }}>
              Our enterprise integration team provides dedicated API webhooks and EDI data connectors for high-volume FMCG brands.
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link to="/s" className="pub-btn pub-btn-primary pub-btn-lg">
              Launch Supplier Portal →
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicRidersScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Earn on Your Own Schedule</span>
          <h2>Logikchain for Delivery & Fleet Drivers</h2>
          <p>Transparent daily payouts, clustered delivery runs, and zero onboarding fees.</p>
        </div>

        <div className="pub-article">
          <p>
            Whether you ride a motorcycle, drive a 3-wheeler auto cargo, or operate a mini-truck (Tata Ace/Pick-up), Logikchain gives you steady delivery orders without waiting in unpredictable lines.
          </p>

          <h2>Driver Highlights</h2>
          <div className="pub-actor-grid" style={{ margin: "1.5rem 0" }}>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong>💸 Daily Instant UPI Payouts</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                Withdraw your earnings directly to your UPI bank account immediately after finishing your run.
              </p>
            </div>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong>📍 Clustered Route Optimization</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                Our algorithms group orders geographically so you cover more deliveries with less fuel and travel time.
              </p>
            </div>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong>🛡️ Accidental Medical Insurance</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                Complimentary on-trip accident and medical cover for all active verified fleet partners.
              </p>
            </div>
          </div>

          <h2>Requirements to Join</h2>
          <ul>
            <li>Valid Driving Licence (Two-wheeler / LMV / Commercial)</li>
            <li>Vehicle Registration Certificate (RC) & Insurance</li>
            <li>Android or iOS Smartphone with GPS</li>
            <li>Aadhaar Card & Bank Account or UPI ID</li>
          </ul>

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link to="/d" className="pub-btn pub-btn-primary pub-btn-lg">
              Open Driver Application (`/d`) →
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

