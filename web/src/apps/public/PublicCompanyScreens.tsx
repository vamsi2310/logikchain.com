import { PublicLayout } from "./PublicLayout";

export function PublicAboutScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Our Mission</span>
          <h2>About Logikchain</h2>
          <p>Building the nervous system for decentralized hyper-local trade and logistics.</p>
        </div>

        <div className="pub-article">
          <p>
            India’s regional and rural retail ecosystem is powered by millions of tireless Kirana owners, wholesale mandis, and local transporters. Yet, for decades, they have operated in isolated silos—plagued by arbitrary distributor markups, cash shortages, and zero digital visibility.
          </p>

          <p>
            <strong>Logikchain was founded to change this.</strong> We architect open, high-reliability logistics protocols and working-capital rails that empower local commerce rather than displacing it.
          </p>

          <h2>Our Core Pillars</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
            <div style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#1b7f3b" }}>Empowerment over Displacement</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                We do not build predatory dark stores. We empower existing neighborhood shopkeepers and local drivers to become fast, efficient, and prosperous.
              </p>
            </div>
            <div style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#1b7f3b" }}>Deterministic Logistics</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                Every package handover is mathematically verified via QR codes, OTPs, and geofenced state transitions to ensure complete accountability.
              </p>
            </div>
            <div style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#1b7f3b" }}>Financial Inclusion</strong>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.35rem" }}>
                By bringing transparency to supply transactions, we unlock instant working capital credit for retailers previously ignored by traditional banks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicCommunityScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Stay Connected</span>
          <h2>Community & Official Social Channels</h2>
          <p>Join thousands of shop owners, logistics drivers, and developers shaping the platform.</p>
        </div>

        <div className="pub-article">
          <h2>Official Social Handles</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", margin: "1.5rem 0" }}>
            <a href="https://whatsapp.com" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "1rem", background: "#f0fdf4" }}>
              <span style={{ fontSize: "2rem" }}>💬</span>
              <div>
                <strong>WhatsApp Channels</strong>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Daily route alerts & market updates</div>
              </div>
            </a>

            <a href="https://youtube.com" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "1rem", background: "#ffffff" }}>
              <span style={{ fontSize: "2rem" }}>📺</span>
              <div>
                <strong>YouTube Learning Hub</strong>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>App video guides in 6 languages</div>
              </div>
            </a>

            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "1rem", background: "#ffffff" }}>
              <span style={{ fontSize: "2rem" }}>💼</span>
              <div>
                <strong>LinkedIn Official</strong>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Corporate milestones & hiring</div>
              </div>
            </a>

            <a href="https://x.com" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "1rem", background: "#ffffff" }}>
              <span style={{ fontSize: "2rem" }}>🐦</span>
              <div>
                <strong>X (formerly Twitter)</strong>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Product announcements & status alerts</div>
              </div>
            </a>
          </div>

          <h2>Regional Driver & Merchant WhatsApp Groups</h2>
          <p>
            Connect with local depot leads and fellow partners in your district for live dispatch assistance and roadside coordination. Contact your regional hub officer to be added to verified localized WhatsApp groups.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicContactScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Reach Out</span>
          <h2>Contact Us & Regional Hubs</h2>
          <p>Have questions, want to establish a supplier depot, or need help? We are here for you.</p>
        </div>

        <div className="pub-article">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2rem" }}>
            <div>
              <h3>Corporate Headquarters</h3>
              <p style={{ color: "#475569", lineHeight: "1.6" }}>
                <strong>Logikchain Technologies Pvt Ltd</strong><br />
                Tower B, 4th Floor, Tech Innovation Park<br />
                Outer Ring Road, Bengaluru, Karnataka 560103<br />
                India
              </p>

              <h3>Direct Inquiries</h3>
              <p style={{ color: "#475569", lineHeight: "1.6" }}>
                <strong>Merchant Support:</strong> merchant@logikchain.com<br />
                <strong>Driver Support:</strong> drivers@logikchain.com<br />
                <strong>Partnerships & Depots:</strong> partner@logikchain.com<br />
                <strong>Helpdesk Hotline:</strong> +91 (800) 123-4567
              </p>
            </div>

            <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginTop: 0 }}>Send Us a Message</h3>
              <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Our regional manager will get in touch shortly."); }}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.25rem" }}>Your Name</label>
                  <input type="text" required placeholder="Ramesh Kumar" style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.25rem" }}>Mobile Number</label>
                  <input type="tel" required placeholder="+91 98765 43210" style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.25rem" }}>I am a...</label>
                  <select style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                    <option>Retail Store Owner / Merchant</option>
                    <option>Depot / Wholesale FMCG Supplier</option>
                    <option>Delivery Driver / Fleet Partner</option>
                    <option>Consumer / Buyer</option>
                    <option>Press / Media / Investor</option>
                  </select>
                </div>
                <button type="submit" className="pub-btn pub-btn-primary" style={{ width: "100%" }}>
                  Submit Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicGrievanceScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Consumer Protection</span>
          <h2>Grievance Redressal & Compliance</h2>
          <p>Designated statutory escalation mechanism under the Consumer Protection (E-Commerce) Rules, 2020.</p>
        </div>

        <div className="pub-article">
          <p>
            In compliance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, Logikchain has instituted an expedited Grievance Redressal Mechanism.
          </p>

          <h2>Designated Grievance Officer</h2>
          <div style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", margin: "1rem 0" }}>
            <strong>Officer:</strong> Mr. Vikramaditya Sharma<br />
            <strong>Designation:</strong> Head of Trust, Safety & Compliance<br />
            <strong>Address:</strong> Logikchain Technologies Pvt Ltd, Outer Ring Road, Bengaluru, Karnataka 560103<br />
            <strong>Direct Email:</strong> grievance-officer@logikchain.com<br />
            <strong>Acknowledgment SLA:</strong> Within 48 hours<br />
            <strong>Redressal SLA:</strong> Within 30 days of grievance receipt
          </div>

          <h2>Escalation Matrix</h2>
          <ol>
            <li><strong>Level 1 (In-App Support Desk):</strong> Raise a ticket via the Help & Support screen inside your application. Handled within 4 to 12 hours.</li>
            <li><strong>Level 2 (Customer Operations Escalation):</strong> If dissatisfied, write to <code>escalations@logikchain.com</code> quoting your ticket ID.</li>
            <li><strong>Level 3 (Grievance Officer):</strong> Direct formal escalation to the statutory Grievance Officer at <code>grievance-officer@logikchain.com</code>.</li>
          </ol>
        </div>
      </div>
    </PublicLayout>
  );
}
