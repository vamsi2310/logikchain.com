import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { where } from "firebase/firestore";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { useI18n } from "@/state/locale";
import { useSession, setupIncomplete } from "@/state/session";
import { useCart } from "@/state/cart";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Banner, Button, Card, EmptyState, Skeletons, StatusChip } from "@/ui/primitives";
import { Sheet } from "@/ui/overlays";
import { formatDate, formatTime, greeting } from "@/format";
import type { Gig, Pamphlet, UserProfile, Village } from "@/types/domain";

export function BuyerHomeScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile, user, refreshProfile } = useSession();
  const { clear } = useCart();
  const { push } = useToast();
  const [locOpen, setLocOpen] = useState(false);
  const [hideSetup, setHideSetup] = useState(false);
  const village = useDoc<Village>(Col.Villages, profile?.villageId);
  const merchant = useDoc<UserProfile>(Col.UserProfiles, profile?.selectedMerchantId);
  const gigs = useQuery<Gig>(
    profile?.villageId ? Col.Gigs : null,
    profile?.villageId ? [where("villageIds", "array-contains", profile.villageId)] : [],
    [profile?.villageId],
  );
  const openGigs = gigs.rows.filter((g) => g.status === "created" || g.status === "started");
  const pamphlets = useQuery<Pamphlet>(Col.Pamphlets, [], []);
  const pamphletById = useMemo(() => Object.fromEntries(pamphlets.rows.map((p) => [p.id, p])), [pamphlets.rows]);
  const villages = useQuery<Village>(Col.Villages, [], []);
  const [nextVillage, setNextVillage] = useState(profile?.villageId ?? "");

  const incomplete = setupIncomplete(profile) && !hideSetup;

  return (
    <Chrome
      title={t("home")}
      screenId="BUY-04"
      speakText={`${greeting()}, ${profile?.name ?? ""}. ${openGigs.length} gigs.`}
    >
      {incomplete ? (
        <Card>
          <p className="card-title">⚠ {t("finishSetup")}</p>
          <p>{t("finishSetupBody")}</p>
          <div className="row-btns">
            <Button onClick={() => nav("/setup")}>{t("finish")}</Button>
            <Button variant="secondary" onClick={() => setHideSetup(true)}>
              {t("hide")}
            </Button>
          </div>
        </Card>
      ) : null}
      <p>
        {greeting()}, {profile?.name ?? ""}
      </p>
      <button type="button" className="list-row" onClick={() => setLocOpen(true)}>
        📍 {village.data?.name ?? t("village")} ▾
      </button>
      <button type="button" className="list-row" style={{ marginTop: 12 }} onClick={() => nav("/setup")}>
        {t("pickup")}: {merchant.data?.name ?? merchant.data?.shopDetails ?? "—"} ›
      </button>
      <h3>{t("upcomingGigs", { village: village.data?.name ?? "…" })}</h3>
      {gigs.loading ? <Skeletons /> : null}
      {!gigs.loading && openGigs.length === 0 ? (
        <EmptyState
          glyph="🚚"
          title={t("noGigs", { village: village.data?.name ?? "your village" })}
          hint={t("noGigsHint")}
          action={<Button variant="secondary" onClick={() => void gigs.reload()}>{t("refresh")}</Button>}
        />
      ) : null}
      {openGigs.map((g) => {
        const pam = pamphletById[g.pamphletId];
        const eta = profile?.villageId ? g.arrivingTimes?.[profile.villageId] : undefined;
        return (
          <Card key={g.id} stale={gigs.meta?.stale} onClick={() => nav(`/gigs/${g.id}`)}>
            <p className="card-title">{g.title || g.routeName}</p>
            <p className="muted">
              {formatDate(g.date)} · ETA {eta ? formatTime(eta) : "—"}
            </p>
            <p>{t("pickup")}: {merchant.data?.name ?? "—"}</p>
            <p className="muted">
              {pam?.promotedProducts.length ?? 0} items · {pam?.title ?? ""}
            </p>
          </Card>
        );
      })}
      {locOpen ? (
        <Sheet
          title={t("changeLocation")}
          onClose={() => setLocOpen(false)}
          footer={
            <Button
              onClick={async () => {
                if (!user || !nextVillage) return;
                if (profile?.villageId && nextVillage !== profile.villageId) clear();
                await ops.updateUserProfile(user.uid, { villageId: nextVillage });
                await refreshProfile();
                setLocOpen(false);
                push("Location updated");
              }}
            >
              {t("apply")}
            </Button>
          }
        >
          <p className="muted">{t("villageChangeClearsCart")}</p>
          <select value={nextVillage} onChange={(e) => setNextVillage(e.target.value)} style={{ minHeight: 48, width: "100%" }}>
            {villages.rows.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Sheet>
      ) : null}
    </Chrome>
  );
}

