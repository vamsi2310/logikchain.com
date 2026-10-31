import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { where, orderBy } from "firebase/firestore";
import { ops } from "@/api/ops";
import { api } from "@/api/client";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useI18n } from "@/state/locale";
import { useSession } from "@/state/session";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Button, EmptyState, Field, Skeletons, StatusChip } from "@/ui/primitives";
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
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0.5rem 0" }}>
        {/* Merchant Corridor Hero Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
            borderRadius: "16px",
            padding: "1.5rem 1.75rem",
            color: "#ffffff",
            marginBottom: "1.5rem",
            boxShadow: "0 10px 20px -5px rgba(6, 78, 59, 0.25)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "inline-block", background: "#10b981", color: "#022c22", fontSize: "0.75rem", fontWeight: 800, padding: "3px 10px", borderRadius: "9999px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
              🏪 Kirana Hub Corridor
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "0 0 0.25rem 0", color: "#ffffff" }}>
              Scheduled Depot Deliveries
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#a7f3d0", maxWidth: "480px" }}>
              Active supply runs routed to your shop. Verify driver arrival and stage buyer pick-up parcels.
            </p>
          </div>
          <button
            type="button"
            onClick={() => nav("/m/bulk/new")}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "10px",
              border: "none",
              background: "#ffffff",
              color: "#065f46",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>+</span> Order Wholesale Stock
          </button>
        </div>

        {q.loading ? <Skeletons n={3} /> : null}
        {!q.loading && q.rows.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              borderRadius: "16px",
              padding: "3rem 1.5rem",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚚</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem 0" }}>
              No Active Gigs Assigned
            </h3>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.9rem" }}>
              Your regional mill supplier will assign your shop to the next corridor run.
            </p>
            <Button variant="secondary" onClick={() => nav("/m/bulk/new")}>
              Create Bulk Stock Order
            </Button>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {q.rows.map((g) => (
            <div
              key={g.id}
              onClick={() => nav(`/m/gigs/${g.id}`)}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}
                >
                  🚚
                </div>
                <div>
                  <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                    {g.title || g.routeName || "Scheduled Corridor Run"}
                  </h4>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>📅 {formatDate(g.date)}</span>
                    <span>•</span>
                    <span>📍 {g.villages?.length || 1} Village Stops</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <StatusChip status={g.status} />
                <span style={{ fontSize: "1.1rem", color: "#94a3b8" }}>➔</span>
              </div>
            </div>
          ))}
        </div>
      </div>
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
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0.5rem 0" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
            Staged Parcels for Delivery
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
            Verify 6-digit confirmation codes when buyers arrive at your kirana shop.
          </p>
        </div>

        {q.loading ? <Skeletons n={2} /> : null}
        {!q.loading && q.rows.length === 0 ? (
          <EmptyState glyph="📦" title="No buyer parcels pending" hint="Orders for this gig run will appear here." />
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {q.rows.map((o) => (
            <div
              key={o.id}
              onClick={() => nav(`/m/pickups/${o.id}`)}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ color: "#0f172a", fontSize: "0.95rem" }}>{o.invoiceNumber}</strong>
                <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "2px" }}>
                  {formatMoney(o.totalPrice)} • {o.paymentMode === "cash_on_pickup" ? "💵 Cash on Pickup" : "💳 Prepaid"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <StatusChip status={o.deliveryStatus} />
                <span style={{ color: "#94a3b8" }}>➔</span>
              </div>
            </div>
          ))}
        </div>
      </div>
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
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        {o ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Invoice #{o.invoiceNumber}</span>
              <StatusChip status={o.deliveryStatus} />
            </div>

            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#16a34a", marginBottom: "1.25rem" }}>
              {formatMoney(o.totalPrice)}
            </div>

            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>Payment Mode:</div>
              <strong style={{ color: "#0f172a" }}>
                {o.paymentMode === "cash_on_pickup" ? "💵 Cash on Pickup (Collect at shop)" : "💳 Prepaid via Escrow"}
              </strong>
            </div>

            <Field label="Enter 6-Digit Buyer Verification Code">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="e.g. 123456"
                style={{
                  fontSize: "1.25rem",
                  letterSpacing: "0.25em",
                  textAlign: "center",
                  fontWeight: 700,
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </Field>

            <div style={{ marginTop: "1.5rem" }}>
              <Button
                onClick={async () => {
                  try {
                    await ops.markOrderDelivered(o.id, {
                      proof: { method: "otp", confirmationCode: code, capturedAt: new Date().toISOString() },
                      cashCollected: o.paymentMode === "cash_on_pickup" ? o.totalPrice : undefined,
                      idempotencyKey: newIdempotencyKey(),
                    });
                    push("Order marked delivered successfully!");
                  } catch (e) {
                    push((e as Error).message);
                  }
                }}
              >
                Confirm Buyer Handover ➔
              </Button>
            </div>
          </div>
        ) : (
          <Skeletons n={1} />
        )}
      </div>
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
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0.5rem 0" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
            Direct Wholesale Mill Sourcing
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
            Select inventory commodities for next corridor run with 2-Phase Credit Hold.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {products.rows.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.25rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              <h4 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>{p.name}</h4>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#16a34a", marginBottom: "0.5rem" }}>
                {formatMoney(p.price)}
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}> / {p.unit}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.75rem" }}>
                Depot Stock: <strong>{p.stock} {p.unit}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 600 }}>Qty:</span>
                <input
                  inputMode="numeric"
                  value={qty[p.id] ?? 0}
                  onChange={(e) => setQty({ ...qty, [p.id]: Number(e.target.value) })}
                  style={{
                    width: "80px",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={() => {
            sessionStorage.setItem("lc.bulk", JSON.stringify(qty));
            nav("/m/bulk/review");
          }}
        >
          Review Wholesale Order ➔
        </Button>
      </div>
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
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "0 0 1rem 0" }}>
            Select Settlement Method
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "1rem",
                borderRadius: "12px",
                border: mode === "credit" ? "2px solid #16a34a" : "1px solid #e2e8f0",
                background: mode === "credit" ? "#f0fdf4" : "#ffffff",
                cursor: "pointer",
              }}
            >
              <input type="radio" checked={mode === "credit"} onChange={() => setMode("credit")} />
              <div>
                <strong style={{ color: "#0f172a" }}>💳 2-Phase Micro-Credit Hold</strong>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Instant reservation with zero upfront debit until truck arrives.</div>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "1rem",
                borderRadius: "12px",
                border: mode === "cash_on_delivery" ? "2px solid #16a34a" : "1px solid #e2e8f0",
                background: mode === "cash_on_delivery" ? "#f0fdf4" : "#ffffff",
                cursor: "pointer",
              }}
            >
              <input type="radio" checked={mode === "cash_on_delivery"} onChange={() => setMode("cash_on_delivery")} />
              <div>
                <strong style={{ color: "#0f172a" }}>💵 Cash on Driver Delivery (CoD)</strong>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Settle with transporter upon unloading at your kirana shop.</div>
              </div>
            </label>
          </div>

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
            Confirm Wholesale Order ➔
          </Button>
        </div>
      </div>
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
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0.5rem 0" }}>
        <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
              Wholesale Stock Invoices
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Track shipments and provide driver handover verification codes.
            </p>
          </div>
        </div>

        {q.loading ? <Skeletons n={2} /> : null}
        {!q.loading && q.rows.length === 0 ? (
          <EmptyState glyph="📦" title="No wholesale orders found" hint="Order bulk inventory directly from regional depots." />
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {q.rows.map((o) => (
            <div
              key={o.id}
              onClick={() => nav(`/m/orders/${o.id}`)}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ color: "#0f172a", fontSize: "1rem" }}>{o.invoiceNumber}</strong>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
                  Status: <StatusChip status={o.status} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#16a34a" }}>
                  {formatMoney(o.totalPrice)}
                </div>
                <span style={{ fontSize: "0.8rem", color: "#0284c7", fontWeight: 600 }}>View Details ➔</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Chrome>
  );
}

export function MerchantOrderDetailScreen() {
  const { merchantOrderId } = useParams();
  const nav = useNavigate();
  const o = useDoc<MerchantOrder>(Col.MerchantOrders, merchantOrderId);

  return (
    <Chrome title="Bulk order" screenId="MER-08" back>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        {o.data ? (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Order #{o.data.invoiceNumber}</span>
              <StatusChip status={o.data.status} />
            </div>

            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#16a34a", marginBottom: "1.5rem" }}>
              {formatMoney(o.data.totalPrice)}
            </div>

            <Button variant="secondary" onClick={() => nav(`/m/orders/${o.data!.id}/handover-code`)}>
              🔑 Display Transporter Handover PIN
            </Button>
          </div>
        ) : (
          <Skeletons n={1} />
        )}
      </div>
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
      <div style={{ maxWidth: "500px", margin: "2rem auto", textAlign: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "2.5rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔐</div>
        <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
          Transporter Handover Code
        </h3>
        <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
          Share this one-time code with the fleet driver to unlock the truck consignment.
        </p>
        <p className="display-code" style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "0.2em", color: "#065f46", margin: "1rem 0" }}>
          {code.data?.code ? formatPickupCode(code.data.code) : "••••••"}
        </p>
        <Button variant="secondary" onClick={() => void ops.resendHandoverCode({ merchantOrderId, channel: "sms" })}>
          Resend via SMS 📱
        </Button>
      </div>
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
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0.5rem 0" }}>
        {/* Holographic Credit Line Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            borderRadius: "20px",
            padding: "2rem",
            color: "#ffffff",
            boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.2)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>
              Kirana Working Capital Line
            </span>
            <span style={{ background: "#22c55e", color: "#052e16", fontSize: "0.75rem", fontWeight: 800, padding: "3px 8px", borderRadius: "9999px" }}>
              ACTIVE
            </span>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Available Sourcing Credit:</div>
            <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>
              {c ? formatMoney(c.creditAvailable) : "₹---"}
            </div>
          </div>

          {c && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                <span>Used: <strong>{formatMoney(c.creditUsed)}</strong></span>
                <span>Total Limit: <strong>{formatMoney(c.creditLimit)}</strong></span>
              </div>
              <div style={{ background: "#334155", height: "8px", borderRadius: "9999px", overflow: "hidden" }}>
                <div
                  style={{
                    background: "#22c55e",
                    height: "100%",
                    width: `${Math.min(100, Math.round((c.creditUsed / (c.creditLimit || 1)) * 100))}%`,
                    borderRadius: "9999px",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Matrix */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => nav("/m/credit/repay")}
            style={{
              padding: "1rem",
              borderRadius: "12px",
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div>💵 Repay Credit</div>
            <div style={{ fontSize: "0.8rem", color: "#15803d", fontWeight: 500, marginTop: "4px" }}>Settle outstanding via UPI / Netbanking</div>
          </button>

          <button
            type="button"
            onClick={() => nav("/m/credit/ledger")}
            style={{
              padding: "1rem",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div>📜 Audit Ledger</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>Immutable double-entry log</div>
          </button>

          <button
            type="button"
            onClick={() => nav("/m/credit/requests")}
            style={{
              padding: "1rem",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div>📈 Increase Limit</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>Request additional capital</div>
          </button>
        </div>
      </div>
    </Chrome>
  );
}

export function CreditRepayScreen() {
  const { profile } = useSession();
  const { push } = useToast();
  const [amount, setAmount] = useState("");

  return (
    <Chrome title="Repay credit" screenId="MER-09.1" back>
      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "1rem 0" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
          <Field label="Repayment Amount (₹)">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" />
          </Field>
          <Button
            onClick={async () => {
              try {
                await ops.initiateCreditRepayment({
                  merchantId: profile?.id,
                  amount: Number(amount),
                  method: "online",
                });
                push("Repayment initiated successfully!");
              } catch (e) {
                push((e as Error).message);
              }
            }}
          >
            Settle Repayment via UPI ➔
          </Button>
        </div>
      </div>
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
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0.5rem 0" }}>
        {q.rows.map((r) => (
          <div
            key={String(r.id)}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              marginBottom: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong style={{ color: "#0f172a" }}>{String(r.type ?? r.id)}</strong>
            </div>
            <div style={{ fontWeight: 800, color: "#16a34a" }}>
              {formatMoney(Number(r.amount ?? 0))}
            </div>
          </div>
        ))}
      </div>
    </Chrome>
  );
}

export function CreditCodesScreen() {
  const { push } = useToast();
  return (
    <Chrome title="Offline codes" screenId="MER-09.4" back>
      <div style={{ maxWidth: "500px", margin: "2rem auto", textAlign: "center" }}>
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
          Issue Batch of Offline OTPs
        </Button>
      </div>
    </Chrome>
  );
}

export function CreditRequestsScreen() {
  const { profile } = useSession();
  const { push } = useToast();
  const [amount, setAmount] = useState("");

  return (
    <Chrome title="Credit increase" screenId="MER-10" back>
      <div style={{ maxWidth: "500px", margin: "1rem auto" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem" }}>
          <Field label="Requested Working Capital Limit (₹)">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" />
          </Field>
          <Button
            onClick={async () => {
              if (!profile) return;
              try {
                await ops.requestCreditIncrease(profile.id, { requestedAmount: Number(amount), reason: "Working capital" });
                push("Credit limit increase request submitted to operations!");
              } catch (e) {
                push((e as Error).message);
              }
            }}
          >
            Submit Request ➔
          </Button>
        </div>
      </div>
    </Chrome>
  );
}

export function ShopSettingsScreen() {
  const { profile, user, refreshProfile } = useSession();
  const [shop, setShop] = useState(profile?.shopDetails ?? "");

  return (
    <Chrome title="Shop settings" screenId="MER-11" back>
      <div style={{ maxWidth: "500px", margin: "1rem auto" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem" }}>
          <Field label="Kirana Shop Name & Registration">
            <input value={shop} onChange={(e) => setShop(e.target.value)} />
          </Field>
          <Button
            onClick={async () => {
              if (!user) return;
              await ops.updateUserProfile(user.uid, { shopDetails: shop });
              await refreshProfile();
            }}
          >
            Save Shop Profile
          </Button>
        </div>
      </div>
    </Chrome>
  );
}

export function MerchantSubscriptionScreen() {
  return (
    <Chrome title="Subscription" screenId="MER-12" back>
      <div style={{ maxWidth: "600px", margin: "2rem auto", textAlign: "center" }}>
        <p className="muted">Plan changes go through operations governance.</p>
      </div>
    </Chrome>
  );
}

export function MerchantSetupScreen() {
  const nav = useNavigate();
  return (
    <Chrome title="Merchant setup" screenId="MER-01" noNav>
      <div style={{ maxWidth: "500px", margin: "2rem auto", textAlign: "center" }}>
        <h3>Welcome to Kirana Merchant Hub</h3>
        <p style={{ color: "#64748b" }}>Confirm shop details, then open corridor gigs.</p>
        <Button onClick={() => nav("/m/gigs")}>Open Corridor Gigs ➔</Button>
      </div>
    </Chrome>
  );
}

export function CashCollectScreen() {
  return (
    <Chrome title="Cash to driver" screenId="MER-09.2" back>
      <div style={{ maxWidth: "500px", margin: "2rem auto", textAlign: "center" }}>
        <p>Read the repayment code to the driver. The driver confirms on the Play app.</p>
      </div>
    </Chrome>
  );
}

export function MerchantVillageDeliverySettingsScreen() {
  const { push } = useToast();
  const { profile } = useSession();
  const [enabled, setEnabled] = useState(true);
  const [charge, setCharge] = useState("20");
  const [deliveryDays, setDeliveryDays] = useState(["Monday", "Thursday"]);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setDeliveryDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <Chrome title="Village Home Delivery" screenId="MER-08.3" back>
      <div style={{ maxWidth: "600px", margin: "1rem auto" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem 0" }}>
            Village Last-Mile Delivery
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
            Deliver orders directly to buyers in your village from your kirana hub to earn delivery fees.
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", cursor: "pointer", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enable Village Home Delivery
          </label>

          {enabled && (
            <>
              <Field label="Flat Delivery Fee (₹)">
                <input
                  type="number"
                  value={charge}
                  onChange={(e) => setCharge(e.target.value)}
                  placeholder="20"
                />
              </Field>

              <Field label="Dedicated Delivery Days">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {daysList.map((day) => {
                    const active = deliveryDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          border: active ? "1px solid #16a34a" : "1px solid #d1d5db",
                          background: active ? "#f0fdf4" : "#fff",
                          color: active ? "#166534" : "#374151",
                          fontSize: 12,
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <Button
              loading={saving}
              onClick={async () => {
                const mId = profile?.id || "mer_kirana_01";
                setSaving(true);
                try {
                  await api.post(`/v1/config/merchants/${mId}/village-delivery`, {
                    enableHomeDelivery: enabled,
                    deliveryCharge: Number(charge),
                    deliveryDays,
                  });
                  push("Village home delivery settings saved!");
                } catch (err: any) {
                  push(err.message || "Failed to save settings");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Chrome>
  );
}
