import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RecaptchaVerifier } from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/app";
import { ops } from "@/api/ops";
import { useI18n, LOCALES } from "@/state/locale";
import { useSession, roleHome, setupIncomplete } from "@/state/session";
import { useOnline } from "@/state/offline";
import { useToast } from "@/state/toast";
import { AuthChrome } from "@/ui/Chrome";
import { Button, EmptyState, Field } from "@/ui/primitives";
import { formatPhone } from "@/format";
import type { Country } from "@/types/domain";

export { SplashScreen } from "@/shared/SplashScreen";

export function LanguageScreen() {
  const { t, locale, setLocale } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const [pick, setPick] = useState(locale);
  return (
    <AuthChrome>
      <h2>{t("language")}</h2>
      {LOCALES.map((l) => (
        <label key={l.id} className="checkbox">
          <input type="radio" name="loc" checked={pick === l.id} onChange={() => { setPick(l.id); setLocale(l.id); }} />
          <span>
            {l.endonym} · {l.english}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label={l.sample}
            onClick={() => {
              const u = new SpeechSynthesisUtterance(l.sample);
              window.speechSynthesis.speak(u);
            }}
          >
            🔊
          </button>
        </label>
      ))}
      <Button
        onClick={() => {
          setLocale(pick);
          if (user) void ops.updateUserProfile(user.uid, { locale: pick }).catch(() => undefined);
          nav(-1);
        }}
      >
        {t("save")}
      </Button>
    </AuthChrome>
  );
}

export function LoginScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { sendOtp, google } = useSession();
  const { online } = useOnline();
  const { push } = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    void ops
      .listConfigurationCatalog({ types: "countries" })
      .then((c) => {
        setCountries(c.countries);
        const inCountry = c.countries.find((x) => x.isoCode === "IN") ?? c.countries[0];
        if (inCountry) setCountryId(inCountry.id);
      })
      .catch(() => {
        setCountries([
          {
            id: "IN",
            name: "India",
            isoCode: "IN",
            mobilePrefix: "+91",
            phoneNumberLength: 10,
            currencyCode: "INR",
            currencySymbol: "₹",
            timezone: "Asia/Kolkata",
            status: "active",
          },
        ]);
        setCountryId("IN");
      });
  }, []);

  useEffect(() => {
    recaptchaRef.current = new RecaptchaVerifier(getFirebaseAuth(), "recaptcha-host", { size: "invisible" });
    return () => recaptchaRef.current?.clear();
  }, []);

  const country = countries.find((c) => c.id === countryId);
  const prefix = country?.mobilePrefix ?? "+91";
  const len = country?.phoneNumberLength ?? 10;

  async function onOtp() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== len) {
      setError(`Number must be ${len} digits for ${country?.name ?? "this country"}`);
      return;
    }
    setBusy(true);
    try {
      if (!recaptchaRef.current) throw new Error("recaptcha");
      await sendOtp(`${prefix}${digits}`, recaptchaRef.current);
      nav("/login/verify");
    } catch (e) {
      push((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthChrome speakText={`${t("appName")}. ${t("sendOtp")}. ${t("google")}`}>
      <div className="hero" style={{ paddingBottom: 16 }}>
        <h1>{t("loginTitle")}</h1>
        <p className="muted">{t("tagline")}</p>
      </div>
      <Field label={t("country")}>
        <button type="button" className="btn btn-secondary" onClick={() => nav("/language")}>
          {country ? `${country.name} (${country.mobilePrefix})` : "…"} ▾
        </button>
        <select
          value={countryId}
          onChange={(e) => setCountryId(e.target.value)}
          style={{ marginTop: 8, minHeight: 48, width: "100%" }}
        >
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.mobilePrefix})
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("mobile")} error={error}>
        <div style={{ display: "flex", gap: 8 }}>
          <input readOnly value={prefix} style={{ width: 72 }} />
          <input
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            maxLength={len + 2}
          />
        </div>
      </Field>
      <Button loading={busy} disabled={!online} onClick={() => void onOtp()}>
        {t("sendOtp")}
      </Button>
      <p className="muted" style={{ textAlign: "center", margin: "16px 0" }}>
        ─── {t("or")} ───
      </p>
      <Button variant="secondary" disabled={!online} onClick={() => void google().catch((e) => push(e.message))}>
        {t("google")}
      </Button>
      <p className="muted" style={{ textAlign: "center", marginTop: 24 }}>
        {t("supplierHint")}
      </p>
      <div id="recaptcha-host" />
    </AuthChrome>
  );
}

