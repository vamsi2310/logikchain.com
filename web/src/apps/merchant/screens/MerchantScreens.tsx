import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { where, orderBy } from "firebase/firestore";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useI18n } from "@/state/locale";
import { useSession } from "@/state/session";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Button, Card, EmptyState, Field, Skeletons, StatusChip } from "@/ui/primitives";
import { formatDate, formatMoney, formatPickupCode, newIdempotencyKey } from "@/format";
import type { CreditProfile, Gig, HandoverCodeRecord, MerchantOrder, Order, Product } from "@/types/domain";

export function MerchantGigsScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile } = useSession();
  const q = useQuery<Gig>(
    profile ? Col.Gigs : null,
    profile ? [where("merchantIds", "array-contains", profile.id)] : [],
    [profile?.id],
  );
  return (
    <Chrome title={t("gigs")} screenId="MER-02">
      {q.loading ? <Skeletons /> : null}
      {!q.loading && q.rows.length === 0 ? <EmptyState glyph="🚚" title="No gigs assigned" hint="Your supplier will add you to a run." /> : null}
      {q.rows.map((g) => (
        <Card key={g.id} onClick={() => nav(`/m/gigs/${g.id}`)}>
          <p className="card-title">{g.title || g.routeName}</p>
          <StatusChip status={g.status} />
          <p className="muted">{formatDate(g.date)}</p>
        </Card>
      ))}
      <Button variant="secondary" onClick={() => nav("/m/bulk/new")}>
        Bulk order
      </Button>
    </Chrome>
  );
}

