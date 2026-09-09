import { useNavigate, useParams } from "react-router-dom";
import { where } from "firebase/firestore";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useI18n } from "@/state/locale";
import { useSession } from "@/state/session";
import { Chrome } from "@/ui/Chrome";
import { Banner, Button, Card, EmptyState, Skeletons, StatusChip } from "@/ui/primitives";
import { formatDate, formatMoney } from "@/format";
import type { DriverEarning, Gig } from "@/types/domain";

function PlayHandoff({ action }: { action: string }) {
  const { t } = useI18n();
  return (
    <Card>
      <p className="card-title">{t("playHandoff")}</p>
      <p>{t("playHandoffBody")}</p>
      <p className="muted">{action}</p>
      <a className="btn btn-primary" href="https://play.google.com/store/apps/details?id=com.logikchain.app">
        {t("playHandoff")}
      </a>
    </Card>
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
      <Banner kind="info">Vehicle work is official on Android. This PWA is read-only for gigs.</Banner>
      {q.loading ? <Skeletons /> : null}
      {q.rows.map((g) => (
        <Card key={g.id} onClick={() => nav(`/d/gigs/${g.id}`)}>
          <p className="card-title">{g.title || g.routeName}</p>
          <StatusChip status={g.status} />
          <p>{formatDate(g.date)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function DriverGigAckScreen() {
  const { gigId } = useParams();
  const gig = useDoc<Gig>(Col.Gigs, gigId);
  return (
    <Chrome title="Gig" screenId="DRV-02.1" back>
      {gig.data ? (
        <>
          <p className="card-title">{gig.data.title}</p>
          <StatusChip status={gig.data.status} />
          <PlayHandoff action="acknowledgeGig / startGig" />
        </>
      ) : (
        <Skeletons n={1} />
      )}
    </Chrome>
  );
}

export function DriverStopsScreen() {
  const { gigId } = useParams();
  const gig = useDoc<Gig>(Col.Gigs, gigId);
  return (
    <Chrome title="Stops" screenId="DRV-03" back>
      {gig.data?.villages.map((v, i) => (
        <Card key={v.villageId}>
          <p>
            {i + 1}. {v.name}
          </p>
        </Card>
      ))}
      <PlayHandoff action="markOrderDelivered / updateMerchantOrderStatus" />
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
      {g ? (
        <>
          <p>{g.title}</p>
          <p>
            Stop {g.currentVillageIndex + 1} · {g.currentVillageStatus}
          </p>
        </>
      ) : (
        <EmptyState glyph="📍" title="No live gig" hint="Assigned runs appear when the supplier composes one." />
      )}
      <PlayHandoff action="updateGigLocation" />
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
      {e ? (
        <Card>
          <p>Total {formatMoney(e.totalEarnings ?? 0)}</p>
          <p>Pending {formatMoney(e.pendingDues ?? 0)}</p>
          <p>Cash in hand {formatMoney(e.cashInCustody ?? 0)}</p>
        </Card>
      ) : (
        <Skeletons n={1} />
      )}
      <Button variant="secondary" onClick={() => nav("/d/earnings/payout")}>
        Payout
      </Button>
      <Button variant="tertiary" onClick={() => nav("/d/cash")}>
        Cash
      </Button>
    </Chrome>
  );
}

export function DriverPayoutScreen() {
  const { profile } = useSession();
  const earn = useDoc<DriverEarning>(Col.DriverEarnings, profile?.id);
  const blocked = (earn.data?.cashInCustody ?? 0) > 0;
  return (
    <Chrome title="Payout" screenId="DRV-08" back>
      {blocked ? (
        <Banner>Cash in custody must be settled before a payout.</Banner>
      ) : (
        <PlayHandoff action="requestPayout — register beneficiary first" />
      )}
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
      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <StatusChip status={String(r.status ?? "")} />
          <p>{formatMoney(Number(r.netAmount ?? r.amount ?? 0))}</p>
        </Card>
      ))}
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
      {q.rows.map((s) => (
        <Card key={s.id} onClick={() => nav(`/d/cash/settlement/${s.id}`)}>
          <p>{s.id}</p>
        </Card>
      ))}
      <PlayHandoff action="declareCashHandover" />
    </Chrome>
  );
}

export function DriverVehicleScreen() {
  const { profile } = useSession();
  return (
    <Chrome title="Vehicle" screenId="DRV-09" back>
      <p>{profile?.vehicleNumber}</p>
      <p>{profile?.vehicleType}</p>
    </Chrome>
  );
}

export function DriverSetupScreen() {
  const nav = useNavigate();
  return (
    <Chrome title="Driver setup" screenId="DRV-01" noNav>
      <PlayHandoff action="Continue in the Play app" />
      <Button variant="secondary" onClick={() => nav("/d/gigs")}>
        View assigned gigs
      </Button>
    </Chrome>
  );
}

export function DriverPlaceholder({ title, id }: { title: string; id: string }) {
  return (
    <Chrome title={title} screenId={id} back>
      <PlayHandoff action={title} />
    </Chrome>
  );
}

export type CashSettlement = {
  id: string;
  driverId?: string;
  supplierId?: string;
  status?: string;
};
