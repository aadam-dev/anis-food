"use client";

import { cn } from "@/lib/utils";

/**
 * Shared pieces for the back office. Soft cards, one type, one radius — the same
 * materials as the till, so a payroll screen never looks like a different product.
 * Colours come from the surface tokens so the light/dark switch still works.
 */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-extrabold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  icon,
  tint = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  tint?: "neutral" | "brand" | "good" | "warn" | "accent";
}) {
  const washes: Record<string, string> = {
    neutral: "var(--s-panel-alt)",
    brand: "color-mix(in srgb, var(--s-brand) 14%, white)",
    good: "color-mix(in srgb, var(--s-good) 16%, white)",
    warn: "color-mix(in srgb, var(--s-warn) 18%, white)",
    accent: "color-mix(in srgb, var(--s-accent) 18%, white)",
  };
  const inks: Record<string, string> = {
    neutral: "var(--s-ink-muted)",
    brand: "var(--s-brand)",
    good: "var(--s-good)",
    warn: "var(--s-warn)",
    accent: "var(--s-accent)",
  };
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--s-ink-muted)" }}>
          {label}
        </p>
        {icon && (
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
            style={{ background: washes[tint], color: inks[tint] }}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p className="money mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
      {detail && (
        <div className="mt-1.5 text-xs font-medium" style={{ color: "var(--s-ink-faint)" }}>
          {detail}
        </div>
      )}
    </Panel>
  );
}

export function Panel({
  children,
  className,
  title,
  explainer,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  /** Plain-English note under the heading. Accounting words need translating. */
  explainer?: string;
}) {
  return (
    <section className={cn("s-card", className)}>
      {(title || explainer) && (
        <header className="px-4 pt-4 pb-3 sm:px-5">
          {title && <h2 className="font-semibold">{title}</h2>}
          {explainer && (
            <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
              {explainer}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function AdminButton({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--s-brand)", color: "#fff", borderColor: "transparent" },
    secondary: {
      background: "var(--s-panel)",
      color: "var(--s-ink)",
      borderColor: "var(--s-border)",
      boxShadow: "var(--s-shadow)",
    },
    ghost: { background: "transparent", color: "var(--s-ink-muted)" },
    danger: { background: "transparent", color: "var(--s-bad)" },
  };

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent px-4 py-2.5 text-sm font-bold",
        "min-h-12 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform",
        className,
      )}
      style={{ ...styles[variant], ...props.style }}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs" style={{ color: "var(--s-bad)" }}>
          {error}
        </span>
      ) : (
        hint && (
          <span className="mt-1 block text-xs" style={{ color: "var(--s-ink-faint)" }}>
            {hint}
          </span>
        )
      )}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  background: "var(--s-panel-alt)",
  borderColor: "var(--s-border)",
  color: "var(--s-ink)",
};

export const inputClass =
  "w-full rounded-2xl border px-3.5 py-2.5 outline-none min-h-12";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint && (
        <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "bad" | "warn";
  children: React.ReactNode;
}) {
  const colors = {
    neutral: "var(--s-ink-muted)",
    good: "var(--s-good)",
    bad: "var(--s-bad)",
    warn: "var(--s-warn)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
      style={{
        color: colors[tone],
        background: `color-mix(in srgb, ${colors[tone]} 14%, white)`,
      }}
    >
      {children}
    </span>
  );
}