export function MerchantGigPickupsScreen() {
  const { gigId } = useParams();
  const nav = useNavigate();
  const { profile } = useSession();
  const q = useQuery<Order>(
    profile && gigId ? Col.Orders : null,
    profile && gigId ? [where("gigId", "==", gigId), where("merchantId", "==", profile.id)] : [],
    [gigId, profile?.id],
  );
  return (
    <Chrome title="Buyer pickups" screenId="MER-03" back>
      {q.rows.map((o) => (
        <Card key={o.id} onClick={() => nav(`/m/pickups/${o.id}`)}>
          <p className="card-title">{o.invoiceNumber}</p>
          <StatusChip status={o.deliveryStatus} />
          <p>{formatMoney(o.totalPrice)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function MerchantPickupDetailScreen() {
  const { orderId } = useParams();
  const { push } = useToast();
  const order = useDoc<Order>(Col.Orders, orderId);
  const [code, setCode] = useState("");
  const o = order.data;
  return (
    <Chrome title="Pickup" screenId="MER-04" back>
      {o ? (
        <>
          <StatusChip status={o.deliveryStatus} />
          <p>{o.invoiceNumber}</p>
          <Field label="Buyer code">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          </Field>
          <Button
            onClick={async () => {
              try {
                await ops.markOrderDelivered(o.id, {
                  proof: { method: "otp", confirmationCode: code, capturedAt: new Date().toISOString() },
                  cashCollected: o.paymentMode === "cash_on_pickup" ? o.totalPrice : undefined,
                  idempotencyKey: newIdempotencyKey(),
                });
                push("Delivered");
              } catch (e) {
                push((e as Error).message);
              }
            }}
          >
            Mark delivered
          </Button>
        </>
      ) : (
        <Skeletons n={1} />
      )}
    </Chrome>
  );
}

export function BulkCatalogScreen() {
  const { profile } = useSession();
  const nav = useNavigate();
  const products = useQuery<Product>(
    profile?.supplierId ? Col.Products : null,
    profile?.supplierId ? [where("supplierId", "==", profile.supplierId)] : [],
    [profile?.supplierId],
  );
  const [qty, setQty] = useState<Record<string, number>>({});
  return (
    <Chrome title="Bulk catalog" screenId="MER-05" back>
      {products.rows.map((p) => (
        <Card key={p.id}>
          <p className="card-title">{p.name}</p>
          <p>
            {formatMoney(p.price)} · {p.stock} {p.unit}
          </p>
          <input
            inputMode="numeric"
            value={qty[p.id] ?? 0}
            onChange={(e) => setQty({ ...qty, [p.id]: Number(e.target.value) })}
          />
        </Card>
      ))}
      <Button
        onClick={() => {
          sessionStorage.setItem("lc.bulk", JSON.stringify(qty));
          nav("/m/bulk/review");
        }}
      >
        Review
      </Button>
    </Chrome>
  );
}

export function BulkCheckoutScreen() {
  const { profile } = useSession();
  const nav = useNavigate();
  const { push } = useToast();
  const [mode, setMode] = useState<"credit" | "online" | "cash_on_delivery">("credit");
  const qty = JSON.parse(sessionStorage.getItem("lc.bulk") ?? "{}") as Record<string, number>;
  return (
    <Chrome title="Bulk checkout" screenId="MER-06" back>
      <label className="checkbox">
        <input type="radio" checked={mode === "credit"} onChange={() => setMode("credit")} /> Credit
      </label>
      <label className="checkbox">
        <input type="radio" checked={mode === "cash_on_delivery"} onChange={() => setMode("cash_on_delivery")} /> Cash
      </label>
      <Button
        onClick={async () => {
          if (!profile?.supplierId) return;
          try {
            const items = Object.entries(qty)
              .filter(([, n]) => n > 0)
              .map(([productId, quantity]) => ({ productId, quantity }));
            const res = (await ops.placeMerchantOrder({
              supplierId: profile.supplierId,
              items,
              paymentMode: mode,
              payWithCredit: mode === "credit",
            })) as { merchantOrderId: string };
            nav(`/m/orders/${res.merchantOrderId}`);
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Place bulk order
      </Button>
    </Chrome>
  );
}

export function MerchantOrdersScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile } = useSession();
  const q = useQuery<MerchantOrder>(
    profile ? Col.MerchantOrders : null,
    profile ? [where("merchantId", "==", profile.id), orderBy("createdAt", "desc")] : [],
    [profile?.id],
  );
  return (
    <Chrome title={t("orders")} screenId="MER-07">
      {q.rows.map((o) => (
        <Card key={o.id} onClick={() => nav(`/m/orders/${o.id}`)}>
          <p className="card-title">{o.invoiceNumber}</p>
          <StatusChip status={o.status} />
          <p>{formatMoney(o.totalPrice)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function MerchantOrderDetailScreen() {
  const { merchantOrderId } = useParams();
  const nav = useNavigate();
  const o = useDoc<MerchantOrder>(Col.MerchantOrders, merchantOrderId);
  return (
    <Chrome title="Bulk order" screenId="MER-08" back>
      {o.data ? (
        <>
          <StatusChip status={o.data.status} />
          <p>{o.data.invoiceNumber}</p>
          <p>{formatMoney(o.data.totalPrice)}</p>
          <Button variant="secondary" onClick={() => nav(`/m/orders/${o.data!.id}/handover-code`)}>
            Handover code
          </Button>
        </>
      ) : (
        <Skeletons n={1} />
      )}
    </Chrome>
  );
}

export function MerchantHandoverCodeScreen() {
  const { merchantOrderId } = useParams();
  const code = useDoc<HandoverCodeRecord>(
    merchantOrderId ? `${Col.MerchantOrders}/${merchantOrderId}/private` : null,
    "handover",
  );
  return (
    <Chrome title="Handover code" screenId="MER-08.2" back>
      <p className="display-code">{code.data?.code ? formatPickupCode(code.data.code) : "••••••"}</p>
      <Button variant="secondary" onClick={() => void ops.resendHandoverCode({ merchantOrderId, channel: "sms" })}>
        Resend
      </Button>
    </Chrome>
  );
}

export function CreditDashboardScreen() {
  const nav = useNavigate();
  const { profile } = useSession();
  const credit = useDoc<CreditProfile>(Col.CreditProfiles, profile?.id);
  const c = credit.data;
  return (
    <Chrome title="Credit" screenId="MER-09">
      {c ? (
        <Card>
          <p>Limit {formatMoney(c.creditLimit)}</p>
          <p>Used {formatMoney(c.creditUsed)}</p>
          <p className="card-title">Available {formatMoney(c.creditAvailable)}</p>
          <p className="muted">In transit {formatMoney(c.inTransitRepayments ?? c.pendingRepayments ?? 0)}</p>
        </Card>
      ) : (
        <Skeletons n={1} />
      )}
      <Button onClick={() => nav("/m/credit/repay")}>Repay</Button>
      <Button variant="secondary" onClick={() => nav("/m/credit/ledger")}>
        Ledger
      </Button>
      <Button variant="tertiary" onClick={() => nav("/m/credit/requests")}>
        Increase request
      </Button>
    </Chrome>
  );
}

export function CreditRepayScreen() {
  const { profile } = useSession();
  const { push } = useToast();
  const [amount, setAmount] = useState("");
  return (
    <Chrome title="Repay credit" screenId="MER-09.1" back>
      <Field label="Amount">
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          try {
            await ops.initiateCreditRepayment({
              merchantId: profile?.id,
              amount: Number(amount),
              method: "online",
            });
            push("Repayment started");
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Start repayment
      </Button>
    </Chrome>
  );
}

export function CreditLedgerScreen() {
  const { profile } = useSession();
  const q = useQuery<Record<string, unknown>>(
    profile ? Col.CreditTransactions : null,
    profile ? [where("merchantId", "==", profile.id), orderBy("createdAt", "desc")] : [],
    [profile?.id],
  );
  return (
    <Chrome title="Credit ledger" screenId="MER-09.3" back>
      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <p>{String(r.type ?? r.id)}</p>
          <p>{formatMoney(Number(r.amount ?? 0))}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function CreditCodesScreen() {
  const { push } = useToast();
  return (
    <Chrome title="Offline codes" screenId="MER-09.4" back>
      <Button
        onClick={async () => {
          try {
            const res = (await ops.issueOfflineCodeBatch({ ownerRole: "merchant" })) as { codes?: string[] };
            push(`Issued ${(res.codes ?? []).length} codes — save them now`);
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Issue batch
      </Button>
    </Chrome>
  );
}

export function CreditRequestsScreen() {
  const { profile } = useSession();
  const { push } = useToast();
  const [amount, setAmount] = useState("");
  return (
    <Chrome title="Credit increase" screenId="MER-10" back>
      <Field label="Requested limit">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          if (!profile) return;
          try {
            await ops.requestCreditIncrease(profile.id, { requestedAmount: Number(amount), reason: "Working capital" });
            push("Request sent");
          } catch (e) {
            push((e as Error).message);
          }
        }}
      >
        Request
      </Button>
    </Chrome>
  );
}

export function ShopSettingsScreen() {
  const { profile, user, refreshProfile } = useSession();
  const [shop, setShop] = useState(profile?.shopDetails ?? "");
  return (
    <Chrome title="Shop settings" screenId="MER-11" back>
      <Field label="Shop">
        <input value={shop} onChange={(e) => setShop(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          if (!user) return;
          await ops.updateUserProfile(user.uid, { shopDetails: shop });
          await refreshProfile();
        }}
      >
        Save
      </Button>
    </Chrome>
  );
}

export function MerchantSubscriptionScreen() {
  return (
    <Chrome title="Subscription" screenId="MER-12" back>
      <p className="muted">Plan changes go through subscribeToPlan / changeSubscriptionPlan.</p>
    </Chrome>
  );
}

export function MerchantSetupScreen() {
  const nav = useNavigate();
  return (
    <Chrome title="Merchant setup" screenId="MER-01" noNav>
      <p>Confirm shop details, then open gigs.</p>
      <Button onClick={() => nav("/m/gigs")}>Continue</Button>
    </Chrome>
  );
}

export function CashCollectScreen() {
  return (
    <Chrome title="Cash to driver" screenId="MER-09.2" back>
      <p>Read the repayment code to the driver. The driver confirms on the Play app.</p>
    </Chrome>
  );
}
