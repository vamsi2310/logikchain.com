import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { getDb } from "@/firebase/app";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useToast } from "@/state/toast";
import {
  SupportChrome as Chrome,
  SptEmpty as EmptyState,
  SptField as Field,
  SptStatusChip as StatusChip,
} from "../SupportChrome";
import { Button, Card } from "@/ui/primitives";
import type { Gig, RouteDoc } from "@/types/domain";

interface VillageStopInput {
  villageId: string;
  name: string;
  journeyTimeFromOrigin: number;
  latitude: number;
  longitude: number;
}

const DEFAULT_DEMO_ROUTES: Array<Omit<RouteDoc, "createdAt" | "updatedAt">> = [
  {
    id: "rte_prakasam_north_corridor",
    supplierId: "GLOBAL",
    isPreConfigured: true,
    name: "Prakasam North Agro Corridor (NH16)",
    origin: "Ongole Central Logistics Hub",
    destination: "Chimakurthy Mining & Market Hub",
    length: 48,
    duration: 75,
    status: "active",
    description: "Standard morning transit route connecting coastal distribution to agro-processing mandals. Serves 4 high-demand panchayats.",
    villages: [
      { villageId: "vil_ongole_rural", name: "Ongole Rural", journeyTimeFromOrigin: 15, location: { latitude: 15.5057, longitude: 80.0499 } },
      { villageId: "vil_pellur", name: "Pellur Mandal", journeyTimeFromOrigin: 30, location: { latitude: 15.5412, longitude: 80.0125 } },
      { villageId: "vil_maddipadu", name: "Maddipadu Junction", journeyTimeFromOrigin: 50, location: { latitude: 15.6128, longitude: 79.9842 } },
      { villageId: "vil_chimakurthy", name: "Chimakurthy Central", journeyTimeFromOrigin: 75, location: { latitude: 15.5841, longitude: 79.8732 } },
    ],
  },
  {
    id: "rte_guntur_delta_loop",
    supplierId: "GLOBAL",
    isPreConfigured: true,
    name: "Guntur Delta Express Loop",
    origin: "Guntur Terminal Hub",
    destination: "Tenali Agricultural Cluster",
    length: 36,
    duration: 60,
    status: "active",
    description: "High-density retail delivery loop for FMCG, packaged goods, and farm essentials with guaranteed sub-1hr turnaround.",
    villages: [
      { villageId: "vil_narakodur", name: "Narakodur Cross", journeyTimeFromOrigin: 20, location: { latitude: 16.2341, longitude: 80.5123 } },
      { villageId: "vil_chebrolu", name: "Chebrolu Heritage", journeyTimeFromOrigin: 38, location: { latitude: 16.1982, longitude: 80.5342 } },
      { villageId: "vil_tenali_market", name: "Tenali Market Yard", journeyTimeFromOrigin: 60, location: { latitude: 16.2431, longitude: 80.6481 } },
    ],
  },
  {
    id: "rte_kurnool_western_link",
    supplierId: "GLOBAL",
    isPreConfigured: true,
    name: "Kurnool Western Hinterland Route",
    origin: "Kurnool Regional Fulfillment Center",
    destination: "Dhone Transit Point",
    length: 54,
    duration: 90,
    status: "active",
    description: "Primary link for semi-arid rural nodes with scheduled stops for bulk farm machinery and daily merchant replenishment.",
    villages: [
      { villageId: "vil_veldurthi", name: "Veldurthi Hub Stop", journeyTimeFromOrigin: 35, location: { latitude: 15.5832, longitude: 77.9621 } },
      { villageId: "vil_krishnagiri", name: "Krishnagiri Cross", journeyTimeFromOrigin: 60, location: { latitude: 15.5211, longitude: 77.9142 } },
      { villageId: "vil_dhone", name: "Dhone Town Market", journeyTimeFromOrigin: 90, location: { latitude: 15.4215, longitude: 77.8812 } },
    ],
  },
];

