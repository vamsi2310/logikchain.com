import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { where, orderBy } from "firebase/firestore";
import { env } from "@/config/env";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useI18n } from "@/state/locale";
import { useSession } from "@/state/session";
import { useCart } from "@/state/cart";
import { useOnline } from "@/state/offline";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Banner, Button, Card, EmptyState, Skeletons, StatusChip, Segmented } from "@/ui/primitives";
import { Sheet } from "@/ui/overlays";
import { formatDate, formatMoney, formatPickupCode, newIdempotencyKey } from "@/format";
import type { HandoverCodeRecord, Order } from "@/types/domain";

export function CartScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { cart, setQty, count } = useCart();
  if (!cart || count === 0) {
    return (
      <Chrome title={t("cart")} screenId="BUY-07">
        <EmptyState glyph="🛒" title={t("emptyCart")} hint={t("emptyCartHint")} action={<Button onClick={() => nav("/home")}>{t("home")}</Button>} />
      </Chrome>
    );
  }
  const total = cart.lines.reduce((n, l) => n + l.price * l.quantity, 0);
  return (
    <Chrome title={t("cart")} screenId="BUY-07">
      {cart.lines.map((l) => (
        <Card key={l.productId}>
          <p className="card-title">{l.name}</p>
          <p>{formatMoney(l.price)} · {l.quantity} {l.unit}</p>
          <div className="row-btns">
            <Button variant="secondary" onClick={() => setQty(l.productId, l, l.quantity - 1)}>−</Button>
            <Button variant="secondary" onClick={() => setQty(l.productId, l, l.quantity + 1)}>+</Button>
          </div>
        </Card>
      ))}
      <p className="card-title tabular">{formatMoney(total)}</p>
      <Button onClick={() => nav("/checkout")}>{t("reviewPay")}</Button>
    </Chrome>
  );
}