export function GigDetailScreen() {
  const { t } = useI18n();
  const { gigId } = useParams();
  const nav = useNavigate();
  const { profile } = useSession();
  const gig = useDoc<Gig>(Col.Gigs, gigId);
  const shop = useDoc<UserProfile>(Col.UserProfiles, profile?.selectedMerchantId);
  const driver = useDoc<UserProfile>(Col.UserProfiles, gig.data?.vehicleId);
  const g = gig.data;
  return (
    <Chrome title={t("gigDetail")} screenId="BUY-05" back>
      {gig.loading ? <Skeletons n={2} /> : null}
      {g?.status === "suspended" ? <Banner>⚠ {g.suspensionReason ?? "Gig suspended"}</Banner> : null}
      {g ? (
        <>
          <Card>
            <p className="card-title">{g.title || g.routeName}</p>
            <StatusChip status={g.status} />
            <p>{formatDate(g.date)}</p>
            <p className="muted">{g.villages.map((v) => v.name).join(" → ")}</p>
            <p>
              🏪 {shop.data?.name}{" "}
              {shop.data?.contactInfo ? <a href={`tel:${shop.data.contactInfo}`}>{t("callShop")}</a> : null}
            </p>
            <p className="muted">
              🚚 {driver.data?.name ?? g.driverName} · {driver.data?.vehicleNumber}
            </p>
          </Card>
          <Button disabled={g.status === "suspended"} onClick={() => nav(`/gigs/${g.id}/pamphlet`)}>
            {t("viewPamphlet")}
          </Button>
        </>
      ) : null}
    </Chrome>
  );
}

export function PamphletScreen() {
  const { t } = useI18n();
  const { gigId } = useParams();
  const nav = useNavigate();
  const { profile } = useSession();
  const { setContext, setQty, cart } = useCart();
  const gig = useDoc<Gig>(Col.Gigs, gigId);
  const pam = useDoc<Pamphlet>(Col.Pamphlets, gig.data?.pamphletId);
  const [q, setQ] = useState("");
  const items = (pam.data?.promotedProducts ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  useEffect(() => {
    if (!gig.data || !profile) return;
    setContext({
      uid: profile.id,
      gigId: gig.data.id,
      villageId: profile.villageId ?? "",
      merchantId: profile.selectedMerchantId ?? "",
      pamphletId: gig.data.pamphletId,
      supplierId: gig.data.supplierId,
    });
  }, [gig.data, profile, setContext]);

  return (
    <Chrome title={pam.data?.title ?? t("pamphlet")} screenId="BUY-05.1" back>
      <input
        placeholder="Search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ minHeight: 48, width: "100%", marginBottom: 12 }}
      />
      {items.map((p) => {
        const qty = cart?.lines.find((l) => l.productId === p.productId)?.quantity ?? 0;
        return (
          <Card key={p.productId}>
            <p className="card-title">{p.name}</p>
            <p>
              ₹{p.discountedPrice} <span className="muted">₹{p.originalPrice}</span>
            </p>
            <p className="muted">
              {p.currentStock} {p.unitOfMeasure}
            </p>
            <Button
              variant="secondary"
              onClick={() =>
                setQty(
                  p.productId,
                  {
                    productId: p.productId,
                    name: p.name,
                    price: p.discountedPrice,
                    unit: p.unitOfMeasure,
                    stock: p.currentStock,
                  },
                  qty + 1,
                )
              }
            >
              {t("addToCart")} ({qty})
            </Button>
          </Card>
        );
      })}
      <Button onClick={() => nav("/cart")}>{t("cart")}</Button>
    </Chrome>
  );
}
