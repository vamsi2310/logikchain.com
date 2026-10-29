import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { where } from "firebase/firestore";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useSession, setupIncomplete } from "@/state/session";
import { useCart } from "@/state/cart";
import { useToast } from "@/state/toast";
import { PublicLayout } from "@/apps/public/PublicLayout";
import { formatDate, formatTime, greeting } from "@/format";
import type { Gig, Pamphlet, UserProfile, Village } from "@/types/domain";

interface LocationPostalItem {
  pincode: string;
  officeName: string;
  division: string;
  region: string;
  circle: string;
}

// Fallback seed villages when Firestore is unpopulated locally
const SEED_VILLAGES: Array<{ id: string; name: string; mandal?: string; district?: string; pincode?: string }> = [
  { id: "village_karavadi", name: "Karavadi", mandal: "Ongole", district: "Prakasam", pincode: "523182" },
  { id: "village_koppolu", name: "Koppolu", mandal: "Ongole", district: "Prakasam", pincode: "523225" },
  { id: "village_madhavaram", name: "Madhavaram", mandal: "Podili", district: "Prakasam", pincode: "523240" },
  { id: "village_rayavaram", name: "Rayavaram", mandal: "Markapur", district: "Prakasam", pincode: "523315" },
  { id: "village_nikalampadu", name: "Nikalampadu", mandal: "Markapur", district: "Prakasam", pincode: "523316" },
  { id: "village_devarapalli", name: "Devarapalli", mandal: "West Godavari", district: "Eluru", pincode: "534313" },
  { id: "village_agathi", name: "Agathi S.O", mandal: "Lakshadweep", district: "Kochi", pincode: "682553" },
];

