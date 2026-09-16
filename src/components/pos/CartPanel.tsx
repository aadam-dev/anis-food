"use client";

import { formatGHS, type OrderTotals } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";
import CartLines from "./CartLines";

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
        <CartLines cart={cart} dispatch={dispatch} />
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
