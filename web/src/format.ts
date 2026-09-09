/** Locale formatting — Foundations.md §10. Never hard-code ₹. */

const IST = "Asia/Kolkata";

export function formatMoney(
  amount: number,
  currencySymbol = "₹",
  opts: { invoice?: boolean } = {},
): string {
  const hidePaise = !opts.invoice && Number.isInteger(amount);
  const n = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hidePaise ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currencySymbol}${n}`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, day] = iso.split("-");
      return `${day}-${m}-${y}`;
    }
    return iso;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;
  return `${day}-${month}-${year}`;
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatPhone(prefix: string, national: string): string {
  const digits = national.replace(/\D/g, "");
  if (digits.length === 10) return `${prefix} ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return `${prefix} ${digits}`;
}

export function formatPickupCode(code: string): string {
  return code.replace(/\s/g, "").split("").join(" ");
}

export function formatVehicle(n: string): string {
  return n.toUpperCase();
}

export function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", hour12: false }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function distanceKm(metres: number): string {
  const km = metres / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function newIdempotencyKey(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
