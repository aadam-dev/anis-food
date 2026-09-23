"use client";

import { Minus, Plus } from "lucide-react";
import { GHS_DENOMINATIONS, countedTotal, type DenominationCount } from "@/lib/cash";
import { formatGHS } from "@/lib/money";

/**
 * Counting the drawer, note by note.
 *
 * Asking for a single total invites arithmetic done in someone's head at the end
 * of a twelve-hour shift. Counting by denomination is what people physically do
 * anyway, and it leaves a breakdown worth looking at when a drawer is short.
 *
 * Plus and minus sit beside each row so a count can be punched, not only typed.
 */
export default function DenominationCounter({
  counts,
  onChange,
}: {
  counts: DenominationCount;
  onChange: (counts: DenominationCount) => void;
}) {
  const total = countedTotal(counts);

  function set(denomination: number, value: number) {
    const next = { ...counts };
    const quantity = Math.max(0, Math.trunc(value));
    if (quantity === 0) delete next[String(denomination)];
    else next[String(denomination)] = quantity;
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GHS_DENOMINATIONS.map((denomination) => {
          const quantity = counts[String(denomination)] ?? 0;
          return (
            <div
              key={denomination}
              className="flex items-center gap-2 rounded-lg border px-2 py-2"
              style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
            >
              <span className="money w-12 shrink-0 text-sm font-semibold">
                {denomination >= 1 ? denomination : denomination.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() => set(denomination, quantity - 1)}
                disabled={quantity === 0}
                className="h-10 w-10 shrink-0 grid place-items-center rounded-lg border disabled:opacity-40"
                style={{ borderColor: "var(--s-border)", background: "var(--s-panel)" }}
                aria-label={`One less GH₵${denomination}`}
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={quantity === 0 ? "" : quantity}
                onChange={(event) =>
                  set(denomination, Number(event.target.value.replace(/\D/g, "")) || 0)
                }
                placeholder="0"
                aria-label={`How many GH₵${denomination} notes or coins`}
                className="money w-full min-w-0 bg-transparent text-center outline-none"
                style={{ color: "var(--s-ink)" }}
              />
              <button
                type="button"
                onClick={() => set(denomination, quantity + 1)}
                className="h-10 w-10 shrink-0 grid place-items-center rounded-lg border"
                style={{ borderColor: "var(--s-border)", background: "var(--s-panel)" }}
                aria-label={`One more GH₵${denomination}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <span
                className="money w-14 shrink-0 text-right text-xs"
                style={{ color: "var(--s-ink-faint)" }}
              >
                {quantity > 0 ? (denomination * quantity).toFixed(2) : ""}
              </span>
            </div>
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
