import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSession, roleHome } from "@/state/session";
import "@/styles/public.css";

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  buyer: "Consumer",
  merchant: "Kirana Merchant",
  vehicle: "Fleet Rider",
  driver: "Fleet Rider",
  supplier: "Depot Supplier",
  support: "Operations",
};

export function PublicLayout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const { user, profile, logout } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentRole = profile?.role ?? "buyer";
  const appDestination = roleHome(currentRole);
  const displayName = profile?.name || user?.displayName || user?.phoneNumber || user?.email || "My Account";
  const roleTitle = ROLE_DISPLAY_NAMES[currentRole] || "Member";

  useEffect(() => {
    // Capture marketing & referral attribution parameters on first touch
    const searchParams = new URLSearchParams(loc.search);
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmContent = searchParams.get("utm_content");
    const creatorId = searchParams.get("creator_id");
    const ref = searchParams.get("ref");

    if (utmSource || utmMedium || utmCampaign || creatorId || ref) {
      const attributionData = {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        creator_id: creatorId,
        ref,
        landing_path: loc.pathname,
        timestamp: new Date().toISOString(),
      };
      try {
        sessionStorage.setItem("lc_marketing_attribution", JSON.stringify(attributionData));
      } catch (err) {
        console.warn("Could not save attribution data to sessionStorage", err);
      }
    }
  }, [loc.search, loc.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [loc.pathname]);

  const isRoleActive = (path: string) => loc.pathname === path;

  return (
    <div className="public-page-wrapper">
      {/* Global Public Navigation Header */}
      <header className="pub-header" data-testid="pub-header">
        <div className="pub-nav-container">
          <Link to="/" className="pub-logo-link">
            <span>🌾 LOGIKCHAIN</span>
            <span className="pub-logo-badge">Hyper-Local Network</span>
          </Link>

          <nav className="pub-nav-links">
            <Link to="/how-it-works" className={`pub-nav-link ${isRoleActive("/how-it-works") ? "active" : ""}`}>
              How It Works
            </Link>
            <Link to="/merchants" className={`pub-nav-link ${isRoleActive("/merchants") ? "active" : ""}`}>
              For Merchants
            </Link>
            <Link to="/suppliers" className={`pub-nav-link ${isRoleActive("/suppliers") ? "active" : ""}`}>
              For Suppliers
            </Link>
            <Link to="/riders" className={`pub-nav-link ${isRoleActive("/riders") ? "active" : ""}`}>
              For Fleet & Drivers
            </Link>
            <Link to="/help" className={`pub-nav-link ${isRoleActive("/help") ? "active" : ""}`}>
              Help & Support
            </Link>
            <Link to="/work-management" className={`pub-nav-link ${isRoleActive("/work-management") ? "active" : ""}`}>
              Work Management
            </Link>
            <Link to="/status" className={`pub-nav-link ${isRoleActive("/status") ? "active" : ""}`}>
              System Status
            </Link>
            <Link to="/status/tests" className={`pub-nav-link ${isRoleActive("/status/tests") ? "active" : ""}`} style={{ color: "#0284c7", fontWeight: 700 }}>
              🧪 Tests & Videos
            </Link>
          </nav>

          <div className="pub-nav-actions">
            {user ? (
              <div className="pub-auth-logged-in">
                <Link to="/profile" className="pub-user-pill" title="View Account Profile">
                  <span className="pub-user-avatar">👤</span>
                  <span className="pub-user-name">{displayName}</span>
                  <span className="pub-role-tag">{roleTitle}</span>
                </Link>
                <a href={appDestination} className="pub-btn pub-btn-primary pub-btn-sm" data-testid="open-app-btn">
                  Open App →
                </a>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="pub-btn pub-btn-outline pub-btn-sm"
                  title="Sign out of current account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pub-auth-logged-out">
                <Link to="/login" className="pub-btn pub-btn-outline pub-btn-sm">
                  Sign In
                </Link>
                <Link to="/download" className="pub-btn pub-btn-primary pub-btn-sm">
                  Get App
                </Link>
              </div>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              className="pub-mobile-toggle"
              aria-label="Toggle Navigation Menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="pub-mobile-drawer">
            <nav className="pub-mobile-nav">
              <Link to="/how-it-works" className={`pub-mobile-link ${isRoleActive("/how-it-works") ? "active" : ""}`}>
                How It Works
              </Link>
              <Link to="/merchants" className={`pub-mobile-link ${isRoleActive("/merchants") ? "active" : ""}`}>
                For Merchants
              </Link>
              <Link to="/suppliers" className={`pub-mobile-link ${isRoleActive("/suppliers") ? "active" : ""}`}>
                For Suppliers
              </Link>
              <Link to="/riders" className={`pub-mobile-link ${isRoleActive("/riders") ? "active" : ""}`}>
                For Fleet & Drivers
              </Link>
              <Link to="/help" className={`pub-mobile-link ${isRoleActive("/help") ? "active" : ""}`}>
                Help & Support
              </Link>
              <Link to="/work-management" className={`pub-mobile-link ${isRoleActive("/work-management") ? "active" : ""}`}>
                Work Management
              </Link>
              <Link to="/status" className={`pub-mobile-link ${isRoleActive("/status") ? "active" : ""}`}>
                System Status
              </Link>
              <Link to="/status/tests" className={`pub-mobile-link ${isRoleActive("/status/tests") ? "active" : ""}`}>
                🧪 Tests & Videos
              </Link>
            </nav>

            <div className="pub-mobile-actions">
              {user ? (
                <>
                  <Link to="/profile" className="pub-user-pill pub-user-pill-mobile">
                    <span className="pub-user-avatar">👤</span>
                    <span className="pub-user-name">{displayName}</span>
                    <span className="pub-role-tag">{roleTitle}</span>
                  </Link>
                  <Link to={appDestination} className="pub-btn pub-btn-primary pub-btn-block">
                    Open App →
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="pub-btn pub-btn-outline pub-btn-block"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="pub-btn pub-btn-primary pub-btn-block">
                    Sign In
                  </Link>
                  <Link to="/download" className="pub-btn pub-btn-outline pub-btn-block">
                    Get Mobile App
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="pub-main">{children}</main>

      {/* Global Comprehensive Footer */}
      <footer className="pub-footer" data-testid="pub-footer">
        <div className="pub-footer-container">
          <div className="pub-footer-col">
            <div style={{ color: "#ffffff", fontWeight: "800", fontSize: "1.2rem", marginBottom: "0.75rem" }}>
              🌾 LOGIKCHAIN
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: "1.6", maxWidth: "280px" }}>
              Next-generation hyper-local logistics and decentralized fulfillment powering local retail, verified supply depots, and reliable last-mile deliveries.
            </p>
            <div style={{ marginTop: "1.25rem" }} className="pub-social-row">
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" title="LinkedIn">💼</a>
              <a href="https://x.com" target="_blank" rel="noreferrer" title="X / Twitter">🐦</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" title="YouTube">📺</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram">📸</a>
              <a href="https://whatsapp.com" target="_blank" rel="noreferrer" title="WhatsApp Channel">💬</a>
            </div>
          </div>

          <div className="pub-footer-col">
            <h4>Ecosystem</h4>
            <ul className="pub-footer-links">
              <li><Link to="/merchants">Kirana & Retailers</Link></li>
              <li><Link to="/suppliers">Depots & Wholesalers</Link></li>
              <li><Link to="/riders">Delivery Fleet Partners</Link></li>
              <li><Link to="/shop">Consumer Ordering</Link></li>
              <li><Link to="/download">PWA & Native Apps</Link></li>
            </ul>
          </div>

          <div className="pub-footer-col">
            <h4>Portals & Architecture</h4>
            <ul className="pub-footer-links">
              <li><Link to="/marketing" style={{ color: "#38bdf8", fontWeight: 600 }}>📢 Marketing Hub</Link></li>
              <li><Link to="/microservices" style={{ color: "#a78bfa", fontWeight: 600 }}>⚙️ Microservices Portal</Link></li>
              <li><Link to="/user-flows" style={{ color: "#4ade80", fontWeight: 600 }}>🗺️ Actor User Flows</Link></li>
              <li><Link to="/marketing/creatives">🎨 Ad Creatives & Mocks</Link></li>
              <li><Link to="/marketing/entry-points">📍 Campaign Entry Points</Link></li>
            </ul>
          </div>

          <div className="pub-footer-col">
            <h4>Platform & Updates</h4>
            <ul className="pub-footer-links">
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><Link to="/roadmap">Public Roadmap</Link></li>
              <li><Link to="/changelog">Release Notes</Link></li>
              <li><Link to="/status">Network Status</Link></li>
              <li><Link to="/status/tests" style={{ color: "#38bdf8" }}>🧪 Test Results & Videos</Link></li>
              <li><Link to="/pricing">Pricing & Transparencies</Link></li>
            </ul>
          </div>

          <div className="pub-footer-col">
            <h4>Support & Safety</h4>
            <ul className="pub-footer-links">
              <li><Link to="/help">Help Center & FAQs</Link></li>
              <li><Link to="/safety">Trust, KYC & Safety</Link></li>
              <li><Link to="/grievance">Grievance Redressal</Link></li>
              <li><Link to="/disputes">Disputes & Returns</Link></li>
              <li><Link to="/contact">Contact & Offices</Link></li>
            </ul>
          </div>

          <div className="pub-footer-col">
            <h4>Legal & Policies</h4>
            <ul className="pub-footer-links">
              <li><Link to="/legal/terms">Master Terms of Use</Link></li>
              <li><Link to="/legal/terms-buyer">Buyer Terms</Link></li>
              <li><Link to="/legal/terms-merchant">Merchant Agreement</Link></li>
              <li><Link to="/legal/terms-driver">Driver Partner Contract</Link></li>
              <li><Link to="/legal/terms-credit">Micro-Credit Disclosures</Link></li>
              <li><Link to="/legal/privacy">Privacy & Data Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="pub-footer-bottom">
          <div>
            © {new Date().getFullYear()} Logikchain Technologies Pvt Ltd. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link to="/community" style={{ color: "#9ca3af", textDecoration: "none" }}>Community Directory</Link>
            <Link to="/careers" style={{ color: "#9ca3af", textDecoration: "none" }}>Careers</Link>
            <Link to="/press" style={{ color: "#9ca3af", textDecoration: "none" }}>Press Kit</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

