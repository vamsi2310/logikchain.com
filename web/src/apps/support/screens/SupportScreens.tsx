import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { where, orderBy, doc, setDoc } from "firebase/firestore";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useDoc, useQuery } from "@/data/hooks";
import { getDb } from "@/firebase/app";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Button, Card, EmptyState, Field, Skeletons, StatusChip } from "@/ui/primitives";
import { formatDate, formatMoney } from "@/format";
import type { Order, UserProfile, Village, VillageRequest } from "@/types/domain";

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
  const nav = useNavigate();
  const { push } = useToast();
  const countries = useQuery<Record<string, unknown>>(Col.Countries, [where("status", "==", "active")], []);
  const [countryId, setCountryId] = useState("country_in");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCountry = countries.rows.find((c) => c.id === countryId) ?? countries.rows[0];
  const prefix = String(selectedCountry?.mobilePrefix ?? "+91");

  return (
    <Chrome title="Create supplier" screenId="SPT-02.3" back>
      <Field label="Country">
        <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
          {countries.rows.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {String(c.name ?? c.id)} ({String(c.mobilePrefix ?? "")})
            </option>
          ))}
          {countries.rows.length === 0 && <option value="country_in">India (+91)</option>}
        </select>
      </Field>
      <Field label="Supplier / Company Name">
        <input placeholder="e.g. Sri Venkateswara Agros" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={`Mobile Phone Number (${prefix})`}>
        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              background: "var(--surface-alt)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              font: "var(--text-body)",
              whiteSpace: "nowrap",
            }}
          >
            {prefix}
          </span>
          <input
            style={{ flex: 1 }}
            placeholder="10-digit number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </Field>
      <Field label="Email Address">
        <input type="email" placeholder="supplier@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button
        loading={submitting}
        onClick={async () => {
          if (!name.trim()) return push("Please enter a supplier name");
          if (!phone.trim()) return push("Please enter a phone number");
          if (!email.trim()) return push("Please enter an email address");
          const cleanPhone = phone.trim();
          const pfx = prefix.startsWith("+") ? prefix : `+${prefix.replace(/\D/g, "")}`;
          const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `${pfx}${cleanPhone}`;
          setSubmitting(true);
          try {
            await ops.createSupplier({ name: name.trim(), phone: formattedPhone, email: email.trim(), countryId });
            push("Supplier created successfully");
            nav("/x/users");
          } catch (e) {
            push((e as Error).message);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        Create Supplier
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
          <p className="muted">PIN: {r.pincode ?? "—"}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button
              onClick={async () => {
                try {
                  const pincode = r.pincode || "523001";
                  const lgdCode = `vlg_${r.id.slice(-6)}`;
                  await ops.upsertVillage(lgdCode, {
                    id: lgdCode,
                    requestId: r.id,
                    lgdCode,
                    name: r.name,
                    pincode,
                    panchayat: r.name,
                    mandal: r.name,
                    district: r.district,
                    state: r.state,
                    location: { latitude: 15.5, longitude: 80.0 },
                    status: "active",
                  });
                  push("Village approved and added");
                } catch (e) {
                  push((e as Error).message);
                }
              }}
            >
              Approve & Add
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void ops.rejectVillageRequest(r.id, { reason: "Incomplete" }).catch((e) => push(e.message))
              }
            >
              Reject
            </Button>
          </div>
        </Card>
      ))}
      {q.rows.length === 0 && (
        <EmptyState glyph="📬" title="No pending requests" hint="Village creation requests will appear here." />
      )}
    </Chrome>
  );
}

