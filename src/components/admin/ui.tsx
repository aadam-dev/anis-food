"use client";

import { cn } from "@/lib/utils";

/**
 * Small shared pieces for the back office. Deliberately plain: the value here is
 * consistency, not cleverness. Every one reads its colours from the surface
 * tokens so the light/dark switch in Settings works everywhere at once.
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
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
    <section
      className={cn("rounded-xl border", className)}
      style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
    >
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
    primary: { background: "var(--s-brand)", color: "#fff" },
    secondary: {
      background: "var(--s-panel-alt)",
      color: "var(--s-ink)",
      borderColor: "var(--s-border-strong)",
    },
    ghost: { background: "transparent", color: "var(--s-ink-muted)" },
    danger: { background: "transparent", color: "var(--s-bad)" },
  };

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-3.5 py-2 text-sm font-semibold",
        "min-h-11 disabled:opacity-50 disabled:cursor-not-allowed",
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
  "w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 min-h-11";

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
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: colors[tone], background: "var(--s-hover)" }}
    >
      {children}
    </span>
  );
}
