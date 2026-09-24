"use client";

import { formatGHS, type OrderTotals } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";
import type { CartLine } from "./types";
import CartLines from "./CartLines";
import CustomerFields from "./CustomerFields";
import Button from "./ui/Button";

export default function CartPanel({
  cart,
  totals,
  dispatch,
  focusedMenuItemId,
  onFocus,
  onEditQty,
  customerName,
  customerPhone,
  onCustomerName,
  onCustomerPhone,
  onClear,
  onCharge,
  locked = false,
}: {
  locked?: boolean;
  cart: CartState;
  totals: OrderTotals;
  dispatch: React.Dispatch<CartAction>;
  focusedMenuItemId?: string | null;
  onFocus?: (menuItemId: string) => void;
  onEditQty?: (line: CartLine) => void;
  customerName: string;
  customerPhone: string;
  onCustomerName: (value: string) => void;
  onCustomerPhone: (value: string) => void;
  onClear: () => void;
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
            onClick={onClear}
            className="text-sm font-medium"
            style={{ color: "var(--s-ink-muted)" }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--s-border)" }}>
        <CustomerFields
          name={customerName}
          phone={customerPhone}
          onName={onCustomerName}
          onPhone={onCustomerPhone}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <CartLines
          cart={cart}
          dispatch={dispatch}
          focusedMenuItemId={focusedMenuItemId}
          onFocus={onFocus}
          onEditQty={onEditQty}
        />
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
          <Button size="lg" className="w-full" onClick={onCharge} disabled={locked}>
            {locked ? "Close the old shift first" : `Charge ${formatGHS(totals.total)}`}
          </Button>
        </div>
      )}
    </aside>
  );
}