export function ConfigHomeScreen() {
  const nav = useNavigate();
  const items = [
    ["/x/config/countries", "Countries"],
    ["/x/config/states", "States"],
    ["/x/config/districts", "Districts"],
    ["/x/config/villages", "Villages"],
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

export function CountriesScreen() {
  const q = useQuery<Record<string, unknown>>(Col.Countries, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("India");
  const [isoCode, setIsoCode] = useState("IN");
  const [isoCode3, setIsoCode3] = useState("IND");
  const [numericCode, setNumericCode] = useState("356");
  const [mobilePrefix, setMobilePrefix] = useState("+91");
  const [phoneLength, setPhoneLength] = useState("10");
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Chrome
      title="Countries"
      screenId="SPT-06"
      back
      fab={{ label: showAdd ? "Close" : "+ Add Country", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add / Update Country</p>
          <Field label="Country Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. India" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="ISO Code (2-letter)">
              <input value={isoCode} onChange={(e) => setIsoCode(e.target.value.toUpperCase())} placeholder="IN" maxLength={2} />
            </Field>
            <Field label="ISO Code (3-letter)">
              <input value={isoCode3} onChange={(e) => setIsoCode3(e.target.value.toUpperCase())} placeholder="IND" maxLength={3} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Numeric Code">
              <input value={numericCode} onChange={(e) => setNumericCode(e.target.value)} placeholder="356" />
            </Field>
            <Field label="Mobile Prefix">
              <input value={mobilePrefix} onChange={(e) => setMobilePrefix(e.target.value)} placeholder="+91" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Phone Number Length">
              <input type="number" value={phoneLength} onChange={(e) => setPhoneLength(e.target.value)} placeholder="10" />
            </Field>
            <Field label="Timezone">
              <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Currency Code">
              <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} placeholder="INR" />
            </Field>
            <Field label="Currency Symbol">
              <input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} placeholder="₹" />
            </Field>
          </div>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim() || !isoCode.trim()) return push("Name and ISO Code are required");
              setSubmitting(true);
              const countryId = `country_${isoCode.trim().toLowerCase()}`;
              try {
                await ops.upsertCountry(countryId, {
                  name: name.trim(),
                  isoCode: isoCode.trim().toUpperCase(),
                  isoCode3: isoCode3.trim().toUpperCase(),
                  numericCode: numericCode.trim(),
                  mobilePrefix: mobilePrefix.trim().startsWith("+") ? mobilePrefix.trim() : `+${mobilePrefix.trim()}`,
                  phoneNumberLength: Number(phoneLength),
                  currencyCode: currencyCode.trim().toUpperCase(),
                  currencySymbol: currencySymbol.trim(),
                  timezone: timezone.trim(),
                  status: "active",
                });
                push("Country saved");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save Country
          </Button>
        </Card>
      )}

      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(r.name ?? r.id)}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">
            {String(r.isoCode ?? "")} · Prefix: {String(r.mobilePrefix ?? "")} · Currency: {String(r.currencyCode ?? "")} ({String(r.currencySymbol ?? "")})
          </p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="🌐" title="No countries" hint="Add your first operating country above." />
      )}
    </Chrome>
  );
}

export function StatesScreen() {
  const countries = useQuery<Record<string, unknown>>(Col.Countries, [where("status", "==", "active")], []);
  const q = useQuery<Record<string, unknown>>(Col.States, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [countryId, setCountryId] = useState("country_in");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Chrome
      title="States"
      screenId="SPT-07"
      back
      fab={{ label: showAdd ? "Close" : "+ Add State", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add State</p>
          <Field label="Country">
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {countries.rows.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name ?? c.id)} ({String(c.isoCode ?? "")})
                </option>
              ))}
              {countries.rows.length === 0 && <option value="country_in">India (IN)</option>}
            </select>
          </Field>
          <Field label="State Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Andhra Pradesh" />
          </Field>
          <Field label="State Code (e.g. AP, TG, KA)">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AP" maxLength={4} />
          </Field>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim() || !code.trim()) return push("Name and code are required");
              setSubmitting(true);
              const stateId = `${countryId}_${code.trim().toLowerCase()}`;
              try {
                await ops.upsertState(stateId, {
                  countryId,
                  name: name.trim(),
                  code: code.trim().toUpperCase(),
                  status: "active",
                });
                push("State saved");
                setName("");
                setCode("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save State
          </Button>
        </Card>
      )}

      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(r.name ?? r.id)}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">Code: {String(r.code ?? "")} · Country: {String(r.countryId ?? "")}</p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="🗺️" title="No states" hint="Add your first operating state." />
      )}
    </Chrome>
  );
}

