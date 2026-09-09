import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { where, orderBy } from "firebase/firestore";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Button, Card, EmptyState, Field, Skeletons, StatusChip } from "@/ui/primitives";
import { formatDate, formatMoney } from "@/format";
import type { Order, UserProfile, VillageRequest } from "@/types/domain";

export function SupportOpsScreen() {
  const nav = useNavigate();
  return (
    <Chrome title="Operations" screenId="SPT-01">
      {[
        ["/x/orders/suspended", "Suspended orders"],
        ["/x/villages/requests", "Village requests"],
        ["/x/subscriptions", "Subscriptions"],
        ["/x/audit", "Audit log"],
        ["/x/cash", "Cash custody"],
        ["/x/money-exceptions", "Money exceptions"],
        ["/x/reconciliation", "Reconciliation"],
        ["/x/period-close", "Period close"],
      ].map(([to, label]) => (
        <button key={to} type="button" className="list-row" style={{ marginTop: 12 }} onClick={() => nav(to!)}>
          {label} ›
        </button>
      ))}
    </Chrome>
  );
}

export function SupportUsersScreen() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const users = useQuery<UserProfile>(Col.UserProfiles, [orderBy("createdAt", "desc")], []);
  const filtered = users.rows.filter(
    (u) =>
      !q ||
      (u.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (u.phone ?? "").includes(q) ||
      u.id.includes(q),
  );
  return (
    <Chrome title="Users" screenId="SPT-02" fab={{ label: "Create supplier", onClick: () => nav("/x/users/new-supplier") }}>
      <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 48, width: "100%" }} />
      {filtered.map((u) => (
        <Card key={u.id} onClick={() => nav(`/x/users/${u.id}`)}>
          <p className="card-title">{u.name ?? u.phone ?? u.id}</p>
          <p className="muted">
            {u.role} · {u.status}
          </p>
        </Card>
      ))}
    </Chrome>
  );
}

export function SupportUserDetailScreen() {
  const { userId } = useParams();
  const { push } = useToast();
  const u = useDoc<UserProfile>(Col.UserProfiles, userId);
  const [reason, setReason] = useState("");
  return (
    <Chrome title="User" screenId="SPT-02.1" back>
      {u.data ? (
        <>
          <p className="card-title">{u.data.name}</p>
          <p>
            {u.data.role} · {u.data.status}
          </p>
          <p>{u.data.phone}</p>
          <Field label="Suspend reason">
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button
            variant="danger"
            onClick={async () => {
              if (!userId) return;
              try {
                await ops.suspendUser(userId, {
                  reasonCode: "other",
                  reason,
                  scope: "platform",
                  restorePath: "Contact support",
                });
              } catch (e) {
                push((e as Error).message);
              }
            }}
          >
            Suspend
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!userId) return;
              try {
                await ops.restoreUser(userId);
              } catch (e) {
                push((e as Error).message);
              }
            }}
          >
            Restore
          </Button>
        </>
      ) : (
        <Skeletons n={1} />
      )}
    </Chrome>
  );
}

