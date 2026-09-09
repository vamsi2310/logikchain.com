import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { where } from "firebase/firestore";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useQuery } from "@/data/hooks";
import { useI18n } from "@/state/locale";
import { useSession } from "@/state/session";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Button, Card, EmptyState, Field, Progress } from "@/ui/primitives";
import type { UserProfile } from "@/types/domain";

export function BuyerSetupScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile, user, refreshProfile } = useSession();
  const { push } = useToast();
  const [step, setStep] = useState(1);
  const [perms, setPerms] = useState(profile?.permissions ?? { location: false, sms: false, audio: true, camera: false });
  const [address, setAddress] = useState(profile?.address ?? "");
  const [villageId, setVillageId] = useState(profile?.villageId ?? "");
  const [merchantId, setMerchantId] = useState(profile?.selectedMerchantId ?? "");

  const villages = useQuery<{ id: string; name: string }>(Col.Villages, [], []);
  const merchants = useQuery<UserProfile>(
    villageId ? Col.UserProfiles : null,
    villageId
      ? [where("role", "==", "merchant"), where("status", "==", "approved"), where("villageId", "==", villageId)]
      : [],
    [villageId],
  );

  async function savePerms() {
    if (!user) return;
    await ops.updateUserProfile(user.uid, { permissions: perms });
    await refreshProfile();
    setStep(2);
  }

  async function saveGeo() {
    if (!user) return;
    await ops.updateUserProfile(user.uid, { address, villageId });
    await refreshProfile();
    setStep(3);
  }

  async function finish() {
    if (!user) return;
    try {
      await ops.updateUserProfile(user.uid, { selectedMerchantId: merchantId, villageId });
      await refreshProfile();
      nav("/home", { replace: true });
    } catch (e) {
      push((e as Error).message);
    }
  }

  return (
    <Chrome title={t("setupAccount")} screenId="BUY-01" noNav>
      <Progress step={step} of={3} />
      {step === 1 ? (
        <>
          <p>{t("stepPermissions")}</p>
          {(["location", "sms", "audio", "camera"] as const).map((k) => (
            <label key={k} className="checkbox">
              <input type="checkbox" checked={perms[k]} onChange={(e) => setPerms({ ...perms, [k]: e.target.checked })} />
              {k}
            </label>
          ))}
          <div className="row-btns">
            <Button variant="secondary" onClick={() => setStep(2)}>
              {t("skip")}
            </Button>
            <Button onClick={() => void savePerms()}>{t("continue")}</Button>
          </div>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <p>{t("stepGeo")}</p>
          <Field label={t("address")}>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label={t("village")}>
            <select value={villageId} onChange={(e) => setVillageId(e.target.value)} style={{ minHeight: 48, width: "100%" }}>
              <option value="">—</option>
              {villages.rows.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="row-btns">
            <Button variant="secondary" onClick={() => setStep(3)}>
              {t("skip")}
            </Button>
            <Button onClick={() => void saveGeo()}>{t("continue")}</Button>
          </div>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <p>{t("stepMerchant")}</p>
          {merchants.rows.length === 0 ? (
            <EmptyState glyph="🏪" title="No shop in this village" hint="Ask your supplier." />
          ) : (
            merchants.rows.map((m) => (
              <Card key={m.id} onClick={() => setMerchantId(m.id)}>
                <p className="card-title">🏪 {m.name ?? m.shopDetails}</p>
                <p className="muted">{m.shopDetails}</p>
                <span>{merchantId === m.id ? "(•)" : "( )"}</span>
              </Card>
            ))
          )}
          <div className="row-btns">
            <Button variant="secondary" onClick={() => nav("/home", { replace: true })}>
              {t("skip")}
            </Button>
            <Button onClick={() => void finish()}>{t("finish")}</Button>
          </div>
        </>
      ) : null}
    </Chrome>
  );
}