export function DistrictsScreen() {
  const countries = useQuery<Record<string, unknown>>(Col.Countries, [where("status", "==", "active")], []);
  const states = useQuery<Record<string, unknown>>(Col.States, [where("status", "==", "active")], []);
  const q = useQuery<Record<string, unknown>>(Col.Districts, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [countryId, setCountryId] = useState("country_in");
  const [stateId, setStateId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredStates = states.rows.filter((s) => !countryId || s.countryId === countryId);
  const activeStateId = stateId || String(filteredStates[0]?.id ?? "");

  return (
    <Chrome
      title="Districts"
      screenId="SPT-08"
      back
      fab={{ label: showAdd ? "Close" : "+ Add District", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add District</p>
          <Field label="Country">
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {countries.rows.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name ?? c.id)}
                </option>
              ))}
              {countries.rows.length === 0 && <option value="country_in">India</option>}
            </select>
          </Field>
          <Field label="State">
            <select value={activeStateId} onChange={(e) => setStateId(e.target.value)}>
              {filteredStates.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {String(s.name ?? s.id)} ({String(s.code ?? "")})
                </option>
              ))}
            </select>
          </Field>
          <Field label="District Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Prakasam" />
          </Field>
          <Field label="District Code (Optional)">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. PRA" />
          </Field>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim()) return push("District name is required");
              if (!activeStateId) return push("Please select a state first");
              setSubmitting(true);
              const districtId = `dst_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
              try {
                await ops.upsertDistrict(districtId, {
                  countryId,
                  stateId: activeStateId,
                  name: name.trim(),
                  code: code.trim() ? code.trim().toUpperCase() : undefined,
                  status: "active",
                });
                push("District saved");
                setName("");
                setCode("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save District
          </Button>
        </Card>
      )}

      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(r.name ?? r.id)}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">State: {String(r.stateId ?? "")}</p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="📍" title="No districts" hint="Add your first operating district." />
      )}
    </Chrome>
  );
}

export function VillagesScreen() {
  const countries = useQuery<Record<string, unknown>>(Col.Countries, [where("status", "==", "active")], []);
  const states = useQuery<Record<string, unknown>>(Col.States, [where("status", "==", "active")], []);
  const districts = useQuery<Record<string, unknown>>(Col.Districts, [where("status", "==", "active")], []);
  const hubs = useQuery<Record<string, unknown>>(Col.Hubs, [where("status", "==", "active")], []);
  const q = useQuery<Village>(Col.Villages, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [countryId, setCountryId] = useState("country_in");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [hubId, setHubId] = useState("");
  const [name, setName] = useState("");
  const [lgdCode, setLgdCode] = useState("");
  const [pincode, setPincode] = useState("");
  const [panchayat, setPanchayat] = useState("");
  const [mandal, setMandal] = useState("");
  const [population, setPopulation] = useState("");
  const [lat, setLat] = useState("15.5000");
  const [lng, setLng] = useState("80.0000");
  const [submitting, setSubmitting] = useState(false);

  const filteredStates = states.rows.filter((s) => !countryId || s.countryId === countryId);
  const activeStateId = stateId || String(filteredStates[0]?.id ?? "");
  const selectedState = filteredStates.find((s) => String(s.id) === activeStateId);
  const stateName = String(selectedState?.name ?? "Andhra Pradesh");

  const filteredDistricts = districts.rows.filter((d) => !activeStateId || d.stateId === activeStateId);
  const activeDistrictId = districtId || String(filteredDistricts[0]?.id ?? "");
  const selectedDistrict = filteredDistricts.find((d) => String(d.id) === activeDistrictId);
  const districtName = String(selectedDistrict?.name ?? "Prakasam");

  const filteredVillages = q.rows.filter((v) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(term) ||
      v.pincode?.includes(term) ||
      v.mandal?.toLowerCase().includes(term) ||
      v.district?.toLowerCase().includes(term) ||
      v.lgdCode?.includes(term)
    );
  });

  return (
    <Chrome
      title="Villages"
      screenId="SPT-08.1"
      back
      fab={{ label: showAdd ? "Close" : "+ Add Village", onClick: () => setShowAdd((v) => !v) }}
    >
      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search villages by name, pincode, mandal..."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--ink)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {showAdd && (
        <Card>
          <p className="card-title">Add Village</p>
          <Field label="Village Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Konduru" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="LGD Code (Optional / Auto)">
              <input value={lgdCode} onChange={(e) => setLgdCode(e.target.value)} placeholder="e.g. 590123" />
            </Field>
            <Field label="Pincode (6 digits)">
              <input value={pincode} onChange={(e) => setPincode(e.target.value.trim())} placeholder="523201" maxLength={6} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Panchayat">
              <input value={panchayat} onChange={(e) => setPanchayat(e.target.value)} placeholder="e.g. Konduru" />
            </Field>
            <Field label="Mandal">
              <input value={mandal} onChange={(e) => setMandal(e.target.value)} placeholder="e.g. Addanki" />
            </Field>
          </div>
          <Field label="Country">
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {countries.rows.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>{String(c.name ?? c.id)}</option>
              ))}
              {countries.rows.length === 0 && <option value="country_in">India</option>}
            </select>
          </Field>
          <Field label="State">
            <select value={activeStateId} onChange={(e) => setStateId(e.target.value)}>
              {filteredStates.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>{String(s.name ?? s.id)}</option>
              ))}
            </select>
          </Field>
          <Field label="District">
            <select value={activeDistrictId} onChange={(e) => setDistrictId(e.target.value)}>
              {filteredDistricts.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>{String(d.name ?? d.id)}</option>
              ))}
            </select>
          </Field>
          <Field label="Associated Hub (Optional)">
            <select value={hubId} onChange={(e) => setHubId(e.target.value)}>
              <option value="">None / Unassigned</option>
              {hubs.rows.map((h) => (
                <option key={String(h.id)} value={String(h.id)}>{String(h.name ?? h.id)}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Latitude">
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} />
            </Field>
            <Field label="Longitude">
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} />
            </Field>
          </div>
          <Field label="Population (Optional)">
            <input type="number" value={population} onChange={(e) => setPopulation(e.target.value)} placeholder="e.g. 2500" />
          </Field>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim()) return push("Village name is required");
              if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) return push("Valid 6-digit pincode is required");
              setSubmitting(true);
              const generatedLgd = lgdCode.trim() || String(Math.floor(100000 + Math.random() * 900000));
              const villageId = `vlg_${generatedLgd}`;
              try {
                await ops.upsertVillage(villageId, {
                  id: villageId,
                  lgdCode: generatedLgd,
                  name: name.trim(),
                  pincode: pincode.trim(),
                  panchayat: panchayat.trim() || name.trim(),
                  mandal: mandal.trim() || name.trim(),
                  district: districtName,
                  state: stateName,
                  countryId,
                  stateId: activeStateId,
                  districtId: activeDistrictId,
                  hubId: hubId || undefined,
                  location: {
                    latitude: Number(lat) || 15.5,
                    longitude: Number(lng) || 80.0,
                  },
                  population: population.trim() ? Number(population) : undefined,
                  status: "active",
                });
                push("Village saved");
                setName("");
                setLgdCode("");
                setPincode("");
                setPanchayat("");
                setMandal("");
                setPopulation("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save Village
          </Button>
        </Card>
      )}

      {filteredVillages.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{r.name}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">
            PIN: {r.pincode ?? "—"} · Mandal: {r.mandal ?? "—"} · District: {r.district ?? "—"}, {r.state ?? "—"}
          </p>
          {r.location ? (
            <p className="muted" style={{ fontSize: 11 }}>
              Coords: {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)}
              {r.lgdCode ? ` · LGD: ${r.lgdCode}` : ""}
              {r.hubId ? ` · Hub: ${r.hubId}` : ""}
            </p>
          ) : null}
        </Card>
      ))}

      {filteredVillages.length === 0 && !showAdd && (
        <EmptyState
          glyph="🏡"
          title={search ? "No villages match search" : "No villages"}
          hint={search ? "Try a different search term." : "Add your first operating village above."}
        />
      )}
    </Chrome>
  );
}

export function HubsScreen() {
  const countries = useQuery<Record<string, unknown>>(Col.Countries, [where("status", "==", "active")], []);
  const states = useQuery<Record<string, unknown>>(Col.States, [where("status", "==", "active")], []);
  const districts = useQuery<Record<string, unknown>>(Col.Districts, [where("status", "==", "active")], []);
  const q = useQuery<Record<string, unknown>>(Col.Hubs, [], []);
  const nav = useNavigate();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("country_in");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("15.5057");
  const [lng, setLng] = useState("80.0499");
  const [submitting, setSubmitting] = useState(false);

  const filteredStates = states.rows.filter((s) => !countryId || s.countryId === countryId);
  const activeStateId = stateId || String(filteredStates[0]?.id ?? "");
  const filteredDistricts = districts.rows.filter((d) => !activeStateId || d.stateId === activeStateId);
  const activeDistrictId = districtId || String(filteredDistricts[0]?.id ?? "");

  return (
    <Chrome
      title="Hubs"
      screenId="SPT-09"
      back
      fab={{ label: showAdd ? "Close" : "+ Add Hub", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add Physical Hub</p>
          <Field label="Hub Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ongole Central Hub" />
          </Field>
          <Field label="Country">
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {countries.rows.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>{String(c.name ?? c.id)}</option>
              ))}
              {countries.rows.length === 0 && <option value="country_in">India</option>}
            </select>
          </Field>
          <Field label="State">
            <select value={activeStateId} onChange={(e) => setStateId(e.target.value)}>
              {filteredStates.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>{String(s.name ?? s.id)}</option>
              ))}
            </select>
          </Field>
          <Field label="District">
            <select value={activeDistrictId} onChange={(e) => setDistrictId(e.target.value)}>
              {filteredDistricts.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>{String(d.name ?? d.id)}</option>
              ))}
            </select>
          </Field>
          <Field label="Address / Landmark">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Near NH16 Junction" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Latitude">
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} />
            </Field>
            <Field label="Longitude">
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} />
            </Field>
          </div>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim()) return push("Hub name is required");
              if (!activeDistrictId) return push("Please select a district");
              setSubmitting(true);
              const hubId = `hub_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
              try {
                await setDoc(doc(getDb(), Col.Hubs, hubId), {
                  id: hubId,
                  name: name.trim(),
                  countryId,
                  stateId: activeStateId,
                  districtId: activeDistrictId,
                  address: address.trim() || null,
                  location: { latitude: Number(lat), longitude: Number(lng) },
                  status: "active",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                push("Hub created successfully");
                setName("");
                setAddress("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Create Hub
          </Button>
        </Card>
      )}

      {q.rows.map((h) => (
        <Card key={String(h.id)} onClick={() => nav(`/x/config/hubs/${String(h.id)}`)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(h.name)}</p>
            <StatusChip status={String(h.status ?? "active")} />
          </div>
          <p className="muted">
            District: {String(h.districtId ?? "")} · Lat/Lng: {Number((h.location as any)?.latitude ?? 0).toFixed(4)}, {Number((h.location as any)?.longitude ?? 0).toFixed(4)}
          </p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="🏢" title="No hubs" hint="Create your first logistics hub above." />
      )}
    </Chrome>
  );
}

export function HubDetailScreen() {
  const { hubId } = useParams();
  const h = useDoc<Record<string, unknown>>(Col.Hubs, hubId);
  return (
    <Chrome title="Hub Details" screenId="SPT-09.1" back>
      {h.data ? (
        <Card>
          <p className="card-title">{String(h.data.name ?? "")}</p>
          <p className="muted">ID: {String(h.data.id)}</p>
          <p>District: {String(h.data.districtId ?? "")}</p>
          <p>State: {String(h.data.stateId ?? "")}</p>
          <p>Address: {String(h.data.address ?? "N/A")}</p>
          <p>
            Coordinates: {Number((h.data.location as any)?.latitude ?? 0).toFixed(4)}, {Number((h.data.location as any)?.longitude ?? 0).toFixed(4)}
          </p>
          <StatusChip status={String(h.data.status ?? "active")} />
        </Card>
      ) : (
        <Skeletons n={2} />
      )}
    </Chrome>
  );
}

const ALL_ENTITLEMENTS = [
  { id: "finance.dashboard", label: "Financial Dashboard (Required)", baseline: true },
  { id: "finance.transaction_history", label: "Transaction History (Required)", baseline: true },
  { id: "finance.reports", label: "Financial Reports", baseline: false },
  { id: "finance.export", label: "Data Export", baseline: false },
  { id: "finance.reconciliation", label: "Reconciliation (Supplier only)", supplierOnly: true, baseline: false },
  { id: "finance.period_close", label: "Period Close (Supplier only)", supplierOnly: true, baseline: false },
  { id: "catalog.manage", label: "Catalog Management", baseline: false },
  { id: "orders.manage", label: "Order Management", baseline: false },
  { id: "gigs.dispatch", label: "Gig & Driver Dispatch", baseline: false },
  { id: "analytics.view", label: "Analytics & Metrics", baseline: false },
];

export function PlansScreen() {
  const q = useQuery<Record<string, unknown>>(Col.SubscriptionPlans, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState<"supplier" | "merchant">("supplier");
  const [selectedEntitlements, setSelectedEntitlements] = useState<string[]>([
    "finance.dashboard",
    "finance.transaction_history",
    "catalog.manage",
    "orders.manage",
  ]);
  const [submitting, setSubmitting] = useState(false);

  const toggleEntitlement = (id: string) => {
    if (id === "finance.dashboard" || id === "finance.transaction_history") return;
    setSelectedEntitlements((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Chrome
      title="Subscription Plans"
      screenId="SPT-10"
      back
      fab={{ label: showAdd ? "Close" : "+ Add Plan", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add Subscription Plan</p>
          <Field label="Target Role">
            <select
              value={targetRole}
              onChange={(e) => {
                const role = e.target.value as "supplier" | "merchant";
                setTargetRole(role);
                if (role === "merchant") {
                  setSelectedEntitlements((prev) =>
                    prev.filter((x) => x !== "finance.reconciliation" && x !== "finance.period_close")
                  );
                }
              }}
            >
              <option value="supplier">Supplier</option>
              <option value="merchant">Merchant</option>
            </select>
          </Field>
          <Field label="Plan Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Supplier Growth Plan" />
          </Field>
          <Field label="Description">
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Standard tier for rural suppliers" />
          </Field>
          <Field label="Entitlements">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ALL_ENTITLEMENTS.filter((ent) => !ent.supplierOnly || targetRole === "supplier").map((ent) => (
                <label key={ent.id} style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-body)" }}>
                  <input
                    type="checkbox"
                    checked={selectedEntitlements.includes(ent.id)}
                    disabled={ent.baseline}
                    onChange={() => toggleEntitlement(ent.id)}
                  />
                  <span>{ent.label}</span>
                </label>
              ))}
            </div>
          </Field>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim() || !description.trim()) return push("Name and description are required");
              setSubmitting(true);
              const planId = `plan_${targetRole}_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
              try {
                await ops.upsertSubscriptionPlan(planId, {
                  name: name.trim(),
                  description: description.trim(),
                  targetRole,
                  entitlements: selectedEntitlements,
                  status: "active",
                  features: [],
                });
                push("Plan saved");
                setName("");
                setDescription("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save Plan
          </Button>
        </Card>
      )}

      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(r.name ?? r.id)}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">Role: {String(r.targetRole ?? "")} · {String(r.description ?? "")}</p>
          <p style={{ font: "var(--text-caption)", color: "var(--ink-muted)", marginTop: 4 }}>
            Entitlements: {Array.isArray(r.entitlements) ? (r.entitlements as string[]).join(", ") : ""}
          </p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="📋" title="No plans" hint="Create your first subscription plan." />
      )}
    </Chrome>
  );
}

export function TariffsScreen() {
  const plans = useQuery<Record<string, unknown>>(Col.SubscriptionPlans, [where("status", "==", "active")], []);
  const q = useQuery<Record<string, unknown>>(Col.PlanTariffs, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [planId, setPlanId] = useState("");
  const [name, setName] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [basePrice, setBasePrice] = useState("999");
  const [gstRate, setGstRate] = useState("18");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const activePlanId = planId || String(plans.rows[0]?.id ?? "");

  return (
    <Chrome
      title="Plan Tariffs"
      screenId="SPT-11"
      back
      fab={{ label: showAdd ? "Close" : "+ Add Tariff", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add Tariff</p>
          <Field label="Subscription Plan">
            <select value={activePlanId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.rows.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.name ?? p.id)} ({String(p.targetRole ?? "")})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tariff Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Monthly" />
          </Field>
          <Field label="Billing Cycle">
            <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as any)}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Base Price (₹)">
              <input type="number" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </Field>
            <Field label="GST Rate (%)">
              <input type="number" min="0" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
            </Field>
          </div>
          <Field label="Effective From">
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </Field>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim()) return push("Tariff name is required");
              if (!activePlanId) return push("Please select a plan");
              setSubmitting(true);
              const tariffId = `trf_${activePlanId}_${billingCycle}`;
              try {
                await ops.upsertPlanTariff(tariffId, {
                  planId: activePlanId,
                  name: name.trim(),
                  billingCycle,
                  currencyCode: "INR",
                  countryId: "country_in",
                  tariffType: "flat",
                  basePrice: Number(basePrice),
                  gstRate: Number(gstRate),
                  effectiveFrom,
                  status: "active",
                });
                push("Tariff saved");
                setName("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save Tariff
          </Button>
        </Card>
      )}

      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(r.name ?? r.id)}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">
            Plan: {String(r.planId ?? "")} · {String(r.billingCycle ?? "")} · ₹{Number(r.basePrice ?? 0)} (+{Number(r.gstRate ?? 0)}% GST)
          </p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="💳" title="No tariffs" hint="Create a tariff for your plans." />
      )}
    </Chrome>
  );
}

export function OffersScreen() {
  const plans = useQuery<Record<string, unknown>>(Col.SubscriptionPlans, [where("status", "==", "active")], []);
  const q = useQuery<Record<string, unknown>>(Col.SubscriptionOffers, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [planId, setPlanId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState("20");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [validTo, setValidTo] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);

  const activePlanId = planId || String(plans.rows[0]?.id ?? "");

  return (
    <Chrome
      title="Offers"
      screenId="SPT-12"
      back
      fab={{ label: showAdd ? "Close" : "+ Add Offer", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add Subscription Offer</p>
          <Field label="Plan">
            <select value={activePlanId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.rows.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.id)}</option>
              ))}
            </select>
          </Field>
          <Field label="Offer Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Early Bird 20%" />
          </Field>
          <Field label="Description">
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 20% launch discount" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Discount Type">
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </Field>
            <Field label="Discount Value">
              <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Valid From">
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </Field>
            <Field label="Valid To">
              <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </Field>
          </div>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!name.trim() || !description.trim()) return push("Name and description required");
              if (!activePlanId) return push("Please select a plan");
              setSubmitting(true);
              const offerId = `off_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
              try {
                await ops.upsertSubscriptionOffer(offerId, {
                  planId: activePlanId,
                  name: name.trim(),
                  description: description.trim(),
                  discountType,
                  discountValue: Number(discountValue),
                  validFrom,
                  validTo,
                  status: "active",
                });
                push("Offer saved");
                setName("");
                setDescription("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save Offer
          </Button>
        </Card>
      )}

      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(r.name ?? r.id)}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">
            {String(r.discountType === "percent" ? `${r.discountValue}% off` : `₹${r.discountValue} off`)} · Plan: {String(r.planId ?? "")}
          </p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="🏷️" title="No offers" hint="Create promotional offers." />
      )}
    </Chrome>
  );
}

