import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const q = useQuery<RouteDoc>(
    profile ? Col.Routes : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Routes" screenId="SUP-07">
      {q.rows.map((r) => (
        <Card key={r.id} onClick={() => nav(`/s/routes/${r.id}`)}>
          <p className="card-title">{r.name}</p>
          <p className="muted">
            {r.origin} → {r.destination}
          </p>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupplierRouteBuilderScreen() {
  const { routeId } = useParams();
  const r = useDoc<RouteDoc>(Col.Routes, routeId);
  return (
    <Chrome title="Route builder" screenId="SUP-07.1" back>
      <p>{r.data?.name}</p>
      {r.data?.villages.map((v) => (
        <p key={v.villageId}>{v.name}</p>
      ))}
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
  const routes = useQuery<RouteDoc>(
    profile ? Col.Routes : null,
    profile ? [where("supplierId", "==", profile.id)] : [],
    [profile?.id],
  );
  const [title, setTitle] = useState("");
  const [routeId, setRouteId] = useState("");
  const [date, setDate] = useState("");
  return (
    <Chrome title="Compose gig" screenId="SUP-09" back>
      {!profile?.activeSubscriptionId ? <Banner>Subscription required</Banner> : null}
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Route">
        <select value={routeId} onChange={(e) => setRouteId(e.target.value)} style={{ minHeight: 48, width: "100%" }}>
          <option value="">—</option>
          {routes.rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
      </Field>
      <Button
        disabled={!profile?.activeSubscriptionId}
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
