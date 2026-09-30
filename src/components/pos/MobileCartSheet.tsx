"use client";

import { X } from "lucide-react";
import { formatGHS, type OrderTotals } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";
import type { CartLine } from "./types";
import CartLines from "./CartLines";
import { OrderContextBar, type FulfillmentType } from "./CustomerFields";
import Button from "./ui/Button";

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
  fulfillment,
  onFulfillment,
  customerName,
  customerPhone,
  customerAddress,
  onCustomerName,
  onCustomerPhone,
  onCustomerAddress,
  onClear,
  onHold,
  onClose,
  onCharge,
  selectedIds = [],
  onToggleLine,
  onChargeSelected,
  selectedTotal = null,
  locked = false,
  tables = [],
  tableId = "",
  onTable,
}: {
  locked?: boolean;
  cart: CartState;
  totals: OrderTotals;
  dispatch: React.Dispatch<CartAction>;
  focusedMenuItemId?: string | null;
  onFocus?: (menuItemId: string) => void;
  onEditQty?: (line: CartLine) => void;
  fulfillment: FulfillmentType;
  onFulfillment: (value: FulfillmentType) => void;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  onCustomerName: (value: string) => void;
  onCustomerPhone: (value: string) => void;
  onCustomerAddress: (value: string) => void;
  onClear: () => void;
  onHold?: () => void;
  onClose: () => void;
  onCharge: () => void;
  selectedIds?: string[];
  onToggleLine?: (menuItemId: string) => void;
  onChargeSelected?: () => void;
  selectedTotal?: number | null;
  tables?: { id: string; label: string; area: string; occupied: boolean }[];
  tableId?: string;
  onTable?: (id: string) => void;
}) {
  const empty = cart.lines.length === 0;

  return (
    <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
      <button
        aria-label="Close order"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(26, 29, 31, 0.28)" }}
      />

      <section
        className="relative flex h-[min(92dvh,100%)] max-h-[92dvh] flex-col rounded-t-[1.75rem] sm:h-auto sm:max-h-[90dvh]"
        style={{
          background: "var(--s-panel)",
          boxShadow: "0 -12px 40px rgba(26, 29, 31, 0.12)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--s-border)" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--s-ink-faint)" }}>Step 1 of 2</p>
            <h2 className="font-extrabold">Review order</h2>
          </div>
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

        <div className="border-b px-4 py-3" style={{ borderColor: "var(--s-border)" }}>
          <OrderContextBar
            fulfillment={fulfillment}
            onFulfillment={onFulfillment}
            name={customerName}
            phone={customerPhone}
            address={customerAddress}
            onName={onCustomerName}
            onPhone={onCustomerPhone}
            onAddress={onCustomerAddress}
            tables={tables}
            tableId={tableId}
            onTable={onTable}
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <CartLines
            cart={cart}
            dispatch={dispatch}
            focusedMenuItemId={focusedMenuItemId}
            onFocus={onFocus}
            onEditQty={onEditQty}
            selectedIds={selectedIds}
            onToggle={onToggleLine}
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
            {selectedTotal !== null && onChargeSelected && (
              <Button size="lg" className="mb-2 w-full" onClick={onChargeSelected} disabled={locked}>
                Charge selected {formatGHS(selectedTotal)}
              </Button>
            )}
            {onHold && (
              <Button size="lg" tone="secondary" className="mb-2 w-full" onClick={onHold} disabled={locked}>
                Hold this order
              </Button>
            )}
            <Button
              size="lg"
              tone={selectedTotal !== null ? "secondary" : "primary"}
              className="w-full"
              onClick={onCharge}
              disabled={locked}
            >
              {locked ? "Close the old shift first" : `Continue to payment · ${formatGHS(totals.total)}`}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