export function PreConfiguredRoutesScreen() {
  const nav = useNavigate();
  const { push } = useToast();
  const routesQuery = useQuery<RouteDoc>(Col.Routes, [], []);
  const hubsQuery = useQuery<Record<string, unknown>>(Col.Hubs, [], []);
  const villagesQuery = useQuery<Record<string, unknown>>(Col.Villages, [], []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [lengthKm, setLengthKm] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [description, setDescription] = useState("");
  const [hubId, setHubId] = useState("");
  const [stops, setStops] = useState<VillageStopInput[]>([
    { villageId: "", name: "", journeyTimeFromOrigin: 15, latitude: 15.5, longitude: 80.0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // All pre-configured routes
  const preConfiguredRoutes = routesQuery.rows.filter(
    (r) => r.isPreConfigured === true || r.supplierId === "GLOBAL" || r.supplierId === "SYSTEM",
  );

  const filtered = preConfiguredRoutes.filter((r) => {
    if (statusFilter !== "all" && (r.status ?? "active") !== statusFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.origin?.toLowerCase().includes(term) ||
      r.destination?.toLowerCase().includes(term) ||
      r.description?.toLowerCase().includes(term)
    );
  });

  const totalCoverageKm = preConfiguredRoutes.reduce((acc, r) => acc + (r.length || 0), 0);
  const activeCount = preConfiguredRoutes.filter((r) => (r.status ?? "active") === "active").length;
  const avgStops = preConfiguredRoutes.length > 0
    ? (preConfiguredRoutes.reduce((acc, r) => acc + (r.villages?.length || 0), 0) / preConfiguredRoutes.length).toFixed(1)
    : "0";

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const now = new Date().toISOString();
      for (const demo of DEFAULT_DEMO_ROUTES) {
        await setDoc(doc(getDb(), Col.Routes, demo.id), {
          ...demo,
          createdAt: now,
          updatedAt: now,
        });
      }
      push("Successfully seeded 3 standard corridors");
    } catch (e) {
      push((e as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleStatus = async (r: RouteDoc) => {
    const nextStatus = (r.status ?? "active") === "active" ? "inactive" : "active";
    try {
      await setDoc(doc(getDb(), Col.Routes, r.id), {
        ...r,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      push(`Corridor ${r.name} marked as ${nextStatus}`);
    } catch (e) {
      push((e as Error).message);
    }
  };

  const handleDelete = async (routeId: string, routeName: string) => {
    if (!confirm(`Are you sure you want to delete pre-configured route "${routeName}"?`)) return;
    try {
      await deleteDoc(doc(getDb(), Col.Routes, routeId));
      push("Route corridor deleted");
    } catch (e) {
      push((e as Error).message);
    }
  };

  const handleAddStop = () => {
    setStops((prev) => [
      ...prev,
      {
        villageId: "",
        name: "",
        journeyTimeFromOrigin: (prev[prev.length - 1]?.journeyTimeFromOrigin ?? 0) + 20,
        latitude: 15.5,
        longitude: 80.0,
      },
    ]);
  };

  const handleRemoveStop = (idx: number) => {
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStopChange = (idx: number, patch: Partial<VillageStopInput>) => {
    setStops((prev) =>
      prev.map((stop, i) => {
        if (i !== idx) return stop;
        return { ...stop, ...patch };
      }),
    );
  };

  const handleSelectVillageForStop = (idx: number, villageId: string) => {
    const found = villagesQuery.rows.find((v) => String(v.id) === villageId);
    if (!found) return;
    const loc = found.location as { latitude?: number; longitude?: number } | undefined;
    handleStopChange(idx, {
      villageId,
      name: String(found.name ?? villageId),
      latitude: loc?.latitude ?? 15.5,
      longitude: loc?.longitude ?? 80.0,
    });
  };

  const handleSubmitNewRoute = async () => {
    if (!name.trim()) return push("Corridor name is required");
    if (!origin.trim()) return push("Origin is required");
    if (!destination.trim()) return push("Destination is required");
    const len = Number(lengthKm);
    const dur = Number(durationMin);
    if (isNaN(len) || len <= 0) return push("Please provide a valid distance (km)");
    if (isNaN(dur) || dur <= 0) return push("Please provide a valid duration (mins)");

    const validStops = stops.filter((s) => s.name.trim());
    if (validStops.length === 0) return push("At least one village stop is required");

    setSubmitting(true);
    const routeId = `rte_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-4)}`;
    try {
      const now = new Date().toISOString();
      const payload: RouteDoc = {
        id: routeId,
        supplierId: "GLOBAL",
        isPreConfigured: true,
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        length: len,
        duration: dur,
        description: description.trim() || undefined,
        hubId: hubId || undefined,
        status: "active",
        createdAt: now,
        updatedAt: now,
        villages: validStops.map((s, index) => ({
          villageId: s.villageId.trim() || `vil_stop_${index + 1}`,
          name: s.name.trim(),
          journeyTimeFromOrigin: Number(s.journeyTimeFromOrigin) || (index + 1) * 20,
          location: {
            latitude: Number(s.latitude) || 15.5,
            longitude: Number(s.longitude) || 80.0,
          },
        })),
      };

      await setDoc(doc(getDb(), Col.Routes, routeId), payload);
      push("Pre-configured route created successfully! Any supplier can now use it.");
      setShowAddModal(false);
      // Reset
      setName("");
      setOrigin("");
      setDestination("");
      setLengthKm("");
      setDurationMin("");
      setDescription("");
      setHubId("");
      setStops([{ villageId: "", name: "", journeyTimeFromOrigin: 15, latitude: 15.5, longitude: 80.0 }]);
    } catch (e) {
      push((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Chrome
      title="Pre-configured Routes"
      screenId="SPT-09.2"
      back
      fab={{
        label: showAddModal ? "✕ Close" : "+ Pre-configure Route",
        onClick: () => setShowAddModal((v) => !v),
      }}
    >
      {/* Banner / Description */}
      <div style={{ marginBottom: 16 }}>
        <p className="spt-section-sub">
          Master transport corridors configured by Support. These routes are universally available to all suppliers for instant gig assignment and scheduled rural merchant deliveries.
        </p>
      </div>

      {/* Metric Stat Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div className="spt-card" style={{ padding: "12px 14px" }}>
          <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Corridors
          </span>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0", color: "var(--spt-ink)" }}>
            {preConfiguredRoutes.length}
          </p>
        </div>
        <div className="spt-card" style={{ padding: "12px 14px" }}>
          <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Active Status
          </span>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0", color: "#10b981" }}>
            {activeCount}
          </p>
        </div>
        <div className="spt-card" style={{ padding: "12px 14px" }}>
          <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Coverage
          </span>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0", color: "var(--spt-ink)" }}>
            {totalCoverageKm} <span style={{ fontSize: 13, fontWeight: 500 }}>km</span>
          </p>
        </div>
        <div className="spt-card" style={{ padding: "12px 14px" }}>
          <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Avg Stops
          </span>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0", color: "var(--spt-ink)" }}>
            {avgStops}
          </p>
        </div>
      </div>

      {/* Creation Drawer / Card */}
      {showAddModal && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <p className="card-title" style={{ margin: 0, fontSize: 16 }}>Pre-configure New Route Corridor</p>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                Configure a standard transit route that any supplier can adopt without manual geometry setup.
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                background: "var(--spt-primary-subtle)",
                color: "var(--spt-primary)",
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              GLOBAL ROUTE
            </span>
          </div>

          <Field label="Corridor Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ongole Hub → Chimakurthy Express Corridor"
            />
          </Field>

          {/* Quick Hub Preset */}
          {hubsQuery.rows.length > 0 && (
            <Field label="Originating Hub (Quick Select)">
              <select
                value={hubId}
                onChange={(e) => {
                  const selHub = hubsQuery.rows.find((h) => String(h.id) === e.target.value);
                  setHubId(e.target.value);
                  if (selHub) {
                    setOrigin(String(selHub.name ?? selHub.id));
                  }
                }}
              >
                <option value="">— Select Hub or enter Origin below —</option>
                {hubsQuery.rows.map((h) => (
                  <option key={String(h.id)} value={String(h.id)}>
                    {String(h.name)} ({String(h.districtId ?? "Hub")})
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Origin / Dispatch Point *">
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Ongole Central Hub"
              />
            </Field>
            <Field label="Destination Endpoint *">
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Chimakurthy Agricultural Market"
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Total Distance (km) *">
              <input
                type="number"
                step="0.1"
                value={lengthKm}
                onChange={(e) => setLengthKm(e.target.value)}
                placeholder="e.g. 48"
              />
            </Field>
            <Field label="Est. Duration (minutes) *">
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="e.g. 75"
              />
            </Field>
          </div>

          <Field label="Corridor Guidance / Supplier Notes">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Recommended for FMCG and dairy supplies. Paved 2-lane road with 4 village delivery points."
              style={{ width: "100%", borderRadius: "var(--spt-radius-sm)", padding: 8 }}
            />
          </Field>

          {/* Stops sequence */}
          <div style={{ marginTop: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--spt-ink)" }}>
                Village Stops Sequence ({stops.length})
              </label>
              <button
                type="button"
                onClick={handleAddStop}
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  background: "var(--spt-primary-subtle)",
                  color: "var(--spt-primary)",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                + Add Stop
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stops.map((stop, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr 120px 70px 70px 32px",
                    gap: 6,
                    alignItems: "center",
                    padding: 8,
                    background: "var(--spt-sidebar-bg, #f8fafc)",
                    borderRadius: 6,
                    border: "1px solid var(--spt-content-border)",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "var(--spt-primary)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div>
                    {villagesQuery.rows.length > 0 ? (
                      <select
                        value={stop.villageId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__custom__") {
                            handleStopChange(idx, { villageId: "" });
                          } else {
                            handleSelectVillageForStop(idx, val);
                          }
                        }}
                        style={{ width: "100%", fontSize: 12 }}
                      >
                        <option value="">— Select Village or Type Below —</option>
                        {villagesQuery.rows.map((v) => (
                          <option key={String(v.id)} value={String(v.id)}>
                            {String(v.name)} ({String(v.mandal ?? v.district ?? "Village")})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      style={{ marginTop: villagesQuery.rows.length > 0 ? 4 : 0, fontSize: 12 }}
                      value={stop.name}
                      onChange={(e) => handleStopChange(idx, { name: e.target.value })}
                      placeholder="Village Name"
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: 10, color: "var(--spt-ink-muted)", display: "block" }}>T+ Mins</span>
                    <input
                      type="number"
                      style={{ fontSize: 12 }}
                      value={stop.journeyTimeFromOrigin}
                      onChange={(e) => handleStopChange(idx, { journeyTimeFromOrigin: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: 10, color: "var(--spt-ink-muted)", display: "block" }}>Lat</span>
                    <input
                      type="number"
                      step="0.001"
                      style={{ fontSize: 11 }}
                      value={stop.latitude}
                      onChange={(e) => handleStopChange(idx, { latitude: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: 10, color: "var(--spt-ink-muted)", display: "block" }}>Lng</span>
                    <input
                      type="number"
                      step="0.001"
                      style={{ fontSize: 11 }}
                      value={stop.longitude}
                      onChange={(e) => handleStopChange(idx, { longitude: Number(e.target.value) })}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={stops.length <= 1}
                    onClick={() => handleRemoveStop(idx)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: stops.length <= 1 ? "var(--spt-content-border)" : "#ef4444",
                      cursor: stops.length <= 1 ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: "bold",
                    }}
                    title="Remove Stop"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmitNewRoute}>
              Save Pre-configured Corridor
            </Button>
          </div>
        </Card>
      )}

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by corridor name, origin, or destination..."
            style={{ width: "100%", height: 38, borderRadius: "var(--spt-radius-sm)", padding: "0 10px" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "active", "inactive"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStatusFilter(mode)}
              style={{
                height: 38,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "capitalize",
                borderRadius: "var(--spt-radius-sm)",
                border: "1px solid var(--spt-content-border)",
                background: statusFilter === mode ? "var(--spt-primary)" : "var(--spt-content-surface)",
                color: statusFilter === mode ? "#ffffff" : "var(--spt-ink)",
                cursor: "pointer",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        {preConfiguredRoutes.length === 0 && (
          <Button loading={seeding} variant="secondary" onClick={handleSeedDefaults}>
            ⚡ Seed Standard Corridors
          </Button>
        )}
      </div>

      {/* List of Corridors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((r) => {
          const isActive = (r.status ?? "active") === "active";
          const stopsList = r.villages || [];
          return (
            <Card key={r.id}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--spt-ink)" }}>
                      {r.name}
                    </h3>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "rgba(99, 102, 241, 0.1)",
                        color: "#6366f1",
                        fontWeight: 600,
                      }}
                    >
                      Support Pre-configured
                    </span>
                    <StatusChip status={r.status ?? "active"} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--spt-ink-subtle)" }}>
                    📍 {r.origin} <span style={{ color: "var(--spt-primary)" }}>➔</span> {r.destination}
                  </p>
                </div>

                {/* Quick actions */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(r)}
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--spt-content-border)",
                      background: "transparent",
                      color: isActive ? "#d97706" : "#10b981",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title={isActive ? "Mark Inactive" : "Mark Active"}
                  >
                    {isActive ? "Deactivate" : "Activate"}
                  </button>
                  <Button
                    variant="secondary"
                    onClick={() => nav(`/x/config/routes/${r.id}`)}
                    style={{ fontSize: 12, padding: "4px 10px" }}
                  >
                    Details & Stops
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id, r.name)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      fontSize: 14,
                      cursor: "pointer",
                      padding: "4px 6px",
                    }}
                    title="Delete Route"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Corridor Metrics */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  margin: "10px 0 8px",
                  fontSize: 12,
                  color: "var(--spt-ink-muted)",
                  flexWrap: "wrap",
                }}
              >
                <span>📏 <strong>{r.length} km</strong> total distance</span>
                <span>⏱ <strong>{r.duration} mins</strong> turnaround</span>
                <span>🏡 <strong>{stopsList.length} village stops</strong></span>
                {r.hubId && <span>🏢 Hub: <strong>{r.hubId}</strong></span>}
              </div>

              {r.description && (
                <p style={{ margin: "4px 0 10px", fontSize: 12.5, color: "var(--spt-ink-subtle)", lineHeight: 1.4 }}>
                  {r.description}
                </p>
              )}

              {/* Stop Sequence Chain */}
              {stopsList.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    overflowX: "auto",
                    padding: "8px 10px",
                    background: "var(--spt-sidebar-bg, #f8fafc)",
                    borderRadius: 6,
                    border: "1px solid var(--spt-content-border)",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--spt-ink-muted)", whiteSpace: "nowrap" }}>
                    Stops:
                  </span>
                  {stopsList.map((st, i) => (
                    <div key={st.villageId || i} style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: "var(--spt-content-surface)",
                          border: "1px solid var(--spt-content-border)",
                          color: "var(--spt-ink)",
                          fontWeight: 500,
                        }}
                      >
                        {i + 1}. {st.name} <span style={{ color: "var(--spt-ink-muted)" }}>(+{st.journeyTimeFromOrigin}m)</span>
                      </span>
                      {i < stopsList.length - 1 && (
                        <span style={{ color: "var(--spt-content-border)", fontSize: 12 }}>➔</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            glyph="🛣"
            title={search ? "No routes match search" : "No pre-configured routes"}
            hint={
              search
                ? "Try a different search query."
                : "No pre-configured corridors exist yet. Click '+ Pre-configure Route' or use the quick seed button to create standard corridors."
            }
            action={
              preConfiguredRoutes.length === 0 ? (
                <Button loading={seeding} onClick={handleSeedDefaults}>
                  ⚡ Seed 3 Standard Corridors
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </Chrome>
  );
}

export function PreConfiguredRouteDetailScreen() {
  const { routeId } = useParams();
  const nav = useNavigate();
  const { push } = useToast();
  const routeDoc = useDoc<RouteDoc>(Col.Routes, routeId);
  const gigsQuery = useQuery<Gig>(Col.Gigs, [], []);

  const route = routeDoc.data;
  const isPre = route?.isPreConfigured === true || route?.supplierId === "GLOBAL" || route?.supplierId === "SYSTEM";

  // Check how many supplier gigs have used this route
  const matchingGigs = gigsQuery.rows.filter((g) => g.routeId === routeId);

  const handleToggle = async () => {
    if (!route) return;
    const nextStatus = (route.status ?? "active") === "active" ? "inactive" : "active";
    try {
      await setDoc(doc(getDb(), Col.Routes, route.id), {
        ...route,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      push(`Route marked as ${nextStatus}`);
    } catch (e) {
      push((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!route) return;
    if (!confirm(`Are you sure you want to delete corridor "${route.name}"?`)) return;
    try {
      await deleteDoc(doc(getDb(), Col.Routes, route.id));
      push("Route deleted");
      nav("/x/config/routes");
    } catch (e) {
      push((e as Error).message);
    }
  };

  return (
    <Chrome title={route?.name ?? "Route Details"} screenId="SPT-09.3" back>
      {!route && !routeDoc.loading && (
        <EmptyState glyph="🛣" title="Route not found" hint="This corridor does not exist or was deleted." />
      )}

      {route && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Main Corridor Card */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{route.name}</h2>
                  {isPre && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: "rgba(99, 102, 241, 0.1)",
                        color: "#6366f1",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      Pre-configured by Support
                    </span>
                  )}
                  <StatusChip status={route.status ?? "active"} />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--spt-ink-subtle)" }}>
                  {route.origin} <span style={{ color: "var(--spt-primary)" }}>➔</span> {route.destination}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={handleToggle}>
                  {(route.status ?? "active") === "active" ? "Deactivate Route" : "Activate Route"}
                </Button>
                <Button variant="secondary" onClick={handleDelete} style={{ color: "#ef4444" }}>
                  Delete
                </Button>
              </div>
            </div>

            {route.description && (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--spt-ink-subtle)", lineHeight: 1.5 }}>
                {route.description}
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
                marginTop: 14,
                padding: "12px",
                background: "var(--spt-sidebar-bg, #f8fafc)",
                borderRadius: "var(--spt-radius-sm)",
                border: "1px solid var(--spt-content-border)",
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase" }}>Distance</span>
                <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700 }}>{route.length} km</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase" }}>Turnaround</span>
                <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700 }}>{route.duration} mins</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase" }}>Total Stops</span>
                <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700 }}>{route.villages?.length ?? 0}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--spt-ink-muted)", textTransform: "uppercase" }}>Supplier Gigs</span>
                <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "var(--spt-primary)" }}>
                  {matchingGigs.length} operated
                </p>
              </div>
            </div>
          </Card>

          {/* Stops Timeline */}
          <Card>
            <p className="card-title" style={{ marginBottom: 12 }}>
              Itinerary & Village Sequence ({route.villages?.length ?? 0} stops)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Origin node */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--spt-ink)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  O
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{route.origin}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--spt-ink-muted)" }}>Origin / Departure (T+0 min)</p>
                </div>
              </div>

              {/* Waypoints */}
              {route.villages?.map((v, i) => (
                <div key={v.villageId || i} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingLeft: 4 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--spt-primary)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginLeft: 4,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{v.name}</p>
                      <span style={{ fontSize: 12, color: "var(--spt-primary)", fontWeight: 600 }}>
                        +{v.journeyTimeFromOrigin} min
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--spt-ink-muted)" }}>
                      Village ID: {v.villageId} · GPS: {v.location.latitude.toFixed(4)}, {v.location.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Destination node */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--spt-ink)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  D
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{route.destination}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--spt-ink-muted)" }}>
                    Destination Endpoint (T+{route.duration} min)
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Supplier Adoption Card */}
          <Card>
            <p className="card-title" style={{ marginBottom: 4 }}>Supplier Utilization</p>
            <p className="muted" style={{ marginBottom: 12 }}>
              Gigs currently scheduled or completed by suppliers on this pre-configured corridor.
            </p>
            {matchingGigs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {matchingGigs.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--spt-content-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{g.title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--spt-ink-muted)" }}>
                        Supplier: {g.supplierName || g.supplierId} · Date: {g.date}
                      </p>
                    </div>
                    <StatusChip status={g.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "var(--spt-ink-muted)", fontStyle: "italic" }}>
                No supplier has composed a gig on this corridor yet. As soon as any supplier selects this route in their gig composer, it will appear here.
              </p>
            )}
          </Card>
        </div>
      )}
    </Chrome>
  );
}
