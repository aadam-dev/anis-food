"use client";

import { GHS_DENOMINATIONS, countedTotal, type DenominationCount } from "@/lib/cash";
import { formatGHS } from "@/lib/money";

/**
 * Counting the drawer, note by note.
 *
 * Asking for a single total invites arithmetic done in someone's head at the end
 * of a twelve-hour shift. Counting by denomination is what people physically do
 * anyway, and it leaves a breakdown worth looking at when a drawer is short.
 */
export default function DenominationCounter({
  counts,
  onChange,
}: {
  counts: DenominationCount;
  onChange: (counts: DenominationCount) => void;
}) {
  const total = countedTotal(counts);

  function set(denomination: number, raw: string) {
    const value = Math.max(0, Math.trunc(Number(raw) || 0));
    const next = { ...counts };
    if (value === 0) delete next[String(denomination)];
    else next[String(denomination)] = value;
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {GHS_DENOMINATIONS.map((denomination) => {
          const quantity = counts[String(denomination)] ?? 0;
          return (
            <label
              key={denomination}
              className="flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
            >
              <span className="money w-12 text-sm font-semibold">
                {denomination >= 1 ? denomination : denomination.toFixed(1)}
              </span>
              <span className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                ×
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={quantity === 0 ? "" : quantity}
                onChange={(event) => set(denomination, event.target.value.replace(/\D/g, ""))}
                placeholder="0"
                aria-label={`How many GH₵${denomination} notes or coins`}
                className="money w-full min-w-0 bg-transparent text-right outline-none"
                style={{ color: "var(--s-ink)" }}
              />
              <span
                className="money w-16 text-right text-xs"
                style={{ color: "var(--s-ink-faint)" }}
              >
                {quantity > 0 ? (denomination * quantity).toFixed(2) : ""}
              </span>
            </label>
          );
        })}
      </div>

      <div
        className="mt-3 flex items-baseline justify-between rounded-lg px-3 py-2.5"
        style={{ background: "var(--s-hover)" }}
      >
        <span className="font-semibold">Counted</span>
        <span className="money text-xl font-bold">{formatGHS(total)}</span>
      </div>
    </div>
  );
}
