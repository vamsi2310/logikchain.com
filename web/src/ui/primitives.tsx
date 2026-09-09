import { type ButtonHTMLAttributes, type ReactNode } from "react";

export function Button({
  variant = "primary",
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "tertiary" | "danger"; loading?: boolean }) {
  return (
    <button className={`btn btn-${variant}`} disabled={rest.disabled || loading} {...rest}>
      {loading ? "…" : children}
    </button>
  );
}

export function Banner({
  kind = "warn",
  children,
  onClick,
}: {
  kind?: "warn" | "danger" | "info";
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={`banner ${kind}`} role="status" onClick={onClick}>
      {children}
    </div>
  );
}

export function Card({
  children,
  onClick,
  stale,
}: {
  children: ReactNode;
  onClick?: () => void;
  stale?: boolean;
}) {
  const inner = (
    <>
      {children}
      {stale ? <span className="chip warn">[cached]</span> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="card" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="card">{inner}</div>;
}

export function EmptyState({
  glyph,
  title,
  hint,
  action,
  secondary,
}: {
  glyph: string;
  title: string;
  hint: string;
  action?: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="glyph" aria-hidden>
        {glyph}
      </div>
      <p className="card-title">{title}</p>
      <p className="muted">{hint}</p>
      {action}
      {secondary ? <div style={{ marginTop: 8 }}>{secondary}</div> : null}
    </div>
  );
}

export function Skeletons({ n = 3 }: { n?: number }) {
  return (
    <div className="stack">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <span className="err">⚠ {error}</span> : null}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { glyph: string; cls: string; word: string }> = {
    placed: { glyph: "•", cls: "info", word: "placed" },
    reached_merchant: { glyph: "🚚", cls: "", word: "reached" },
    reached: { glyph: "🚚", cls: "", word: "reached" },
    delivered: { glyph: "✔", cls: "", word: "delivered" },
    cancelled: { glyph: "✖", cls: "warn", word: "cancelled" },
    suspended: { glyph: "⚠", cls: "warn", word: "suspended" },
    pending: { glyph: "⏳", cls: "warn", word: "pending" },
    paid: { glyph: "✔", cls: "", word: "paid" },
    approved: { glyph: "✔", cls: "", word: "approved" },
    completed: { glyph: "✔", cls: "", word: "completed" },
    failed: { glyph: "✖", cls: "warn", word: "failed" },
    created: { glyph: "•", cls: "info", word: "created" },
    started: { glyph: "🚚", cls: "", word: "started" },
    overdue: { glyph: "!", cls: "warn", word: "overdue" },
    active: { glyph: "✔", cls: "", word: "active" },
  };
  const s = map[status] ?? { glyph: "•", cls: "warn", word: status };
  return (
    <span className={`chip ${s.cls}`}>
      {s.glyph} {s.word}
    </span>
  );
}

export function Stepper({
  value,
  min = 0,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stepper">
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease">
        −
      </button>
      <span className="tabular">{value}</span>
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">
        +
      </button>
    </div>
  );
}

export function Progress({ step, of }: { step: number; of: number }) {
  return (
    <div>
      <div className="progress-bar">
        <span style={{ width: `${(step / of) * 100}%` }} />
      </div>
    </div>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