export function CreateSupplierScreen() {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  return (
    <Chrome title="Create supplier" screenId="SPT-02.3" back>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          try {
            await ops.createSupplier({ name, phone, email });
            push("Supplier created");
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Create
      </Button>
    </Chrome>
  );
}

export function SuspendedOrdersScreen() {
  const q = useQuery<Order>(Col.Orders, [where("deliveryStatus", "==", "suspended")], []);
  return (
    <Chrome title="Suspended orders" screenId="SPT-03" back>
      {q.rows.map((o) => (
        <Card key={o.id}>
          <p>{o.invoiceNumber}</p>
          <p className="muted">{o.suspensionReason}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function VillageRequestsScreen() {
  const { push } = useToast();
  const q = useQuery<VillageRequest>(Col.VillageRequests, [where("status", "==", "pending_support_review")], []);
  return (
    <Chrome title="Village requests" screenId="SPT-04" back>
      {q.rows.map((r) => (
        <Card key={r.id}>
          <p className="card-title">{r.name}</p>
          <p>
            {r.district}, {r.state}
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              void ops.rejectVillageRequest(r.id, { reason: "Incomplete" }).catch((e) => push(e.message))
            }
          >
            Reject
          </Button>
        </Card>
      ))}
    </Chrome>
  );
}

export function ConfigHomeScreen() {
  const nav = useNavigate();
  const items = [
    ["/x/config/countries", "Countries"],
    ["/x/config/states", "States"],
    ["/x/config/districts", "Districts"],
    ["/x/config/hubs", "Hubs"],
    ["/x/config/plans", "Plans"],
    ["/x/config/tariffs", "Tariffs"],
    ["/x/config/offers", "Offers"],
    ["/x/config/codes", "Discount codes"],
    ["/x/config/tax", "Tax"],
    ["/x/config/tds", "TDS"],
  ];
  return (
    <Chrome title="Config" screenId="SPT-05">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map(([to, label]) => (
          <button key={to} type="button" className="card" onClick={() => nav(to!)}>
            {label}
          </button>
        ))}
      </div>
    </Chrome>
  );
}

function ConfigList({
  title,
  id,
  col,
  upsert,
}: {
  title: string;
  id: string;
  col: string;
  upsert: (recordId: string, body: Record<string, unknown>) => Promise<unknown>;
}) {
  const q = useQuery<Record<string, unknown>>(col, [], []);
  const [name, setName] = useState("");
  const { push } = useToast();
  return (
    <Chrome title={title} screenId={id} back>
      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <p className="card-title">{String(r.name ?? r.id)}</p>
          <StatusChip status={String(r.status ?? "active")} />
        </Card>
      ))}
      <Field label="New name">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          try {
            await upsert(name.toLowerCase().replace(/\s+/g, "_"), { name, status: "active" });
            push("Saved");
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Save
      </Button>
    </Chrome>
  );
}

export function CountriesScreen() {
  return <ConfigList title="Countries" id="SPT-06" col={Col.Countries} upsert={ops.upsertCountry} />;
}
export function StatesScreen() {
  return <ConfigList title="States" id="SPT-07" col={Col.States} upsert={ops.upsertState} />;
}
export function DistrictsScreen() {
  return <ConfigList title="Districts" id="SPT-08" col={Col.Districts} upsert={ops.upsertDistrict} />;
}
export function HubsScreen() {
  const q = useQuery<Record<string, unknown>>(Col.Hubs, [], []);
  const nav = useNavigate();
  return (
    <Chrome title="Hubs" screenId="SPT-09" back>
      {q.rows.map((h) => (
        <Card key={String(h.id)} onClick={() => nav(`/x/config/hubs/${String(h.id)}`)}>
          <p className="card-title">{String(h.name)}</p>
        </Card>
      ))}
    </Chrome>
  );
}
export function HubDetailScreen() {
  const { hubId } = useParams();
  const h = useDoc<Record<string, unknown>>(Col.Hubs, hubId);
  return (
    <Chrome title="Hub" screenId="SPT-09.1" back>
      <p>{String(h.data?.name ?? "")}</p>
    </Chrome>
  );
}
export function PlansScreen() {
  return <ConfigList title="Plans" id="SPT-10" col={Col.SubscriptionPlans} upsert={ops.upsertSubscriptionPlan} />;
}
export function TariffsScreen() {
  return <ConfigList title="Tariffs" id="SPT-11" col={Col.PlanTariffs} upsert={ops.upsertPlanTariff} />;
}
export function OffersScreen() {
  return <ConfigList title="Offers" id="SPT-12" col={Col.SubscriptionOffers} upsert={ops.upsertSubscriptionOffer} />;
}
export function CodesScreen() {
  return <ConfigList title="Discount codes" id="SPT-13" col={Col.OfferDiscountCodes} upsert={ops.upsertOfferDiscountCode} />;
}

export function SupportSearchScreen() {
  const nav = useNavigate();
  const [col, setCol] = useState("Orders");
  const [id, setId] = useState("");
  return (
    <Chrome title="Search" screenId="SPT-15">
      <Field label="Collection">
        <input value={col} onChange={(e) => setCol(e.target.value)} />
      </Field>
      <Field label="Id">
        <input value={id} onChange={(e) => setId(e.target.value)} />
      </Field>
      <Button onClick={() => nav(`/x/records/${col}/${id}`)}>Open</Button>
    </Chrome>
  );
}

export function RecordDetailScreen() {
  const { collection, id } = useParams();
  const doc = useDoc<Record<string, unknown>>(collection ?? null, id);
  return (
    <Chrome title="Record" screenId="SPT-15.1" back>
      {doc.data ? (
        <pre style={{ whiteSpace: "pre-wrap", font: "var(--text-caption)" }}>{JSON.stringify(doc.data, null, 2)}</pre>
      ) : (
        <EmptyState glyph="🔍" title="Not found" hint="Check the collection and id." />
      )}
    </Chrome>
  );
}

export function AuditLogScreen() {
  const q = useQuery<Record<string, unknown>>(Col.AuditLogEntries, [orderBy("createdAt", "desc")], []);
  return (
    <Chrome title="Audit" screenId="SPT-16" back>
      {q.rows.map((a) => (
        <Card key={String(a.id)}>
          <p>{String(a.operationId ?? a.action ?? a.id)}</p>
          <p className="muted">{formatDate(String(a.createdAt ?? ""))}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function CashConsoleScreen() {
  const nav = useNavigate();
  const q = useQuery<Record<string, unknown>>(Col.CashDiscrepancies, [where("status", "==", "open")], []);
  return (
    <Chrome title="Cash custody" screenId="SPT-19">
      <Button variant="secondary" onClick={() => nav("/x/cash/discrepancies")}>
        Discrepancies ({q.rows.length})
      </Button>
    </Chrome>
  );
}

export function DiscrepanciesScreen() {
  const { push } = useToast();
  const q = useQuery<Record<string, unknown>>(Col.CashDiscrepancies, [], []);
  return (
    <Chrome title="Discrepancies" screenId="SPT-19.1" back>
      {q.rows.map((d) => (
        <Card key={String(d.id)}>
          <p>{formatMoney(Number(d.amount ?? 0))}</p>
          <Button
            variant="secondary"
            onClick={() =>
              void ops.resolveCashDiscrepancy(String(d.id), { resolution: "written_off", reason: "Support review" }).catch((e) =>
                push(e.message),
              )
            }
          >
            Resolve
          </Button>
        </Card>
      ))}
    </Chrome>
  );
}

export function MoneyExceptionsScreen() {
  const q = useQuery<Record<string, unknown>>(Col.PaymentTransactions, [where("status", "==", "pending")], []);
  return (
    <Chrome title="Money exceptions" screenId="SPT-20" back>
      {q.rows.map((p) => (
        <Card key={String(p.id)}>
          <StatusChip status={String(p.status ?? "pending")} />
          <p>{formatMoney(Number(p.amount ?? 0))}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function ReconciliationScreen() {
  const { push } = useToast();
  const q = useQuery<Record<string, unknown>>(Col.ReconciliationRuns, [orderBy("createdAt", "desc")], []);
  return (
    <Chrome title="Reconciliation" screenId="SPT-21" back>
      <Button
        onClick={async () => {
          try {
            await ops.runReconciliation({});
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Run
      </Button>
      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <StatusChip status={String(r.status ?? "")} />
        </Card>
      ))}
    </Chrome>
  );
}

export function PeriodCloseScreen() {
  const q = useQuery<Record<string, unknown>>(Col.AccountingPeriods, [], []);
  const { push } = useToast();
  return (
    <Chrome title="Period close" screenId="SPT-22" back>
      {q.rows.map((p) => (
        <Card key={String(p.id)}>
          <p>{String(p.id)}</p>
          <StatusChip status={String(p.status ?? "open")} />
          <Button
            variant="secondary"
            onClick={() => void ops.closeAccountingPeriod(String(p.id)).catch((e) => push(e.message))}
          >
            Close
          </Button>
        </Card>
      ))}
    </Chrome>
  );
}

export function TaxScreen() {
  return (
    <Chrome title="Tax" screenId="SPT-23" back>
      <p className="muted">upsertTaxProfile from a supplier GSTIN.</p>
    </Chrome>
  );
}

export function TdsScreen() {
  const { push } = useToast();
  const [reg, setReg] = useState<unknown>(null);
  return (
    <Chrome title="TDS" screenId="SPT-24" back>
      <Button
        onClick={async () => {
          try {
            setReg(await ops.getTdsRegister({}));
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Load register
      </Button>
      {reg ? <pre style={{ whiteSpace: "pre-wrap", font: "var(--text-caption)" }}>{JSON.stringify(reg, null, 2)}</pre> : null}
    </Chrome>
  );
}

export function SupportSubscriptionsScreen() {
  const q = useQuery<Record<string, unknown>>(Col.PlatformSubscriptions, [], []);
  return (
    <Chrome title="Subscriptions" screenId="SPT-14" back>
      {q.rows.map((s) => (
        <Card key={String(s.id)}>
          <StatusChip status={String(s.status ?? "")} />
        </Card>
      ))}
    </Chrome>
  );
}

export function SupportSimple({ title, id }: { title: string; id: string }) {
  return (
    <Chrome title={title} screenId={id} back>
      <p className="muted">{title}</p>
    </Chrome>
  );
}
