"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Shared till field chrome.
 *
 * One soft surface, one focus ring, one min height — so every entry on the
 * register looks like it belongs on the same light till.
 */

// backgroundColor, not the `background` shorthand: the shorthand would reset
// the select's chevron to repeat across the whole field.
const fieldSurface: React.CSSProperties = {
  backgroundColor: "var(--s-panel-alt)",
  borderColor: "var(--s-border)",
  color: "var(--s-ink)",
  boxShadow: "inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent)",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--s-brand)_35%,transparent)] focus-visible:border-[color-mix(in_srgb,var(--s-brand)_55%,var(--s-border))]";

export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: "var(--s-ink-faint)" }}
      >
        {children}
      </label>
      {hint && (
        <span className="text-[11px] font-medium" style={{ color: "var(--s-ink-faint)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export const FieldInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function FieldInput({ className = "", invalid, style, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full min-h-12 rounded-2xl border px-3.5 py-3 text-sm font-medium outline-none transition-[box-shadow,border-color] ${focusRing} ${className}`}
        style={{
          ...fieldSurface,
          borderColor: invalid ? "var(--s-warn)" : fieldSurface.borderColor,
          ...style,
        }}
        {...props}
      />
    );
  },
);

export const FieldSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function FieldSelect({ className = "", style, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={`w-full min-h-12 appearance-none rounded-2xl border px-3.5 py-3 pr-10 text-sm font-semibold outline-none transition-[box-shadow,border-color] ${focusRing} ${className}`}
        style={{
          ...fieldSurface,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.9rem center",
          backgroundSize: "1rem",
          ...style,
        }}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export const FieldTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function FieldTextarea({ className = "", invalid, style, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-2xl border px-3.5 py-3 text-sm font-medium outline-none transition-[box-shadow,border-color] ${focusRing} ${className}`}
        style={{
          ...fieldSurface,
          borderColor: invalid ? "var(--s-warn)" : fieldSurface.borderColor,
          ...style,
        }}
        {...props}
      />
    );
  },
);

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-2xl p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        background: "var(--s-panel-alt)",
        boxShadow: "inset 0 0 0 1px var(--s-border)",
      }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-colors"
            style={{
              background: active ? "var(--s-panel)" : "transparent",
              color: active ? "var(--s-ink)" : "var(--s-ink-muted)",
              boxShadow: active ? "var(--s-shadow)" : undefined,
            }}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
