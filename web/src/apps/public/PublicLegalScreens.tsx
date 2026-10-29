import { useState } from "react";
import { PublicLayout } from "./PublicLayout";

type LegalTab = "terms" | "terms-buyer" | "terms-merchant" | "terms-driver" | "terms-credit" | "privacy";

export function PublicLegalScreen({ initialDoc }: { initialDoc?: string }) {
  const [activeTab, setActiveTab] = useState<LegalTab>(
    (initialDoc as LegalTab) || "terms"
  );

  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Governance & Transparency</span>
          <h2>Legal Framework & Terms of Service</h2>
          <p>
            Plain-English policies and statutory terms safeguarding all participants across our logistics and commerce platform.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="pub-tabs">
          <button
            type="button"
            className={`pub-tab-btn ${activeTab === "terms" ? "active" : ""}`}
            onClick={() => setActiveTab("terms")}
          >
            General Terms
          </button>
          <button
            type="button"
            className={`pub-tab-btn ${activeTab === "terms-buyer" ? "active" : ""}`}
            onClick={() => setActiveTab("terms-buyer")}
          >
            Buyer Terms
          </button>
          <button
            type="button"
            className={`pub-tab-btn ${activeTab === "terms-merchant" ? "active" : ""}`}
            onClick={() => setActiveTab("terms-merchant")}
          >
            Merchant Agreement
          </button>
          <button
            type="button"
            className={`pub-tab-btn ${activeTab === "terms-driver" ? "active" : ""}`}
            onClick={() => setActiveTab("terms-driver")}
          >
            Driver Gig Agreement
          </button>
          <button
            type="button"
            className={`pub-tab-btn ${activeTab === "terms-credit" ? "active" : ""}`}
            onClick={() => setActiveTab("terms-credit")}
          >
            Micro-Credit Disclosures
          </button>
          <button
            type="button"
            className={`pub-tab-btn ${activeTab === "privacy" ? "active" : ""}`}
            onClick={() => setActiveTab("privacy")}
          >
            Privacy Policy
          </button>
        </div>

        {/* Article Body */}
        <div className="pub-article">
          {activeTab === "terms" && (
            <div>
              <h1>Master Terms of Use</h1>
              <div className="article-meta">Last Updated: October 2026 · Effective across all Logikchain applications</div>
              <p>
                Welcome to Logikchain. These Master Terms of Use govern access to and usage of the Logikchain digital platform, web applications, and related logistics orchestration services operated by Logikchain Technologies Private Limited.
              </p>
              <h2>1. Platform Eligibility</h2>
              <p>
                Any individual or business registering on the platform must be at least 18 years old and capable of forming a legally binding contract under the Indian Contract Act, 1872.
              </p>
              <h2>2. Account Security & Verification</h2>
              <p>
                You are responsible for maintaining the confidentiality of your mobile authentication credentials, PINs, and single-use OTP codes. Any action initiated from your verified phone number shall be deemed authorized by you.
              </p>
              <h2>3. Acceptable Use Policy</h2>
              <p>
                Users are strictly prohibited from manipulating geolocation data, transmitting counterfeit or restricted goods, circumventing platform payment escrow, or tampering with cryptographic package verification seals.
              </p>
            </div>
          )}

          {activeTab === "terms-buyer" && (
            <div>
              <h1>Buyer & Consumer Terms of Service</h1>
              <div className="article-meta">Applicable to all end-consumers placing orders through Logikchain</div>
              <h2>1. Order Placement & Confirmations</h2>
              <p>
                Orders placed via Logikchain connect you with verified local retail merchants. Product prices, descriptions, and availability are updated regularly by merchants. Order acceptance occurs once an assigned delivery partner is dispatched.
              </p>
              <h2>2. Payment Methods & Cancellation</h2>
              <p>
                We accept payments via Instant UPI (PhonePe, Google Pay, Paytm, BHIM), Net Banking, Credit/Debit Cards, and Cash on Delivery (COD). Orders may be canceled without cancellation fees prior to merchant packing.
              </p>
              <h2>3. Doorstep Handshake Verification</h2>
              <p>
                For your protection and proof of delivery, orders require you to share a 4-digit OTP with the delivery partner upon physical handover.
              </p>
            </div>
          )}

          {activeTab === "terms-merchant" && (
            <div>
              <h1>Merchant & Retailer Listing Agreement</h1>
              <div className="article-meta">Governs retail store partners and kirana store establishments</div>
              <h2>1. Product Catalog Accuracy & Quality</h2>
              <p>
                Merchants agree to list authentic, unexpired goods adhering to FSSAI packaging guidelines and Legal Metrology standards. Mislabeled or substandard goods are grounds for immediate catalog suspension.
              </p>
              <h2>2. Settlement Cycles & Payouts</h2>
              <p>
                Digital customer payments collected through Logikchain QR or online gateways are reconciled daily and credited directly to the merchant’s registered bank account via automated IMPS/NEFT transfers.
              </p>
              <h2>3. Order Fulfillment SLAs</h2>
              <p>
                Merchants agree to prepare and hand over packaged orders within 15 minutes of driver arrival at the storefront.
              </p>
            </div>
          )}

          {activeTab === "terms-driver" && (
            <div>
              <h1>Fleet & Delivery Partner Terms</h1>
              <div className="article-meta">Agreement for independent gig logistics providers and vehicle operators</div>
              <h2>1. Independent Contractor Relationship</h2>
              <p>
                Fleet partners operate as independent service contractors and not as employees or agents of Logikchain. Drivers enjoy complete flexibility to accept or decline trip requests based on their schedule.
              </p>
              <h2>2. Physical Cash Custody & Reconciliation</h2>
              <p>
                Drivers accepting Cash on Delivery (COD) runs assume custody of cash collected until physically deposited at a designated deposit hub or remitted through digital UPI escrow prior to midnight.
              </p>
              <h2>3. Vehicle Standards & Safe Driving</h2>
              <p>
                Partners must maintain active vehicle insurance, valid road permits, and a current driver’s license. Helmet and seatbelt adherence is strictly mandatory while on active delivery assignments.
              </p>
            </div>
          )}

          {activeTab === "terms-credit" && (
            <div>
              <h1>Working Capital Micro-Credit Disclosures</h1>
              <div className="article-meta">Statutory disclosures pursuant to RBI Digital Lending Guidelines</div>
              <h2>1. Regulated NBFC Lending Partners</h2>
              <p>
                Logikchain is a technology platform and not a Non-Banking Financial Company (NBFC) or Bank. Credit facilities provided to merchants are underwritten and disbursed by our RBI-registered lending partners.
              </p>
              <h2>2. Transparent Interest & Repayment Terms</h2>
              <p>
                Key Fact Statements (KFS) stating the exact Annual Percentage Rate (APR), processing fees, and late payment penalties are presented for explicit digital consent prior to every credit drawdown.
              </p>
              <h2>3. Credit Bureau Reporting</h2>
              <p>
                Repayment performance is reported to authorized Credit Information Companies (CIBIL, Experian, CRIF High Mark) in accordance with regulatory mandates.
              </p>
            </div>
          )}

          {activeTab === "privacy" && (
            <div>
              <h1>Privacy & Data Protection Policy</h1>
              <div className="article-meta">Commitment to personal data integrity and user privacy</div>
              <h2>1. Information We Collect</h2>
              <p>
                We collect your mobile number, billing/delivery addresses, real-time GPS telemetry during active deliveries, and photo proof of delivery or storefront registration documents.
              </p>
              <h2>2. Purpose of Processing</h2>
              <p>
                Data is processed solely to route logistics shipments, authenticate account handovers, combat fraudulent activity, and facilitate payment settlements. We never sell your personal data to third-party advertising brokers.
              </p>
              <h2>3. Your Data Rights & Deletion</h2>
              <p>
                You may request an export of your transaction history or account deletion at any time by contacting our Privacy and Data Protection Officer at privacy@logikchain.com.
              </p>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicHelpScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">User Assistance</span>
          <h2>Help & Support Center</h2>
          <p>Find quick answers, troubleshooting steps, and connect with our dedicated support desk.</p>
        </div>

        <div className="pub-article">
          <h2>Frequently Asked Questions</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", margin: "1.5rem 0" }}>
            <details style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <summary style={{ fontWeight: "600", cursor: "pointer", color: "#1e293b" }}>
                How do I track my order delivery in real time?
              </summary>
              <p style={{ marginTop: "0.75rem", fontSize: "0.95rem", color: "#475569" }}>
                Once your order is picked up, open your Logikchain app and tap on the Orders tab. You will see a live interactive map displaying the courier’s vehicle position and estimated arrival time.
              </p>
            </details>

            <details style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <summary style={{ fontWeight: "600", cursor: "pointer", color: "#1e293b" }}>
                How long do refunds take to reflect in my bank account?
              </summary>
              <p style={{ marginTop: "0.75rem", fontSize: "0.95rem", color: "#475569" }}>
                UPI refunds are issued instantly and typically arrive within 15 minutes. For credit or debit card orders, refunds reflect within 3 to 5 business days depending on your bank.
              </p>
            </details>

            <details style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <summary style={{ fontWeight: "600", cursor: "pointer", color: "#1e293b" }}>
                How do I register as a merchant or retail store?
              </summary>
              <p style={{ marginTop: "0.75rem", fontSize: "0.95rem", color: "#475569" }}>
                Visit our Merchant Gateway page (`/merchants`) or launch `/m` directly. Sign in with your phone number, submit your shop details and GST/Udyam certificate, and start ordering inventory wholesale.
              </p>
            </details>

            <details style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <summary style={{ fontWeight: "600", cursor: "pointer", color: "#1e293b" }}>
                What if an item in my delivery is missing or damaged?
              </summary>
              <p style={{ marginTop: "0.75rem", fontSize: "0.95rem", color: "#475569" }}>
                Do not share the delivery verification OTP if the entire package is compromised. If only specific items are missing, accept the order and immediately raise a dispute in the app under Order Details $\to$ Report Issue.
              </p>
            </details>
          </div>

          <h2>Need Direct Help?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.35rem" }}>💬</div>
              <strong style={{ display: "block" }}>WhatsApp Support</strong>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Instant response in 5 mins</span>
              <div style={{ marginTop: "0.75rem" }}>
                <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="pub-btn pub-btn-sm pub-btn-primary" style={{ width: "100%" }}>
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.35rem" }}>✉️</div>
              <strong style={{ display: "block" }}>Email Desk</strong>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>support@logikchain.com</span>
              <div style={{ marginTop: "0.75rem" }}>
                <a href="mailto:support@logikchain.com" className="pub-btn pub-btn-sm pub-btn-outline" style={{ width: "100%" }}>
                  Send Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicSafetyScreen() {
  return (
    <PublicLayout>
      <div className="pub-container-narrow">
        <div className="pub-section-header">
          <span className="pub-hero-tag">Zero Compromise</span>
          <h2>Trust, Safety & Verification</h2>
          <p>How we ensure physical package integrity, financial escrow safety, and verified partner credibility.</p>
        </div>

        <div className="pub-article">
          <h2>1. Strict Partner Vetting & Verification</h2>
          <p>
            Every courier, depot manager, and merchant undergoes automated government identity verification (Aadhaar OTP check, Driving License check, and police background validation) before accessing delivery runs.
          </p>

          <h2>2. Physical Cash & Custody Float Protection</h2>
          <p>
            Logikchain limits the physical cash amount any single driver may hold during active runs. High-capacity COD collections require periodic bank transfers or intermediate depot drop-offs, safeguarding delivery personnel against theft and misplacement.
          </p>

          <h2>3. Encrypted Digital Seals & Audits</h2>
          <p>
            Every physical transfer is audited with tamper-evident digital timestamps and GPS coordinates. If an order route deviates abnormally, automated dispatch safeguards alert our central operations desk.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

