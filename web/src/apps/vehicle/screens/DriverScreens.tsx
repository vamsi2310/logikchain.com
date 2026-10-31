import { useNavigate, useParams } from "react-router-dom";
import { where } from "firebase/firestore";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useI18n } from "@/state/locale";
import { useSession } from "@/state/session";
import { Chrome } from "@/ui/Chrome";
import { Button, EmptyState, Skeletons, StatusChip } from "@/ui/primitives";
import { formatDate, formatMoney } from "@/format";
import type { DriverEarning, Gig } from "@/types/domain";

function PlayHandoff({ action }: { action: string }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: "16px",
        padding: "1.75rem",
        color: "#ffffff",
        boxShadow: "0 10px 20px -5px rgba(15, 23, 42, 0.2)",
        marginTop: "1.25rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>📱</span>
        <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc" }}>
          {t("playHandoff") || "Execute on Android Transporter App"}
        </h4>
      </div>
      <p style={{ margin: "0 0 1rem 0", color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.5 }}>
        {t("playHandoffBody") || "GPS turn-by-turn route guidance, barcode cargo scanning, and offline cash handover require the native Android app."}
      </p>
      <div style={{ display: "inline-block", background: "#334155", padding: "4px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "1.25rem" }}>
        Action: <code>{action}</code>
      </div>
      <div>
        <a
          className="btn btn-primary"
          href="https://play.google.com/store/apps/details?id=com.logikchain.app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#16a34a",
            color: "#ffffff",
            padding: "0.75rem 1.25rem",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: "0.9rem",
            boxShadow: "0 4px 10px rgba(22, 163, 74, 0.3)",
          }}
        >
          <span>⬇️</span> Download Android App (Play Store)
        </a>
      </div>
    </div>
  );
}

