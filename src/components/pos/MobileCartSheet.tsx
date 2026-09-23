"use client";

import { X } from "lucide-react";
import { formatGHS, type OrderTotals } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";
import type { CartLine } from "./types";
import CartLines from "./CartLines";
import CustomerFields from "./CustomerFields";

/**
 * The cart, on a phone.
 *
 * The desktop till shows the order in a rail down the side, but a phone has no
 * room for that, so the cashier only ever saw a "Charge" bar — no way to check
 * what they rang up, drop a mis-tap or fix a quantity before taking money. This
 * sheet slides up over the menu and gives a phone cashier the same control a
 * tablet one has, then hands off to payment. It reuses CartLines, so the two
 * screens can never drift apart.
 */
export default function MobileCartSheet({
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
  onClose,
  onCharge,
}: {
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
  onClose: () => void;
  onCharge: () => void;
}) {
  const empty = cart.lines.length === 0;

  return (
    <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
      {/* Tap the dimmed menu behind to go back and keep adding. */}
      <button
        aria-label="Close order"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />

      <section
        className="relative rounded-t-2xl border-t flex flex-col max-h-[85dvh]"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--s-border)" }}
        >
          <h2 className="font-semibold">This order</h2>
          <div className="flex items-center gap-1">
            {!empty && (
              <button
                onClick={onClear}
                className="text-sm px-2 py-1 font-medium"
                style={{ color: "var(--s-ink-muted)" }}
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="h-11 w-11 grid place-items-center rounded-lg"
              style={{ color: "var(--s-ink-muted)" }}
              aria-label="Keep adding"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--s-border)" }}>
          <CustomerFields
            name={customerName}
            phone={customerPhone}
            onName={onCustomerName}
            onPhone={onCustomerPhone}
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <CartLines
            cart={cart}
            dispatch={dispatch}
            focusedMenuItemId={focusedMenuItemId}
            onFocus={onFocus}
            onEditQty={onEditQty}
          />
        </div>

        {!empty && (
          <div
            className="border-t px-4 pt-3"
            style={{
              borderColor: "var(--s-border)",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            {totals.discountAmount > 0 && (
              <div
                className="flex justify-between text-sm mb-1"
                style={{ color: "var(--s-ink-muted)" }}
              >
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
      </section>
    </div>
  );
}
