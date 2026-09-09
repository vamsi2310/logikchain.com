import { useEffect, useState } from "react";
import { subscribePwa, type PwaUpdate } from "@/pwa";
import { useNavigate } from "react-router-dom";
import { where, orderBy } from "firebase/firestore";
import { ops } from "@/api/ops";
import { Col } from "@/data/collections";
import { useQuery } from "@/data/hooks";
import { markNotificationRead } from "@/data/firestore";
import { useI18n, LOCALES } from "@/state/locale";
import { useSession } from "@/state/session";
import { useToast } from "@/state/toast";
import { Chrome } from "@/ui/Chrome";
import { Button, Card, EmptyState, Field, Skeletons } from "@/ui/primitives";
import { Sheet } from "@/ui/overlays";
import { formatDateTime } from "@/format";
import type { Notification } from "@/types/domain";

export function ProfileScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile, logout } = useSession();
  const [out, setOut] = useState(false);
  const rows = [
    { to: "/profile/edit", label: t("editProfile") },
    { to: "/profile/security", label: t("security") },
    { to: "/profile/permissions", label: t("permissions") },
    { to: "/profile/voice", label: t("voice") },
    { to: "/sync", label: t("sync") },
    { to: "/install", label: t("install") },
    { to: "/help", label: t("help") },
    { to: "/legal/terms", label: t("legal") },
  ];
  return (
    <Chrome title={t("profile")} screenId="SHR-07" back>
      <Card>
        <p className="card-title">{profile?.name ?? "—"}</p>
        <p className="muted">{profile?.phone ?? profile?.email}</p>
        <p className="muted">{profile?.role}</p>
      </Card>
      {rows.map((r) => (
        <button key={r.to} type="button" className="list-row" style={{ marginTop: 12 }} onClick={() => nav(r.to)}>
          {r.label} <span style={{ marginLeft: "auto" }}>›</span>
        </button>
      ))}
      <div style={{ marginTop: 24 }}>
        <Button variant="danger" onClick={() => setOut(true)}>
          {t("logout")}
        </Button>
      </div>
      {out ? (
        <Sheet title={t("logout")} onClose={() => setOut(false)} footer={<Button variant="danger" onClick={() => void logout()}>{t("confirm")}</Button>}>
          <p>{t("logoutConfirm")}</p>
        </Sheet>
      ) : null}
    </Chrome>
  );
}

export function EditProfileScreen() {
  const { t } = useI18n();
  const { profile, user, refreshProfile } = useSession();
  const { push } = useToast();
  const [name, setName] = useState(profile?.name ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Chrome title={t("editProfile")} screenId="SHR-07.1" back>
      <Field label={t("name")}>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t("address")}>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Button
        loading={busy}
        onClick={async () => {
          if (!user) return;
          setBusy(true);
          try {
            await ops.updateUserProfile(user.uid, { name, address });
            await refreshProfile();
            push("Saved");
          } catch (e) {
            push((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("save")}
      </Button>
    </Chrome>
  );
}

export function NotificationsScreen() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const { rows, loading, reload } = useQuery<Notification>(
    user ? Col.Notifications : null,
    user ? [where("userId", "==", user.uid), orderBy("createdAt", "desc")] : [],
    [user?.uid],
  );
  return (
    <Chrome title={t("notifications")} screenId="SHR-08" back>
      <button type="button" className="btn btn-tertiary" onClick={() => nav("/notifications/settings")}>
        {t("notificationSettings")}
      </button>
      {loading ? <Skeletons /> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState glyph="🔔" title={t("noNotifications")} hint="" action={<Button variant="secondary" onClick={() => void reload()}>{t("refresh")}</Button>} />
      ) : null}
      {rows.map((n) => (
        <Card
          key={n.id}
          onClick={() => {
            void markNotificationRead(n.id);
            if (n.deepLink) nav(n.deepLink);
          }}
        >
          <p className="card-title">{n.title}</p>
          <p>{n.body}</p>
          <p className="muted">{formatDateTime(n.createdAt)}</p>
        </Card>
      ))}
    </Chrome>
  );
}

export function NotificationSettingsScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  return (
    <Chrome title={t("notificationSettings")} screenId="SHR-08.1" back>
      <p className="muted">Muted categories: {profile?.notificationPrefs?.mutedCategories.join(", ") || "none"}</p>
    </Chrome>
  );
}