export function DriverGigsScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile } = useSession();
  const q = useQuery<Gig>(
    profile ? Col.Gigs : null,
    profile ? [where("vehicleId", "==", profile.id)] : [],
    [profile?.id],
  );

  return (
    <Chrome title={t("gigs")} screenId="DRV-02">
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0.5rem 0" }}>
        {/* Driver Outdoor Topbar Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            borderRadius: "16px",
            padding: "1.5rem",
            color: "#ffffff",
            marginBottom: "1.25rem",
            boxShadow: "0 10px 20px -5px rgba(15, 23, 42, 0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "inline-block", background: "#3b82f6", color: "#ffffff", fontSize: "0.75rem", fontWeight: 800, padding: "3px 10px", borderRadius: "9999px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              🛵 Fleet Logistics Corridor
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0 0 0.25rem 0", color: "#ffffff" }}>
              Assigned Corridor Runs
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
              High-contrast mode for outdoor mobile viewing. Real-time corridor telemetry active.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Vehicle:</span>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#38bdf8" }}>
              {profile?.vehicleNumber || "AP-27-TY-4012"}
            </div>
          </div>
        </div>

        {q.loading ? <Skeletons n={2} /> : null}
        {!q.loading && q.rows.length === 0 ? (
          <EmptyState glyph="🚚" title="No active gigs scheduled" hint="Your depot manager will assign your next corridor run." />
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {q.rows.map((g) => (
            <div
              key={g.id}
              onClick={() => nav(`/d/gigs/${g.id}`)}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                  📍
                </div>
                <div>
                  <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                    {g.title || g.routeName || "Corridor Run"}
                  </h4>
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    📅 {formatDate(g.date)} • 🏘️ {g.villages?.length || 1} Village Deliveries
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <StatusChip status={g.status} />
                <span style={{ color: "#94a3b8" }}>➔</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Chrome>
  );
}

export function DriverGigAckScreen() {
  const { gigId } = useParams();
  const gig = useDoc<Gig>(Col.Gigs, gigId);

  return (
    <Chrome title="Gig" screenId="DRV-02.1" back>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        {gig.data ? (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.75rem", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>{gig.data.title}</h3>
              <StatusChip status={gig.data.status} />
            </div>
            <PlayHandoff action="acknowledgeGig / startGig" />
          </div>
        ) : (
          <Skeletons n={1} />
        )}
      </div>
    </Chrome>
  );
}

export function DriverStopsScreen() {
  const { gigId } = useParams();
  const gig = useDoc<Gig>(Col.Gigs, gigId);

  return (
    <Chrome title="Stops" screenId="DRV-03" back>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>
          Village Delivery Stops
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {gig.data?.villages.map((v, i) => (
            <div
              key={v.villageId}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>
                {i + 1}
              </span>
              <strong style={{ color: "#0f172a" }}>{v.name}</strong>
            </div>
          ))}
        </div>
        <PlayHandoff action="markOrderDelivered / updateMerchantOrderStatus" />
      </div>
    </Chrome>
  );
}

export function DriverTrackingScreen() {
  const { profile } = useSession();
  const q = useQuery<Gig>(
    profile ? Col.Gigs : null,
    profile ? [where("vehicleId", "==", profile.id), where("status", "==", "started")] : [],
    [profile?.id],
  );
  const g = q.rows[0];

  return (
    <Chrome title="Tracking" screenId="DRV-04">
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        {g ? (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.75rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.2rem", fontWeight: 800 }}>{g.title}</h3>
            <div style={{ fontSize: "0.95rem", color: "#0284c7", fontWeight: 700, marginBottom: "1rem" }}>
              Stop {g.currentVillageIndex + 1} · {g.currentVillageStatus}
            </div>
          </div>
        ) : (
          <EmptyState glyph="📍" title="No live gig" hint="Assigned runs appear when the supplier composes one." />
        )}
        <PlayHandoff action="updateGigLocation" />
      </div>
    </Chrome>
  );
}

export function DriverEarningsScreen() {
  const nav = useNavigate();
  const { profile } = useSession();
  const earn = useDoc<DriverEarning>(Col.DriverEarnings, profile?.id);
  const e = earn.data;

  return (
    <Chrome title="Earnings" screenId="DRV-07">
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        {/* Earnings Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
            borderRadius: "20px",
            padding: "2rem",
            color: "#ffffff",
            boxShadow: "0 10px 20px -5px rgba(6, 78, 59, 0.25)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#a7f3d0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            Total Shift Earnings
          </div>
          <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#ffffff", marginBottom: "1.25rem" }}>
            {formatMoney(e?.totalEarnings ?? 0)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid #047857", paddingTop: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#a7f3d0" }}>Pending Dues:</div>
              <strong style={{ fontSize: "1.1rem", color: "#ffffff" }}>{formatMoney(e?.pendingDues ?? 0)}</strong>
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#a7f3d0" }}>Cash in Custody:</div>
              <strong style={{ fontSize: "1.1rem", color: "#fef08a" }}>{formatMoney(e?.cashInCustody ?? 0)}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Button variant="secondary" onClick={() => nav("/d/earnings/payout")}>
            Request Payout
          </Button>
          <Button variant="tertiary" onClick={() => nav("/d/cash")}>
            Cash Handover
          </Button>
        </div>
      </div>
    </Chrome>
  );
}

export function DriverPayoutScreen() {
  const { profile } = useSession();
  const earn = useDoc<DriverEarning>(Col.DriverEarnings, profile?.id);
  const blocked = (earn.data?.cashInCustody ?? 0) > 0;

  return (
    <Chrome title="Payout" screenId="DRV-08" back>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        {blocked ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "1.25rem", color: "#991b1b" }}>
            <strong>⚠ Settlement Required</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
              Cash in custody must be handed over and confirmed before a shift payout can be disbursed.
            </p>
          </div>
        ) : (
          <PlayHandoff action="requestPayout — register beneficiary first" />
        )}
      </div>
    </Chrome>
  );
}

export function DriverPayoutHistoryScreen() {
  const { profile } = useSession();
  const q = useQuery<Record<string, unknown>>(
    profile ? Col.PayoutTransactions : null,
    profile ? [where("beneficiaryUserId", "==", profile.id)] : [],
    [profile?.id],
  );

  return (
    <Chrome title="Payout history" screenId="DRV-08.2" back>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
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
              <StatusChip status={String(r.status ?? "")} />
            </div>
            <div style={{ fontWeight: 800, color: "#16a34a" }}>
              {formatMoney(Number(r.netAmount ?? r.amount ?? 0))}
            </div>
          </div>
        ))}
      </div>
    </Chrome>
  );
}

export function DriverCashScreen() {
  const nav = useNavigate();
  const { profile } = useSession();
  const q = useQuery<CashSettlement>(
    profile ? Col.CashSettlements : null,
    profile ? [where("driverId", "==", profile.id)] : [],
    [profile?.id],
  );

  return (
    <Chrome title="Cash in hand" screenId="DRV-10">
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0.5rem 0" }}>
        {q.rows.map((s) => (
          <div
            key={s.id}
            onClick={() => nav(`/d/cash/settlement/${s.id}`)}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "0.75rem",
              cursor: "pointer",
            }}
          >
            <strong>{s.id}</strong>
          </div>
        ))}
        <PlayHandoff action="declareCashHandover" />
      </div>
    </Chrome>
  );
}

export function DriverVehicleScreen() {
  const { profile } = useSession();
  return (
    <Chrome title="Vehicle" screenId="DRV-09" back>
      <div style={{ maxWidth: "500px", margin: "1rem auto", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem" }}>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Registered Vehicle:</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "4px 0 1rem 0" }}>
          {profile?.vehicleNumber || "AP-27-TY-4012"}
        </div>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Vehicle Type:</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#16a34a" }}>
          {profile?.vehicleType || "3-Wheeler Electric Cargo (1200kg)"}
        </div>
      </div>
    </Chrome>
  );
}

export function DriverSetupScreen() {
  const nav = useNavigate();
  return (
    <Chrome title="Driver setup" screenId="DRV-01" noNav>
      <div style={{ maxWidth: "600px", margin: "1rem auto", textAlign: "center" }}>
        <PlayHandoff action="Continue in the Play app" />
        <div style={{ marginTop: "1rem" }}>
          <Button variant="secondary" onClick={() => nav("/d/gigs")}>
            View assigned gigs
          </Button>
        </div>
      </div>
    </Chrome>
  );
}

export function DriverPlaceholder({ title, id }: { title: string; id: string }) {
  return (
    <Chrome title={title} screenId={id} back>
      <div style={{ maxWidth: "600px", margin: "1rem auto" }}>
        <PlayHandoff action={title} />
      </div>
    </Chrome>
  );
}

export type CashSettlement = {
  id: string;
  driverId?: string;
  supplierId?: string;
  status?: string;
};
