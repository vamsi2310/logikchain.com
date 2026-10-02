import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { where, orderBy } from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";
import { getDb } from "@/firebase/app";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useSession } from "@/state/session";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Banner, Button, Card, EmptyState, Field, Skeletons, StatusChip } from "@/ui/primitives";
import { formatDate, formatMoney } from "@/format";
import type { CreditProfile, Gig, MerchantOrder, Order, Pamphlet, Product, RouteDoc, UserProfile } from "@/types/domain";

export function SupplierDashboardScreen() {
  const nav = useNavigate();
  const { profile } = useSession();
  const gigs = useQuery<Gig>(
    profile ? Col.Gigs : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Dashboard" screenId="SUP-02">
      {!profile?.activeSubscriptionId ? (
        <Banner onClick={() => nav("/s/finance")}>Subscription required for compose and conversion.</Banner>
      ) : null}
      <div className="stack">
        <button type="button" className="list-row" onClick={() => nav("/s/villages")}>Villages ›</button>
        <button type="button" className="list-row" onClick={() => nav("/s/merchants")}>Merchants ›</button>
        <button type="button" className="list-row" onClick={() => nav("/s/drivers")}>Drivers ›</button>
        <button type="button" className="list-row" onClick={() => nav("/s/cash")}>Cash ›</button>
        <button type="button" className="list-row" onClick={() => nav("/s/convert")}>Convert buyer ›</button>
      </div>
      <h3>Live gigs</h3>
      {gigs.rows.filter((g) => g.status !== "completed").map((g) => (
        <Card key={g.id} onClick={() => nav(`/s/gigs/${g.id}`)}>
          <p className="card-title">{g.title}</p>
          <StatusChip status={g.status} />
        </Card>
      ))}
    </Chrome>
  );
}

function NetworkList({ role, to }: { role: "merchant" | "vehicle"; to: (id: string) => string }) {
  const { profile } = useSession();
  const q = useQuery<UserProfile>(
    profile ? Col.UserProfiles : null,
    profile ? [where("supplierId", "==", profile.id), where("role", "==", role)] : [],
    [profile?.id, role],
  );
  const nav = useNavigate();
  return (
    <>
      {q.loading ? <Skeletons /> : null}
      {q.rows.map((u) => (
        <Card key={u.id} onClick={() => nav(to(u.id))}>
          <p className="card-title">{u.name ?? u.phone}</p>
          <p className="muted">{u.status}</p>
        </Card>
      ))}
    </>
  );
}

