import { useState, useEffect } from "react";
import { SupportChrome as Chrome, SptField as Field } from "../SupportChrome";
import { Card, Button } from "@/ui/primitives";
import { useToast } from "@/state/toast";
import { api } from "@/api/client";

interface PudoTier {
  tier: number;
  minParcels: number;
  maxParcels: number | null;
  ratePerParcel: number;
}

const DEFAULT_TIERS: PudoTier[] = [
  { tier: 1, minParcels: 1, maxParcels: 50, ratePerParcel: 8 },
  { tier: 2, minParcels: 51, maxParcels: 200, ratePerParcel: 12 },
  { tier: 3, minParcels: 201, maxParcels: null, ratePerParcel: 15 },
];

export function PudoCommissionGovernanceScreen() {
  const { push } = useToast();
  const [supplierId, setSupplierId] = useState("sup_ongole_01");
  const [tiers, setTiers] = useState<PudoTier[]>(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);
  const [notifyPartners, setNotifyPartners] = useState(true);

  useEffect(() => {
    async function loadTiers() {
      try {
        const res = await api.get<any>(`/v1/config/suppliers/${supplierId}/pudo-tiers`);
        if (res.tiers && Array.isArray(res.tiers)) {
          setTiers(res.tiers);
        }
      } catch {}
    }
    loadTiers();
  }, [supplierId]);

  const updateRate = (tierIndex: number, newRate: number) => {
    setTiers((prev) => {
      const copy = [...prev];
      const item = copy[tierIndex];
      if (item) {
        copy[tierIndex] = {
          tier: item.tier,
          minParcels: item.minParcels,
          maxParcels: item.maxParcels,
          ratePerParcel: newRate,
        };
      }
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/v1/config/suppliers/${supplierId}/pudo-tiers`, {
        tiers,
        notifyParties: notifyPartners,
      });
      push(`PUDO commission tiers locked & saved for ${supplierId}. Mirrored to Firestore.`);
    } catch (err: any) {
      push(err.message || "Failed to save tiers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Chrome title="PUDO Commission Governance" screenId="SPT-13" back>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <p className="card-title" style={{ fontSize: 16, fontWeight: 600 }}>Supplier PUDO Hub Policy</p>
          <p className="muted" style={{ marginBottom: 12 }}>
            Manage monthly parcel volume tiers and commission rates paid to village kirana merchants for acting as pickup/PUDO hubs.
          </p>
          <Field label="Supplier ID">
            <input
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="sup_ongole_01"
            />
          </Field>
        </Card>

        <Card>
          <p className="card-title" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Monthly Volume Commission Tiers
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tiers.map((t, idx) => (
              <div
                key={t.tier}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 140px",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--spt-content-border, #e2e8f0)",
                  background: "var(--spt-surface-sunken, #f8fafc)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Tier {t.tier}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--spt-ink-muted, #64748b)" }}>
                  {t.minParcels} – {t.maxParcels ? `${t.maxParcels} parcels/mo` : "201+ parcels/mo"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>₹</span>
                  <input
                    type="number"
                    value={t.ratePerParcel}
                    onChange={(e) => updateRate(idx, Number(e.target.value))}
                    style={{ width: 80, padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                  />
                  <span style={{ fontSize: 12, color: "#64748b" }}>/parcel</span>
                </div>
              </div>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={notifyPartners}
              onChange={(e) => setNotifyPartners(e.target.checked)}
            />
            Dispatch automated WhatsApp/SMS notifications to supplier and affected village merchants
          </label>

          <div style={{ marginTop: 16 }}>
            <Button loading={saving} onClick={handleSave}>
              Save Commission Structure
            </Button>
          </div>
        </Card>
      </div>
    </Chrome>
  );
}
