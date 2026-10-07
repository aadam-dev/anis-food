"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";
import { PRESET_LABELS, type Period, type PeriodPreset } from "@/lib/period";
import { AdminButton, inputClass, inputStyle } from "./ui";

/**
 * The one period control for every money screen. Writes `?period=` or
 * `?from=&to=` and keeps any other params (like the report tab) intact.
 */
export default function PeriodPicker({
  period,
  presets = ["today", "yesterday", "week", "month", "last-month"],
}: {
  period: Period;
  presets?: Exclude<PeriodPreset, "custom">[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);

  function go(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["period", "from", "to", "month", "day"]) params.delete(key);
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <div
        className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1"
        style={{ background: "var(--s-sunk)" }}
      >
        {presets.map((preset) => {
          const active = period.preset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => go({ period: preset })}
              className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium min-h-9"
              style={
                active
                  ? { background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "var(--s-shadow)" }
                  : { color: "var(--s-ink-muted)" }
              }
            >
              {PRESET_LABELS[preset]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium min-h-9"
          style={
            period.preset === "custom"
              ? { background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "var(--s-shadow)" }
              : { color: "var(--s-ink-muted)" }
          }
          aria-expanded={open}
        >
          <CalendarDays className="h-4 w-4" />
          {period.preset === "custom" ? period.label : "Custom"}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border p-4"
          style={{
            background: "var(--s-panel)",
            borderColor: "var(--s-border)",
            boxShadow: "0 12px 40px -12px rgb(0 0 0 / 0.3)",
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--s-ink-muted)" }}>
              From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
                className={`${inputClass} mt-1 text-sm`}
                style={inputStyle}
              />
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--s-ink-muted)" }}>
              To
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                className={`${inputClass} mt-1 text-sm`}
                style={inputStyle}
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton
              variant="primary"
              disabled={!from || !to}
              onClick={() => {
                setOpen(false);
                go({ from, to });
              }}
            >
              Show
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}