export function BuyerHomeScreen() {
  const nav = useNavigate();
  const { profile, user, refreshProfile } = useSession();
  const { clear } = useCart();
  const { push } = useToast();

  const [locOpen, setLocOpen] = useState(false);
  const [nextVillage, setNextVillage] = useState(profile?.villageId ?? "");
  const [filterQuery, setFilterQuery] = useState("");

  // Location Data Search States inside Modal
  const [postalData, setPostalData] = useState<LocationPostalItem[]>([]);
  const [postalSearch, setPostalSearch] = useState("");
  const [selectedCircle, setSelectedCircle] = useState("");

  const villageDoc = useDoc<Village>(Col.Villages, profile?.villageId);
  const merchant = useDoc<UserProfile>(Col.UserProfiles, profile?.selectedMerchantId);
  const firestoreVillages = useQuery<Village>(Col.Villages, [], []);

  // Combine Firestore villages + Seed villages so dropdown is NEVER empty
  const allVillages = useMemo(() => {
    const list = [...firestoreVillages.rows];
    for (const sv of SEED_VILLAGES) {
      if (!list.some((v) => v.id === sv.id)) {
        list.push({
          id: sv.id,
          name: `${sv.name} (${sv.pincode ? sv.pincode + ' · ' : ''}${sv.district || ''})`,
          state: "Andhra Pradesh",
          district: sv.district || "",
          pincode: sv.pincode || "",
          tier: "Tier 3",
          status: "active",
        } as Village);
      }
    }
    return list;
  }, [firestoreVillages.rows]);

  // Load postal location dataset for rich nationwide postal office search
  useEffect(() => {
    fetch("/india-pincodes-index.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: LocationPostalItem[]) => {
        if (Array.isArray(data)) setPostalData(data);
      })
      .catch(() => undefined);
  }, []);

  const circles = useMemo(() => {
    const set = new Set<string>();
    for (const p of postalData) {
      if (p.circle) set.add(p.circle);
    }
    return Array.from(set).sort();
  }, [postalData]);

  const filteredPostalResults = useMemo(() => {
    if (!postalSearch && !selectedCircle) return [];
    const term = postalSearch.trim().toLowerCase();
    const circleTerm = selectedCircle.trim().toLowerCase();

    return postalData
      .filter((p) => {
        if (circleTerm && p.circle.toLowerCase() !== circleTerm) return false;
        if (!term) return true;
        return (
          p.pincode.toLowerCase().includes(term) ||
          p.officeName.toLowerCase().includes(term) ||
          p.division.toLowerCase().includes(term)
        );
      })
      .slice(0, 30);
  }, [postalData, postalSearch, selectedCircle]);

  const activeVillageName =
    villageDoc.data?.name ||
    SEED_VILLAGES.find((v) => v.id === profile?.villageId)?.name ||
    profile?.villageId ||
    "Select Village";

  const gigs = useQuery<Gig>(
    profile?.villageId ? Col.Gigs : null,
    profile?.villageId ? [where("villageIds", "array-contains", profile.villageId)] : [],
    [profile?.villageId],
  );

  const openGigs = gigs.rows.filter((g) => g.status === "created" || g.status === "started");
  const pamphlets = useQuery<Pamphlet>(Col.Pamphlets, [], []);
  const pamphletById = useMemo(() => Object.fromEntries(pamphlets.rows.map((p) => [p.id, p])), [pamphlets.rows]);

  const incomplete = setupIncomplete(profile);

  const filteredGigs = openGigs.filter((g) => {
    if (!filterQuery) return true;
    const name = (g.title || g.routeName || "").toLowerCase();
    const pam = pamphletById[g.pamphletId]?.title?.toLowerCase() || "";
    return name.includes(filterQuery.toLowerCase()) || pam.includes(filterQuery.toLowerCase());
  });

  return (
    <PublicLayout>
      <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
        
        {/* Welcome Banner / Header */}
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: "20px", padding: "2.5rem", color: "#ffffff", marginBottom: "2rem", boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
            <div>
              <div style={{ display: "inline-block", background: "#16a34a", color: "#ffffff", fontSize: "0.75rem", fontWeight: 800, padding: "4px 12px", borderRadius: "9999px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                Buyer Dashboard • Active Corridor
              </div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 900, margin: "0 0 0.5rem 0" }}>
                {greeting()}, {profile?.name || "Neighbor"}!
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "1rem", margin: 0, maxWidth: "600px" }}>
                Explore live mandi supply runs, reserve fresh batch inventories from certified mill depots, and collect at your local village kirana.
              </p>
            </div>

            {/* Quick Corridor Selector Badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "14px", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Current Village Hub:</span>
                <button
                  type="button"
                  onClick={() => setLocOpen(true)}
                  style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                >
                  📍 {activeVillageName} ▾
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Pickup Kirana Store:</span>
                <span style={{ color: "#4ade80", fontWeight: 700, fontSize: "0.85rem" }}>
                  🏪 {merchant.data?.name || merchant.data?.shopDetails || "Main Corridor Kirana"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Incomplete Setup Alert */}
        {incomplete && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "14px", padding: "1.25rem 1.5rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.8rem" }}>⚠️</span>
              <div>
                <strong style={{ color: "#92400e", fontSize: "1rem" }}>Profile Setup Incomplete</strong>
                <div style={{ color: "#b45309", fontSize: "0.88rem" }}>Select your verified default neighborhood merchant to enable 1-click cart checkouts.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => nav("/setup")}
              style={{ padding: "0.6rem 1.25rem", background: "#d97706", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
            >
              Complete Setup ➔
            </button>
          </div>
        )}

        {/* Corridor Gigs Explorer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
              Upcoming Mandi & Depot Delivery Runs
            </h2>
            <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
              Live logistics corridors arriving at {activeVillageName}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="text"
              placeholder="Search delivery routes, crops, or mills..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", width: "280px", fontSize: "0.9rem" }}
            />
            <Link
              to="/orders"
              style={{ padding: "0.5rem 1rem", background: "#f1f5f9", color: "#0f172a", textDecoration: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem" }}
            >
              📦 My Orders
            </Link>
          </div>
        </div>

        {/* Gigs Grid */}
        {filteredGigs.length === 0 ? (
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "3.5rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚚</div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
              No Active Gigs in {activeVillageName}
            </h3>
            <p style={{ color: "#64748b", maxWidth: "450px", margin: "0 auto 1.5rem auto", fontSize: "0.95rem" }}>
              Depots and wholesale mills post new schedules daily at 06:00 AM. Check back soon or switch your village location.
            </p>
            <button
              type="button"
              onClick={() => void gigs.reload()}
              style={{ padding: "0.6rem 1.5rem", background: "#0f172a", color: "#ffffff", borderRadius: "8px", border: "none", fontWeight: 700, cursor: "pointer" }}
            >
              Refresh Schedules
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
            {filteredGigs.map((g) => {
              const pam = pamphletById[g.pamphletId];
              const eta = profile?.villageId ? g.arrivingTimes?.[profile.villageId] : undefined;
              return (
                <div
                  key={g.id}
                  onClick={() => nav(`/gigs/${g.id}`)}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    padding: "1.5rem",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.03)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, background: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: "4px" }}>
                        ● {g.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                        {formatDate(g.date)} {eta ? `• ETA ${formatTime(eta)}` : ""}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
                      {g.title || g.routeName || "Corridor Batch Route"}
                    </h3>

                    <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                      Pickup Station: <strong style={{ color: "#0f172a" }}>{merchant.data?.name || "Local Depot"}</strong>
                    </div>

                    {pam && (
                      <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0284c7" }}>{pam.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                          {pam.promotedProducts?.length || 0} wholesale items listed at direct mill prices
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#0284c7", fontWeight: 700 }}>
                      Inspect Pamphlet & Order ➔
                    </span>
                    <span style={{ fontSize: "1rem" }}>🛒</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Enhanced Village & Location Switcher Modal */}
        {locOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1.5rem" }}>
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "2rem", maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Select Delivery Village & Hub
                </h3>
                <button
                  type="button"
                  onClick={() => setLocOpen(false)}
                  style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}
                >
                  ✕
                </button>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Switching village hubs updates visible depot routes and refreshes your delivery point.
              </p>

              {/* 1. Primary Dropdown: Verified Corridor Villages */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                  Active Corridor Villages ({allVillages.length} Available)
                </label>
                <select
                  value={nextVillage}
                  onChange={(e) => setNextVillage(e.target.value)}
                  style={{ width: "100%", padding: "0.85rem", borderRadius: "10px", border: "2px solid #0284c7", fontSize: "0.95rem", background: "#f0f9ff", color: "#0f172a", fontWeight: 600 }}
                >
                  <option value="">Choose village...</option>
                  {allVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Nationwide Location Data Search from 19,312 Pincodes */}
              <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Or Search From 19,312 Post Offices & Pincodes
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <select
                    value={selectedCircle}
                    onChange={(e) => setSelectedCircle(e.target.value)}
                    style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  >
                    <option value="">All States / Circles</option>
                    {circles.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Search office or pincode..."
                    value={postalSearch}
                    onChange={(e) => setPostalSearch(e.target.value)}
                    style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>

                {filteredPostalResults.length > 0 && (
                  <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}>
                    {filteredPostalResults.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setNextVillage(`pincode_${p.pincode}`);
                          push(`Selected ${p.officeName} (${p.pincode})`);
                        }}
                        style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        <strong>{p.officeName}</strong> · <span style={{ color: "#0284c7" }}>{p.pincode}</span>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{p.division}, {p.circle}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setLocOpen(false)}
                  style={{ padding: "0.75rem 1.25rem", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!nextVillage}
                  onClick={async () => {
                    if (!nextVillage) return;
                    if (profile?.villageId && nextVillage !== profile.villageId) clear();
                    if (user) {
                      await ops.updateUserProfile(user.uid, { villageId: nextVillage });
                      await refreshProfile();
                    }
                    setLocOpen(false);
                    push("Location updated");
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    border: "none",
                    background: nextVillage ? "#16a34a" : "#cbd5e1",
                    color: "#fff",
                    cursor: nextVillage ? "pointer" : "not-allowed",
                    fontWeight: 700,
                    boxShadow: nextVillage ? "0 4px 6px -1px rgba(22, 163, 74, 0.3)" : "none"
                  }}
                >
                  Confirm Location ➔
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PublicLayout>
  );
}

export { GigDetailScreen, PamphletScreen } from "./HomeScreens";