export function CheckoutScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { cart, clear } = useCart();
  const { online } = useOnline();
  const { push } = useToast();
  const [mode, setMode] = useState<"online" | "cash_on_pickup">("cash_on_pickup");
  const [busy, setBusy] = useState(false);
  if (!cart) {
    nav("/cart", { replace: true });
    return null;
  }
  const total = cart.lines.reduce((n, l) => n + l.price * l.quantity, 0);

  async function place() {
    if (!cart) return;
    if (!online) {
      push(t("needsInternet"));
      return;
    }
    setBusy(true);
    try {
      const res = await ops.placeOrder({
        gigId: cart.gigId,
        village: cart.villageId,
        merchantId: cart.merchantId,
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        paymentMode: mode,
      });
      const placed = res as { orderId: string; pickupCode?: string; paymentIntentId?: string; totalPrice?: number };
      if (mode === "online" && placed.paymentIntentId) {
        sessionStorage.setItem("lc.pendingIntent", placed.paymentIntentId);
        sessionStorage.setItem("lc.pendingOrder", placed.orderId);
        nav("/checkout/processing");
        return;
      }
      sessionStorage.setItem(`lc.pickup.${placed.orderId}`, placed.pickupCode ?? "");
      clear();
      nav(`/orders/${placed.orderId}/pickup-code`, { replace: true });
    } catch (e) {
      push((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Chrome title={t("reviewPay")} screenId="BUY-08" back>
      {cart.lines.map((l) => (
        <p key={l.productId}>
          {l.name} × {l.quantity} · {formatMoney(l.price * l.quantity)}
        </p>
      ))}
      <p className="card-title">{formatMoney(total)}</p>
      <label className="checkbox">
        <input type="radio" checked={mode === "cash_on_pickup"} onChange={() => setMode("cash_on_pickup")} />
        {t("cashOnPickup")}
      </label>
      <label className="checkbox">
        <input type="radio" checked={mode === "online"} onChange={() => setMode("online")} />
        {t("payOnline")}
      </label>
      <Button loading={busy} disabled={!online} onClick={() => void place()}>
        {t("placeOrder")}
      </Button>
    </Chrome>
  );
}

export function PaymentProcessingScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const intentId = sessionStorage.getItem("lc.pendingIntent");
  const orderId = sessionStorage.getItem("lc.pendingOrder");

  async function capture() {
    if (!intentId) return;
    setBusy(true);
    try {
      const Razorpay = (window as unknown as { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } }).Razorpay;
      if (env.razorpayKeyId && Razorpay) {
        const rzp = new Razorpay({
          key: env.razorpayKeyId,
          order_id: intentId,
          handler: async (resp: Record<string, string>) => {
            await ops.processPayment(intentId, {
              gatewayPaymentId: resp.razorpay_payment_id,
              gatewayOrderId: resp.razorpay_order_id,
              gatewaySignature: resp.razorpay_signature,
            });
            if (orderId) nav(`/orders/${orderId}/pickup-code`, { replace: true });
          },
        });
        rzp.open();
      } else {
        push("Razorpay Checkout is not configured for this alias.");
      }
    } catch (e) {
      push((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Chrome title={t("processing")} screenId="BUY-09" noNav>
      <p>{t("processing")}</p>
      <Button loading={busy} onClick={() => void capture()}>
        {t("payOnline")}
      </Button>
    </Chrome>
  );
}

export function PickupCodeScreen() {
  const { t } = useI18n();
  const { orderId } = useParams();
  const order = useDoc<Order>(Col.Orders, orderId);
  const codeDoc = useDoc<HandoverCodeRecord>(orderId ? `${Col.Orders}/${orderId}/private` : null, "pickup");
  const code = sessionStorage.getItem(`lc.pickup.${orderId}`) ?? codeDoc.data?.code ?? "";
  return (
    <Chrome title={t("pickupCode")} screenId="BUY-10.1" back>
      {order.data?.deliveryStatus === "suspended" ? <Banner>⚠ {order.data.suspensionReason}</Banner> : null}
      <p className="display-code">{code ? formatPickupCode(code) : "••••••"}</p>
      <p className="muted">{t("showCode")}</p>
      <Button
        variant="secondary"
        onClick={() => void ops.resendHandoverCode({ orderId, channel: "sms" })}
      >
        Resend code
      </Button>
    </Chrome>
  );
}

export function OrdersScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const [tab, setTab] = useState("active");
  const q = useQuery<Order>(
    user ? Col.Orders : null,
    user ? [where("buyer", "==", user.uid), orderBy("createdAt", "desc")] : [],
    [user?.uid],
  );
  const rows = q.rows.filter((o) =>
    tab === "active" ? !["delivered", "cancelled"].includes(o.deliveryStatus) : ["delivered", "cancelled"].includes(o.deliveryStatus),
  );
  return (
    <Chrome title={t("orders")} screenId="BUY-11">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: "active", label: "Active" },
          { id: "past", label: "Past" },
        ]}
      />
      {q.loading ? <Skeletons /> : null}
      {!q.loading && rows.length === 0 ? (
        <EmptyState glyph="📦" title="No orders" hint="Place an order from a gig pamphlet." />
      ) : null}
      {rows.map((o) => (
        <Card key={o.id} stale={q.meta?.stale} onClick={() => nav(`/orders/${o.id}`)}>
          <p className="card-title">{o.invoiceNumber}</p>
          <StatusChip status={o.deliveryStatus} />
          <p className="tabular">{formatMoney(o.totalPrice)}</p>
          <p className="muted">{formatDate(o.createdAt)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function OrderDetailScreen() {
  const { t } = useI18n();
  const { orderId } = useParams();
  const nav = useNavigate();
  const { push } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const order = useDoc<Order>(Col.Orders, orderId);
  const o = order.data;
  return (
    <Chrome title={t("orderDetail")} screenId="BUY-12" back>
      {order.loading ? <Skeletons /> : null}
      {o ? (
        <>
          <StatusChip status={o.deliveryStatus} />
          <p className="card-title">{o.invoiceNumber}</p>
          <p className="tabular">{formatMoney(o.totalPrice, "₹", { invoice: true })}</p>
          {o.items.map((i) => (
            <p key={i.productId}>
              {i.name} × {i.quantity}
            </p>
          ))}
          <Button variant="secondary" onClick={() => nav(`/orders/${o.id}/pickup-code`)}>
            {t("pickupCode")}
          </Button>
          <Button variant="tertiary" onClick={() => nav(`/orders/${o.id}/invoice`)}>
            {t("invoice")}
          </Button>
          {o.deliveryStatus === "placed" ? (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              {t("cancelOrder")}
            </Button>
          ) : null}
        </>
      ) : null}
      {cancelOpen && o ? (
        <Sheet
          title={t("cancelOrder")}
          onClose={() => setCancelOpen(false)}
          footer={
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await ops.cancelOrder(o.id, { idempotencyKey: newIdempotencyKey() });
                  nav("/orders");
                } catch (e) {
                  push((e as Error).message);
                }
              }}
            >
              {t("confirm")}
            </Button>
          }
        >
          <p>Cancel {o.invoiceNumber} for {formatMoney(o.totalPrice)}?</p>
        </Sheet>
      ) : null}
    </Chrome>
  );
}

export function InvoiceScreen() {
  const { t } = useI18n();
  const { orderId } = useParams();
  const order = useDoc<Order>(Col.Orders, orderId);
  const o = order.data;
  return (
    <Chrome title={t("invoice")} screenId="BUY-12.1" back>
      {o ? (
        <Card>
          <p className="card-title">{o.invoiceNumber}</p>
          <p>{formatDate(o.invoiceDate)}</p>
          <p>{o.supplierName}</p>
          <p className="muted">{o.supplierGstNumber}</p>
          {o.items.map((i) => (
            <p key={i.productId}>
              {i.name} {i.hsnCode} × {i.quantity} {formatMoney(i.price * i.quantity, "₹", { invoice: true })}
            </p>
          ))}
          <p>CGST {formatMoney(o.cgstAmount, "₹", { invoice: true })}</p>
          <p>SGST {formatMoney(o.sgstAmount, "₹", { invoice: true })}</p>
          {o.igstAmount ? <p>IGST {formatMoney(o.igstAmount, "₹", { invoice: true })}</p> : null}
          <p className="card-title">{formatMoney(o.totalPrice, "₹", { invoice: true })}</p>
        </Card>
      ) : (
        <Skeletons n={1} />
      )}
    </Chrome>
  );
}

export function RefundScreen() {
  const { t } = useI18n();
  const { orderId } = useParams();
  const order = useDoc<Order>(Col.Orders, orderId);
  return (
    <Chrome title={t("refundStatus")} screenId="BUY-12.3" back>
      <p>Payment {order.data?.paymentStatus}</p>
      <p>Refunded {formatMoney(order.data?.refundedAmount ?? 0)}</p>
    </Chrome>
  );
}

export function ReceiptScreen() {
  const { t } = useI18n();
  const { orderId } = useParams();
  const order = useDoc<Order>(Col.Orders, orderId);
  return (
    <Chrome title={t("receipt")} screenId="BUY-12.5" back>
      <p>Custody {order.data?.custodyTransferId ?? "—"}</p>
      <p>Collected {formatMoney(order.data?.cashCollectedAmount ?? 0)}</p>
    </Chrome>
  );
}
