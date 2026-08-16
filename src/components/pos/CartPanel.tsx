"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatGHS, type OrderTotals } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";

export default function CartPanel({
  cart,
  totals,
  dispatch,
  onCharge,
}: {
  cart: CartState;
  totals: OrderTotals;
  dispatch: React.Dispatch<CartAction>;
  onCharge: () => void;
}) {
  const empty = cart.lines.length === 0;

  return (
    <aside
      className="hidden lg:flex flex-col border-l"
      style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--s-border)" }}>
        <h2 className="font-semibold">This order</h2>
        {!empty && (
          <button
            onClick={() => dispatch({ type: "clear" })}
            className="text-sm"
            style={{ color: "var(--s-ink-muted)" }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {empty ? (
          <p className="px-4 py-12 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
            Tap a dish to start.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {cart.lines.map((line) => (
              <li key={line.menuItemId} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">{line.name}</span>
                  <span className="money text-sm font-semibold whitespace-nowrap">
                    {formatGHS(line.unitPrice * line.quantity)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => dispatch({ type: "decrement", menuItemId: line.menuItemId })}
                    className="h-9 w-9 grid place-items-center rounded-lg border"
                    style={{ borderColor: "var(--s-border)" }}
                    aria-label={`One less ${line.name}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="money w-8 text-center font-semibold">{line.quantity}</span>
                  <button
                    onClick={() => dispatch({ type: "increment", menuItemId: line.menuItemId })}
                    className="h-9 w-9 grid place-items-center rounded-lg border"
                    style={{ borderColor: "var(--s-border)" }}
                    aria-label={`One more ${line.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => dispatch({ type: "remove", menuItemId: line.menuItemId })}
                    className="ml-auto h-9 w-9 grid place-items-center rounded-lg"
                    style={{ color: "var(--s-ink-faint)" }}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!empty && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--s-border)" }}>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-sm mb-1" style={{ color: "var(--s-ink-muted)" }}>
              <span>Discount</span>
              <span className="money">-{formatGHS(totals.discountAmount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-semibold">Total</span>
            <span className="money text-2xl font-bold">{formatGHS(totals.total)}</span>
          </div>
          <button
            onClick={onCharge}
            className="w-full rounded-xl px-4 py-3.5 font-bold text-white"
            style={{ background: "var(--s-brand)" }}
          >
            Charge {formatGHS(totals.total)}
          </button>
        </div>
      )}
    </aside>
  );
}