export function SecurityScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  return (
    <Chrome title={t("security")} screenId="SHR-09" back>
      <Card>
        <p>Phone {profile?.phone ?? "—"}</p>
        <p>Email {profile?.email ?? "—"}</p>
      </Card>
    </Chrome>
  );
}

export function PermissionsScreen() {
  const { t } = useI18n();
  const { profile, user, refreshProfile } = useSession();
  const [p, setP] = useState(profile?.permissions ?? { location: false, sms: false, audio: true, camera: false });
  return (
    <Chrome title={t("permissions")} screenId="SHR-10" back>
      {(["location", "sms", "audio", "camera"] as const).map((k) => (
        <label key={k} className="checkbox">
          <input
            type="checkbox"
            checked={p[k]}
            onChange={(e) => setP({ ...p, [k]: e.target.checked })}
          />
          {t(`perm${k[0]!.toUpperCase()}${k.slice(1)}` as "permLocation")}
        </label>
      ))}
      <Button
        onClick={async () => {
          if (!user) return;
          await ops.updateUserProfile(user.uid, { permissions: p });
          await refreshProfile();
        }}
      >
        {t("save")}
      </Button>
    </Chrome>
  );
}

export function VoiceScreen() {
  const { t, locale, setLocale } = useI18n();
  const { user } = useSession();
  return (
    <Chrome title={t("voice")} screenId="SHR-11" back>
      {LOCALES.map((l) => (
        <label key={l.id} className="checkbox">
          <input
            type="radio"
            checked={locale === l.id}
            onChange={() => {
              setLocale(l.id);
              if (user) void ops.updateUserProfile(user.uid, { locale: l.id });
            }}
          />
          {l.endonym} · {l.english}
        </label>
      ))}
    </Chrome>
  );
}

export function SyncScreen() {
  const { t } = useI18n();
  return (
    <Chrome title={t("sync")} screenId="SHR-12" back>
      <p className="muted">Queued writes appear here. The PWA does not queue driver custody actions.</p>
      <EmptyState glyph="🔄" title="Nothing waiting" hint="Profile edits sync when you are online." />
    </Chrome>
  );
}

export function InstallScreen() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwa, setPwa] = useState<PwaUpdate>({ needRefresh: false, offlineReady: false, update: () => undefined });
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const unsub = subscribePwa(setPwa);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      unsub();
    };
  }, []);
  return (
    <Chrome title={t("install")} screenId="SHR-13" back>
      <p>Install Logikchain on this phone for pickup codes and offline reads.</p>
      {pwa.needRefresh ? (
        <Card>
          <p className="card-title">Update available</p>
          <p className="muted">A new service worker is waiting. Apply it to refresh the app shell.</p>
          <Button onClick={() => pwa.update()}>Update now</Button>
        </Card>
      ) : null}
      {pwa.offlineReady ? <p className="muted">App shell cached — works offline.</p> : null}
      {prompt ? (
        <Button
          onClick={async () => {
            await prompt.prompt();
            setPrompt(null);
          }}
        >
          Add to Home screen
        </Button>
      ) : (
        <p className="muted">On iPhone: Share → Add to Home Screen.</p>
      )}
    </Chrome>
  );
}

export function HelpScreen() {
  const { t } = useI18n();
  return (
    <Chrome title={t("help")} screenId="SHR-14" back>
      <a className="btn btn-primary" href="tel:+911800000000">
        {t("callSupport")}
      </a>
    </Chrome>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