export function OtpScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { pendingPhone, confirmOtp, registerToken } = useSession();
  const { push } = useToast();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [tries, setTries] = useState(0);
  const [cooldown, setCooldown] = useState(30);
  const [busy, setBusy] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const code = digits.join("");

  async function verify() {
    setBusy(true);
    try {
      await confirmOtp(code);
      try {
        await registerToken();
      } catch (tokErr) {
        console.warn("Device token registration non-fatal error:", tokErr);
      }
      nav("/", { replace: true });
    } catch (err: unknown) {
      console.error("OTP verification failed:", err);
      setTries((n) => n + 1);
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError?.code === "auth/invalid-verification-code") {
        push(t("wrongCode", { n: String(tries + 1) }));
      } else if (firebaseError?.code === "auth/code-expired") {
        push("SMS code has expired. Please request a new one.");
      } else {
        push(firebaseError?.message ?? t("wrongCode", { n: String(tries + 1) }));
      }
    } finally {
      setBusy(false);
    }
  }

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      const next = [...digits];
      for (let j = 0; j < cleaned.length && index + j < 6; j++) {
        next[index + j] = cleaned[j]!;
      }
      setDigits(next);
      const targetIndex = Math.min(index + cleaned.length, 5);
      inputsRef.current[targetIndex]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = cleaned.slice(-1);
    setDigits(next);
    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let j = 0; j < pasted.length; j++) {
      next[j] = pasted[j]!;
    }
    setDigits(next);
    const targetIndex = Math.min(pasted.length, 5);
    inputsRef.current[targetIndex]?.focus();
  };

  return (
    <AuthChrome>
      <button type="button" className="btn btn-tertiary" onClick={() => nav("/login")}>
        ← {t("verifyPhone")}
      </button>
      <p>{t("codeSent", { phone: formatPhone(pendingPhone.slice(0, 3), pendingPhone.slice(3)) })}</p>
      <div className="otp-row" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>
      {tries > 0 ? <p className="err">⚠ {t("wrongCode", { n: String(5 - tries) })}</p> : null}
      <Button loading={busy} disabled={code.length < 6} onClick={() => void verify()}>
        {t("verify")}
      </Button>
      <p className="muted" style={{ textAlign: "center" }}>
        {cooldown > 0 ? t("resendIn", { time: `0:${String(cooldown).padStart(2, "0")}` }) : t("resendNow")}
      </p>
    </AuthChrome>
  );
}

export function UnauthorizedScreen() {
  const { t } = useI18n();
  const { profile, logout } = useSession();
  return (
    <AuthChrome>
      <EmptyState
        glyph="🚫"
        title={t("unauthorizedTitle")}
        hint={profile?.suspension?.reason ?? t("unauthorizedBody")}
        action={<Button variant="secondary" onClick={() => void logout()}>{t("logout")}</Button>}
      />
    </AuthChrome>
  );
}

export function RoleChangedScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile, forceRefreshClaims } = useSession();
  useEffect(() => {
    void forceRefreshClaims().then(() => {
      const dest =
        profile?.role === "buyer" && setupIncomplete(profile) ? "/setup" : roleHome(profile?.role ?? "buyer");
      window.setTimeout(() => nav(dest, { replace: true }), 1200);
    });
  }, [forceRefreshClaims, nav, profile]);
  return (
    <AuthChrome>
      <div className="hero">
        <h1>{t("roleChanged")}</h1>
        <p>{t("roleChangedBody")}</p>
      </div>
    </AuthChrome>
  );
}

export function LegalScreen() {
  const { t } = useI18n();
  return (
    <AuthChrome>
      <h2>{t("legal")}</h2>
      <p>{t("terms")}</p>
      <p className="muted">Logikchain processes orders, gigs, and payouts under the constitution privacy rules.</p>
      <p>{t("privacy")}</p>
    </AuthChrome>
  );
}
