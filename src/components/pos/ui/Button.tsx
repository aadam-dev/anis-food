"use client";

import { Loader2 } from "lucide-react";

/**
 * Till buttons. Every async action shows a spinner and cannot be tapped twice,
 * because a double tap on "Close shift" or "Take payment" is a real incident.
 */
type Tone = "primary" | "secondary" | "ghost" | "danger";

const TONES: Record<Tone, React.CSSProperties> = {
  primary: { background: "var(--s-brand)", color: "#fff" },
  secondary: {
    background: "var(--s-panel-alt)",
    color: "var(--s-ink)",
    border: "1px solid var(--s-border)",
  },
  ghost: { background: "transparent", color: "var(--s-ink-muted)" },
  danger: {
    background: "color-mix(in srgb, var(--s-bad) 14%, transparent)",
    color: "var(--s-bad)",
    border: "1px solid color-mix(in srgb, var(--s-bad) 40%, transparent)",
  },
};

export default function Button({
  tone = "primary",
  busy = false,
  size = "md",
  className = "",
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  busy?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "min-h-14 px-5 text-base"
      : size === "sm"
        ? "min-h-10 px-3 text-sm"
        : "min-h-12 px-4 text-sm";
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-[transform,opacity] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${sizing} ${className}`}
      style={{ ...TONES[tone], ...rest.style }}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