export function CodesScreen() {
  const offers = useQuery<Record<string, unknown>>(Col.SubscriptionOffers, [where("status", "==", "active")], []);
  const q = useQuery<Record<string, unknown>>(Col.OfferDiscountCodes, [], []);
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [offerId, setOfferId] = useState("");
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  const activeOfferId = offerId || String(offers.rows[0]?.id ?? "");

  return (
    <Chrome
      title="Discount Codes"
      screenId="SPT-13"
      back
      fab={{ label: showAdd ? "Close" : "+ Add Code", onClick: () => setShowAdd((v) => !v) }}
    >
      {showAdd && (
        <Card>
          <p className="card-title">Add Promo Code</p>
          <Field label="Offer">
            <select value={activeOfferId} onChange={(e) => setOfferId(e.target.value)}>
              {offers.rows.map((o) => (
                <option key={String(o.id)} value={String(o.id)}>{String(o.name ?? o.id)}</option>
              ))}
            </select>
          </Field>
          <Field label="Coupon Code">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME2026" />
          </Field>
          <Field label="Max Redemptions">
            <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </Field>
          <Button
            loading={submitting}
            onClick={async () => {
              if (!code.trim()) return push("Code is required");
              if (!activeOfferId) return push("Please select an offer");
              setSubmitting(true);
              const codeId = `odc_${code.trim().toLowerCase()}`;
              try {
                await ops.upsertOfferDiscountCode(codeId, {
                  offerId: activeOfferId,
                  code: code.trim().toUpperCase(),
                  maxUses: Number(maxUses) || null,
                  status: "active",
                });
                push("Code saved");
                setCode("");
                setShowAdd(false);
              } catch (e) {
                push((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save Code
          </Button>
        </Card>
      )}

      {q.rows.map((r) => (
        <Card key={String(r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">{String(r.code ?? r.id)}</p>
            <StatusChip status={String(r.status ?? "active")} />
          </div>
          <p className="muted">Offer: {String(r.offerId ?? "")} · Uses: {Number(r.usedCount ?? 0)} / {Number(r.maxUses ?? "∞")}</p>
        </Card>
      ))}
      {q.rows.length === 0 && !showAdd && (
        <EmptyState glyph="🎟️" title="No discount codes" hint="Generate codes for active offers." />
      )}
    </Chrome>
  );
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