export function SupplierVillagesScreen() {
  const { push } = useToast();
  const [name, setName] = useState("");
  return (
    <Chrome title="Villages" screenId="SUP-03">
      <Field label="Request village">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          try {
            await ops.requestVillage({ name, district: "", state: "", pincode: "" });
            push("Request sent to Support");
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Request village
      </Button>
    </Chrome>
  );
}

export function SupplierMerchantsScreen() {
  const nav = useNavigate();
  return (
    <Chrome title="Merchants" screenId="SUP-04">
      <NetworkList role="merchant" to={(id) => `/s/merchants/${id}`} />
      <Button variant="secondary" onClick={() => nav("/s/credit-requests")}>
        Credit requests
      </Button>
    </Chrome>
  );
}

export function SupplierMerchantDetailScreen() {
  const { merchantId } = useParams();
  const { push } = useToast();
  const mer = useDoc<UserProfile>(Col.UserProfiles, merchantId);
  const credit = useDoc<CreditProfile>(Col.CreditProfiles, merchantId);
  const [limit, setLimit] = useState("");
  return (
    <Chrome title="Merchant" screenId="SUP-04.1" back>
      <p className="card-title">{mer.data?.name}</p>
      <p>Available {formatMoney(credit.data?.creditAvailable ?? 0)}</p>
      <Field label="Set limit">
        <input value={limit} onChange={(e) => setLimit(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          if (!merchantId) return;
          try {
            await ops.setMerchantCreditLimit(merchantId, { creditLimit: Number(limit) });
            push("Limit set");
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Set credit limit
      </Button>
    </Chrome>
  );
}

export function SupplierDriversScreen() {
  return (
    <Chrome title="Drivers" screenId="SUP-05">
      <NetworkList role="vehicle" to={(id) => `/s/drivers/${id}`} />
    </Chrome>
  );
}

export function SupplierDriverDetailScreen() {
  const { driverId } = useParams();
  const d = useDoc<UserProfile>(Col.UserProfiles, driverId);
  return (
    <Chrome title="Driver" screenId="SUP-05.1" back>
      <p>{d.data?.name}</p>
      <p>{d.data?.vehicleNumber}</p>
    </Chrome>
  );
}

export function SupplierInventoryScreen() {
  const { profile } = useSession();
  const { push } = useToast();
  const q = useQuery<Product>(
    profile ? Col.Products : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  return (
    <Chrome title="Inventory" screenId="SUP-06">
      {q.rows.map((p) => (
        <Card key={p.id}>
          <p className="card-title">{p.name}</p>
          <p>
            {formatMoney(p.price)} · stock {p.stock} {p.unit}
          </p>
        </Card>
      ))}
      <Field label="New product">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Price">
        <input value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          if (!profile) return;
          const id = `prod_${Date.now()}`;
          await setDoc(doc(getDb(), Col.Products, id), {
            supplierId: profile.id,
            name,
            category: "general",
            price: Number(price),
            stock: 0,
            unit: "pcs",
            hsnCode: "0000",
          });
          push("Product created — stock via adjustProductStock");
        }}
      >
        Create product
      </Button>
    </Chrome>
  );
}

export function SupplierRoutesScreen() {
  const { profile } = useSession();
  const nav = useNavigate();
  const [tab, setTab] = useState<"all" | "standard" | "custom">("all");

  const routesQuery = useQuery<RouteDoc>(Col.Routes, [], []);

  const standardRoutes = routesQuery.rows.filter(
    (r) => r.isPreConfigured === true || r.supplierId === "GLOBAL" || r.supplierId === "SYSTEM",
  );
  const customRoutes = routesQuery.rows.filter(
    (r) => profile && r.supplierId === profile.id && !r.isPreConfigured && r.supplierId !== "GLOBAL",
  );

  const displayedRoutes =
    tab === "standard" ? standardRoutes : tab === "custom" ? customRoutes : routesQuery.rows;

  return (
    <Chrome title="Routes" screenId="SUP-07">
      <div style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Browse standard delivery corridors pre-configured by Support, or manage your custom supply routes.
        </p>
      </div>

      {/* Segmented Filter Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        <button
          type="button"
          onClick={() => setTab("all")}
          style={{
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: tab === "all" ? "var(--primary)" : "var(--surface)",
            color: tab === "all" ? "#fff" : "var(--foreground)",
            cursor: "pointer",
          }}
        >
          All Routes ({routesQuery.rows.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("standard")}
          style={{
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: tab === "standard" ? "var(--primary)" : "var(--surface)",
            color: tab === "standard" ? "#fff" : "var(--foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🌟 Pre-configured ({standardRoutes.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("custom")}
          style={{
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: tab === "custom" ? "var(--primary)" : "var(--surface)",
            color: tab === "custom" ? "#fff" : "var(--foreground)",
            cursor: "pointer",
          }}
        >
          My Custom ({customRoutes.length})
        </button>
      </div>

      {/* Routes List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {displayedRoutes.map((r) => {
          const isStandard = r.isPreConfigured === true || r.supplierId === "GLOBAL" || r.supplierId === "SYSTEM";
          const stopsCount = r.villages?.length ?? 0;
          return (
            <Card key={r.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <p className="card-title" style={{ margin: 0, fontSize: 16 }}>{r.name}</p>
                    {isStandard ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "rgba(99, 102, 241, 0.12)",
                          color: "#4f46e5",
                          fontWeight: 600,
                        }}
                      >
                        ✓ Support Pre-configured
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "rgba(100, 116, 139, 0.12)",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        Custom Route
                      </span>
                    )}
                  </div>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500 }}>
                    {r.origin} <span style={{ color: "var(--primary)" }}>➔</span> {r.destination}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    variant="secondary"
                    onClick={() => nav(`/s/routes/${r.id}`)}
                    style={{ fontSize: 12, padding: "6px 10px" }}
                  >
                    View Stops
                  </Button>
                  <Button
                    onClick={() => nav(`/s/gigs/new?routeId=${r.id}`)}
                    style={{ fontSize: 12, padding: "6px 12px" }}
                  >
                    Use in Gig ➔
                  </Button>
                </div>
              </div>

              {/* Metrics */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  margin: "10px 0 6px",
                  fontSize: 12,
                  color: "var(--muted)",
                  flexWrap: "wrap",
                }}
              >
                <span>📏 <strong>{r.length || 0} km</strong></span>
                <span>⏱ <strong>{r.duration || 0} mins</strong> turnaround</span>
                <span>🏡 <strong>{stopsCount} stops</strong></span>
              </div>

              {r.description && (
                <p style={{ margin: "4px 0 8px", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                  {r.description}
                </p>
              )}

              {/* Stop chips */}
              {r.villages && r.villages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {r.villages.map((v, i) => (
                    <span
                      key={v.villageId || i}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {i + 1}. {v.name}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}

        {displayedRoutes.length === 0 && (
          <EmptyState
            glyph="🛣"
            title="No routes found"
            hint={
              tab === "custom"
                ? "You haven't created any custom routes. You can use any of the Support Pre-configured routes anytime."
                : "No routes match this filter."
            }
            action={
              tab === "custom" ? (
                <Button onClick={() => setTab("standard")}>
                  View Support Pre-configured Routes
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </Chrome>
  );
}

export function SupplierRouteBuilderScreen() {
  const { routeId } = useParams();
  const nav = useNavigate();
  const r = useDoc<RouteDoc>(Col.Routes, routeId);
  const route = r.data;
  const isStandard =
    route?.isPreConfigured === true || route?.supplierId === "GLOBAL" || route?.supplierId === "SYSTEM";

  return (
    <Chrome title={route?.name ?? "Route Details"} screenId="SUP-07.1" back>
      {route ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isStandard && (
            <Banner>
              🌟 <strong>Support Pre-configured Corridor:</strong> This standard route is managed by Logikchain Support and verified for all platform suppliers. You can immediately assign deliveries and compose gigs on this route.
            </Banner>
          )}

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{route.name}</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                  {route.origin} <span style={{ color: "var(--primary)" }}>➔</span> {route.destination}
                </p>
              </div>
              <Button onClick={() => nav(`/s/gigs/new?routeId=${route.id}`)}>
                Compose Gig on this Route ➔
              </Button>
            </div>

            {route.description && (
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                {route.description}
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 8,
                marginTop: 14,
                padding: 10,
                background: "var(--surface)",
                borderRadius: 6,
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Total Distance</span>
                <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700 }}>{route.length} km</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Turnaround</span>
                <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700 }}>{route.duration} mins</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Total Stops</span>
                <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700 }}>{route.villages?.length ?? 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="card-title" style={{ marginBottom: 12 }}>
              Delivery Sequence & Waypoints ({route.villages?.length ?? 0} stops)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--foreground)", color: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                  O
                </span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{route.origin}</p>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Dispatch Origin (T+0 min)</span>
                </div>
              </div>

              {route.villages?.map((v, i) => (
                <div key={v.villageId || i} style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingLeft: 4 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{v.name}</p>
                      <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                        +{v.journeyTimeFromOrigin} min
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      Village ID: {v.villageId} · GPS: {v.location.latitude.toFixed(4)}, {v.location.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--foreground)", color: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                  D
                </span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{route.destination}</p>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>End of Route (T+{route.duration} min)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState glyph="🛣" title="Route not found" hint="This route does not exist." />
      )}
    </Chrome>
  );
}

export function SupplierPamphletsScreen() {
  const { profile } = useSession();
  const nav = useNavigate();
  const q = useQuery<Pamphlet>(
    profile ? Col.Pamphlets : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Pamphlets" screenId="SUP-08">
      {q.rows.map((p) => (
        <Card key={p.id} onClick={() => nav(`/s/pamphlets/${p.id}`)}>
          <p className="card-title">{p.title}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupplierGigComposerScreen() {
  const { profile } = useSession();
  const { push } = useToast();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const routesQuery = useQuery<RouteDoc>(Col.Routes, [], []);

  const [title, setTitle] = useState("");
  const [routeId, setRouteId] = useState(searchParams.get("routeId") || "");
  const [date, setDate] = useState("");

  const standardRoutes = routesQuery.rows.filter(
    (r) => r.isPreConfigured === true || r.supplierId === "GLOBAL" || r.supplierId === "SYSTEM",
  );
  const customRoutes = routesQuery.rows.filter(
    (r) => profile && r.supplierId === profile.id && !r.isPreConfigured && r.supplierId !== "GLOBAL",
  );

  const selectedRoute = routesQuery.rows.find((r) => r.id === routeId);
  const isSelectedStandard =
    selectedRoute?.isPreConfigured === true ||
    selectedRoute?.supplierId === "GLOBAL" ||
    selectedRoute?.supplierId === "SYSTEM";

  return (
    <Chrome title="Compose gig" screenId="SUP-09" back>
      {!profile?.activeSubscriptionId ? <Banner>Subscription required</Banner> : null}
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Morning Grocery & Farm Inputs Run"
        />
      </Field>
      <Field label="Route">
        <select
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          style={{ minHeight: 48, width: "100%" }}
        >
          <option value="">— Select a Route —</option>
          {standardRoutes.length > 0 && (
            <optgroup label="🌟 Standard Pre-configured Routes (Available to all suppliers)">
              {standardRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.origin} ➔ {r.destination}, {r.length}km, {r.villages?.length ?? 0} stops)
                </option>
              ))}
            </optgroup>
          )}
          {customRoutes.length > 0 && (
            <optgroup label="📋 My Custom Routes">
              {customRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.origin} ➔ {r.destination})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>

      {/* Selected Route Preview */}
      {selectedRoute && (
        <div
          style={{
            padding: "10px 12px",
            background: isSelectedStandard ? "rgba(99, 102, 241, 0.06)" : "var(--surface)",
            borderRadius: 6,
            border: isSelectedStandard ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid var(--border)",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {isSelectedStandard && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: "2px 6px",
                  background: "#4f46e5",
                  color: "#fff",
                  borderRadius: 3,
                  fontWeight: 700,
                }}
              >
                SUPPORT PRE-CONFIGURED
              </span>
            )}
            <strong style={{ fontSize: 13 }}>{selectedRoute.name}</strong>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            📍 {selectedRoute.origin} ➔ {selectedRoute.destination} · {selectedRoute.length} km · {selectedRoute.duration} mins turnaround · {selectedRoute.villages?.length ?? 0} village stops
          </p>
          {selectedRoute.villages && selectedRoute.villages.length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--foreground)" }}>
              Stops: {selectedRoute.villages.map((v) => v.name).join(" ➔ ")}
            </p>
          )}
        </div>
      )}

      <Field label="Date">
        <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
      </Field>
      <Button
        disabled={!profile?.activeSubscriptionId || !routeId}
        onClick={async () => {
          try {
            const res = (await ops.composeGig({
              title,
              routeId,
              vehicleId: "",
              pamphletId: "",
              merchantIds: [],
              date,
              arrivingTimes: {},
            })) as { gigId: string };
            nav(`/s/gigs/${res.gigId}`);
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Compose
      </Button>
    </Chrome>
  );
}

export function SupplierGigsScreen() {
  const { profile } = useSession();
  const nav = useNavigate();
  const q = useQuery<Gig>(
    profile ? Col.Gigs : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Gigs" screenId="SUP-10" fab={{ label: "Compose", onClick: () => nav("/s/gigs/new") }}>
      {q.rows.map((g) => (
        <Card key={g.id} onClick={() => nav(`/s/gigs/${g.id}`)}>
          <p className="card-title">{g.title}</p>
          <StatusChip status={g.status} />
          <p>{formatDate(g.date)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupplierGigDetailScreen() {
  const { gigId } = useParams();
  const { push } = useToast();
  const g = useDoc<Gig>(Col.Gigs, gigId);
  return (
    <Chrome title="Gig" screenId="SUP-10.1" back>
      {g.data ? (
        <>
          <p className="card-title">{g.data.title}</p>
          <StatusChip status={g.data.status} />
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await ops.suspendGig(g.data!.id, { reason: "Breakdown" });
              } catch (e) {
                push((e as Error).message);
              }
            }}
          >
            Suspend
          </Button>
        </>
      ) : (
        <Skeletons n={1} />
      )}
    </Chrome>
  );
}

export function SupplierOrdersScreen() {
  const { profile } = useSession();
  const nav = useNavigate();
  const q = useQuery<Order>(
    profile ? Col.Orders : null,
    profile ? [where("supplierId", "==", profile.id), orderBy("createdAt", "desc")] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Orders" screenId="SUP-11">
      {q.rows.map((o) => (
        <Card key={o.id} onClick={() => nav(`/s/orders/${o.id}`)}>
          <p className="card-title">{o.invoiceNumber}</p>
          <StatusChip status={o.deliveryStatus} />
          <p>{formatMoney(o.totalPrice)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupplierOrderDetailScreen() {
  const { orderId } = useParams();
  const o = useDoc<Order>(Col.Orders, orderId);
  return (
    <Chrome title="Order" screenId="SUP-11.1" back>
      {o.data ? (
        <>
          <p>{o.data.invoiceNumber}</p>
          <p>{formatMoney(o.data.totalPrice, "₹", { invoice: true })}</p>
        </>
      ) : (
        <Skeletons n={1} />
      )}
    </Chrome>
  );
}

export function SupplierFinanceScreen() {
  const nav = useNavigate();
  return (
    <Chrome title="Finance" screenId="SUP-13">
      <button type="button" className="list-row" onClick={() => nav("/s/report")}>Financial report ›</button>
      <button type="button" className="list-row" onClick={() => nav("/s/plans")}>Plans ›</button>
      <button type="button" className="list-row" onClick={() => nav("/s/payouts")}>Payouts ›</button>
      <button type="button" className="list-row" onClick={() => nav("/s/cash")}>Cash ›</button>
    </Chrome>
  );
}

export function SupplierReportScreen() {
  const { push } = useToast();
  const [report, setReport] = useState<unknown>(null);
  return (
    <Chrome title="Report" screenId="SUP-12" back>
      <Button
        onClick={async () => {
          try {
            setReport(await ops.getFinanceReport({}));
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Load report
      </Button>
      {report ? <pre style={{ whiteSpace: "pre-wrap", font: "var(--text-caption)" }}>{JSON.stringify(report, null, 2)}</pre> : null}
    </Chrome>
  );
}

export function SupplierPayoutsScreen() {
  const { profile } = useSession();
  const nav = useNavigate();
  const q = useQuery<Record<string, unknown>>(
    profile ? Col.PayoutTransactions : null,
    profile ? [where("approvedBySupplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Payouts" screenId="SUP-05.2">
      {q.rows.map((r) => (
        <Card key={String(r.id)} onClick={() => nav(`/s/payouts/${String(r.id)}`)}>
          <StatusChip status={String(r.status ?? "")} />
          <p>{formatMoney(Number(r.netAmount ?? 0))}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupplierCashScreen() {
  const { profile } = useSession();
  const q = useQuery<Record<string, unknown>>(
    profile ? Col.CashSettlements : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  const nav = useNavigate();
  return (
    <Chrome title="Cash" screenId="SUP-16">
      {q.rows.map((s) => (
        <Card key={String(s.id)} onClick={() => nav(`/s/cash/${String(s.id)}`)}>
          <p>{String(s.id)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupplierCashConfirmScreen() {
  const { settlementId } = useParams();
  const { push } = useToast();
  const [counted, setCounted] = useState("");
  return (
    <Chrome title="Confirm settlement" screenId="SUP-16.1" back>
      <Field label="Counted amount">
        <input value={counted} onChange={(e) => setCounted(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          if (!settlementId) return;
          try {
            await ops.confirmCashSettlement(settlementId, {
              countedAmount: Number(counted),
              proof: { method: "otp", confirmationCode: "", capturedAt: new Date().toISOString() },
            });
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Confirm
      </Button>
    </Chrome>
  );
}

export function SupplierSimple({ title, id, body }: { title: string; id: string; body?: string }) {
  return (
    <Chrome title={title} screenId={id} back>
      <p className="muted">{body ?? title}</p>
    </Chrome>
  );
}

export function SupplierConvertScreen() {
  const { push } = useToast();
  const [buyerId, setBuyerId] = useState("");
  const [role, setRole] = useState<"merchant" | "vehicle">("merchant");
  return (
    <Chrome title="Convert buyer" screenId="SUP-02.1" back>
      <Field label="Buyer UID">
        <input value={buyerId} onChange={(e) => setBuyerId(e.target.value)} />
      </Field>
      <label className="checkbox">
        <input type="radio" checked={role === "merchant"} onChange={() => setRole("merchant")} /> Merchant
      </label>
      <label className="checkbox">
        <input type="radio" checked={role === "vehicle"} onChange={() => setRole("vehicle")} /> Driver
      </label>
      <Button
        onClick={async () => {
          try {
            await ops.convertBuyerToRole(buyerId, { targetRole: role });
            push("Converted");
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Convert
      </Button>
    </Chrome>
  );
}

export function CreditRequestsQueueScreen() {
  const { profile } = useSession();
  const { push } = useToast();
  const q = useQuery<Record<string, unknown>>(
    profile ? Col.CreditIncreaseRequests : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Credit requests" screenId="SUP-04.3" back>
      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <p>{String(r.merchantId)}</p>
          <Button
            variant="secondary"
            onClick={() =>
              void ops.reviewCreditIncreaseRequest(String(r.id), { decision: "approved" }).catch((e) => push(e.message))
            }
          >
            Approve
          </Button>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupplierMerchantOrdersHint() {
  const { profile } = useSession();
  const q = useQuery<MerchantOrder>(
    profile ? Col.MerchantOrders : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  return q.rows.length === 0 ? <EmptyState glyph="📦" title="No bulk orders" hint="" /> : null;
}
