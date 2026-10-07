"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FINANCIAL_TERM_NOTES } from "@/lib/financial-notes";

/**
 * Shared pieces for the back office. Soft cards, one type, one radius — the same
 * materials as the till, so a payroll screen never looks like a different product.
 * Colours come from the surface tokens so the light/dark switch still works.
 *
 * Icons are passed as elements (`icon={<Wallet />}`), not components, because
 * server pages render these and a component cannot cross that boundary.
 */

export type Tone = "neutral" | "good" | "bad" | "warn" | "brand" | "accent";

const TONE_INK: Record<Tone, string> = {
  neutral: "var(--s-ink-muted)",
  good: "var(--s-good)",
  bad: "var(--s-bad)",
  warn: "var(--s-warn)",
  brand: "var(--s-brand)",
  accent: "var(--s-accent)",
};

const TONE_SOFT: Record<Tone, string> = {
  neutral: "var(--s-sunk)",
  good: "var(--s-good-soft)",
  bad: "var(--s-bad-soft)",
  warn: "var(--s-warn-soft)",
  brand: "var(--s-brand-soft)",
  accent: "var(--s-accent-soft)",
};

// ---------------------------------------------------------------------------
// Page furniture
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: React.ReactNode;
  /** Small label above the title: the section and period, e.g. "Money · This month". */
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {eyebrow && (
          <p
            className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--s-brand)" }}
          >
            {eyebrow}
          </p>
        )}
        <h1 className="text-[1.65rem] font-extrabold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--s-ink-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  children,
  className,
  title,
  explainer,
  action,
  padded = false,
  bodyClassName,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  /** Plain-English note under the heading. Accounting words need translating. */
  explainer?: React.ReactNode;
  /** Small control at the right of the title row: a link, a count. */
  action?: React.ReactNode;
  /** Pad the body. Off by default so tables and lists run edge to edge. */
  padded?: boolean;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("s-card", className)}>
      {(title || explainer || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-bold">{title}</h2>}
            {explainer && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {explainer}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 text-sm">{action}</div>}
        </header>
      )}
      {padded ? (
        <div
          className={cn(
            "px-4 pb-4 sm:px-5 sm:pb-5",
            !(title || explainer || action) && "pt-4 sm:pt-5",
            bodyClassName,
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** "See all →" style link for a Panel's action slot. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold hover:underline" style={{ color: "var(--s-brand)" }}>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** Change badge: ▲ 12% / ▼ 4%. `value` is a fraction (0.12). `invert` for costs. */
export function Delta({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold"
      style={{
        color: good ? "var(--s-good)" : "var(--s-bad)",
        background: good ? "var(--s-good-soft)" : "var(--s-bad-soft)",
      }}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(Math.round(value * 100))}%
    </span>
  );
}

export function Stat({
  label,
  value,
  detail,
  icon,
  tint = "neutral",
  delta,
  invertDelta,
  href,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  tint?: Tone;
  /** Change against the comparison period, as a fraction. */
  delta?: number | null;
  invertDelta?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--s-ink-muted)" }}>
          {label}
        </p>
        {icon && (
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl [&>svg]:h-5 [&>svg]:w-5"
            style={{ background: TONE_SOFT[tint], color: TONE_INK[tint] }}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <p className="money text-[1.75rem] font-extrabold leading-tight tracking-tight">{value}</p>
        {delta !== undefined && <Delta value={delta} invert={invertDelta} />}
      </div>
      {detail && (
        <div className="mt-1.5 text-xs font-medium" style={{ color: "var(--s-ink-faint)" }}>
          {detail}
        </div>
      )}
    </>
  );
  return href ? (
    <Link href={href} className="s-card block p-5 transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    <section className="s-card p-5">{body}</section>
  );
}

/** One line of a statement: label on the left, money on the right. */
export function StatementRow({
  label,
  value,
  compare,
  strong,
  indent,
  tone,
  border,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  /** A second figure, usually the previous period, shown faint. */
  compare?: React.ReactNode;
  strong?: boolean;
  indent?: boolean;
  tone?: Tone;
  border?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm sm:px-5",
        border && "border-t",
        strong && "font-bold",
      )}
      style={{ borderColor: "var(--s-border)" }}
    >
      <span
        className={cn("min-w-0", indent && "pl-4")}
        style={{ color: strong ? "var(--s-ink)" : "var(--s-ink-muted)" }}
      >
        {label}
      </span>
      <span className="flex items-baseline gap-4 whitespace-nowrap">
        {compare !== undefined && (
          <span className="money hidden w-28 text-right text-xs sm:inline" style={{ color: "var(--s-ink-faint)" }}>
            {compare}
          </span>
        )}
        <span className="money w-28 text-right" style={{ color: tone ? TONE_INK[tone] : "var(--s-ink)" }}>
          {value}
        </span>
      </span>
    </div>
  );
}

/** A labelled bar for "share of total" lists: payment mix, categories, items. */
export function ShareBar({
  label,
  value,
  share,
  sub,
  tone = "brand",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  share: number;
  sub?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">
          {label}
          {sub && (
            <span className="ml-1.5 text-xs" style={{ color: "var(--s-ink-faint)" }}>
              {sub}
            </span>
          )}
        </span>
        <span className="money whitespace-nowrap font-semibold">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--s-sunk)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, Math.min(100, share * 100))}%`, background: TONE_INK[tone] }}
        />
      </div>
    </div>
  );
}

/** A term with its plain-English note one tap away. Keys come from financial-notes. */
export function Term({ name, children }: { name: string; children: React.ReactNode }) {
  const note = FINANCIAL_TERM_NOTES[name];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!note) return <>{children}</>;
  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex !min-h-0 h-5 w-5 items-center justify-center rounded-full"
        style={{ color: "var(--s-ink-faint)" }}
        aria-label="What does this mean?"
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-2xl border p-3 text-xs font-normal leading-relaxed"
          style={{
            background: "var(--s-panel)",
            borderColor: "var(--s-border)",
            color: "var(--s-ink)",
            boxShadow: "0 12px 30px -8px rgb(0 0 0 / 0.2)",
          }}
        >
          {note}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function AdminButton({
  variant = "secondary",
  loading,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
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
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent px-4 py-2.5 text-sm font-bold",
        "min-h-12 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform",
        className,
      )}
      style={{ ...styles[variant], ...props.style }}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Pill tabs. Links when `href` is given (server-driven tabs), buttons otherwise. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: React.ReactNode; href?: string; count?: number }[];
  value: T;
  onChange?: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1", className)}
      style={{ background: "var(--s-sunk)" }}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        const cls =
          "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold !min-h-10";
        const style: React.CSSProperties = active
          ? { background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "var(--s-shadow)" }
          : { color: "var(--s-ink-muted)" };
        const inner = (
          <>
            {option.label}
            {option.count !== undefined && (
              <span
                className="money rounded-full px-1.5 text-xs"
                style={{ background: active ? "var(--s-sunk)" : "transparent", color: "var(--s-ink-faint)" }}
              >
                {option.count}
              </span>
            )}
          </>
        );
        return option.href ? (
          <Link key={option.value} href={option.href} role="tab" aria-selected={active} className={cls} style={style}>
            {inner}
          </Link>
        ) : (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(option.value)}
            className={cls}
            style={style}
          >
            {inner}
          </button>
        );
      })}
    </div>
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
  // backgroundColor, not `background`: the shorthand would wipe any chevron
  // or icon a field sets with background-image.
  backgroundColor: "var(--s-panel-alt)",
  borderColor: "var(--s-border)",
  color: "var(--s-ink)",
};

export const inputClass =
  "w-full rounded-2xl border px-3.5 py-2.5 outline-none min-h-12";

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      {icon && (
        <span
          className="mb-3 grid h-11 w-11 place-items-center rounded-2xl [&>svg]:h-5 [&>svg]:w-5"
          style={{ background: "var(--s-sunk)", color: "var(--s-ink-faint)" }}
        >
          {icon}
        </span>
      )}
      <p className="font-medium">{title}</p>
      {hint && (
        <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--s-ink-muted)" }}>
          {hint}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ color: TONE_INK[tone], background: TONE_SOFT[tone] }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

/** A modal: bottom sheet on a phone, centred card on a desk. */
export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <div
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
        style={{ background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "0 24px 60px -12px rgb(0 0 0 / 0.35)" }}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 grid h-10 w-10 place-items-center rounded-xl"
            style={{ color: "var(--s-ink-muted)" }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <footer
            className="flex flex-wrap justify-end gap-2 border-t px-5 py-3"
            style={{ borderColor: "var(--s-border)", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/** "Are you sure?" for anything that cannot be undone. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={onConfirm} loading={busy} style={{ background: "var(--s-bad)" }}>
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
        {message}
      </p>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** Scroll-safe table styled by `.admin-table`; mark money cells `className="num"`. */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("admin-table", className)}>{children}</table>
    </div>
  );
}
