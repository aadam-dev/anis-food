"use client";

import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { formatGHS, type OrderTotals } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";
import type { CartLine } from "./types";
import CartLines from "./CartLines";
import CustomerFields, { type FulfillmentType } from "./CustomerFields";
import Button from "./ui/Button";

export default function CartPanel({
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
  onCharge,
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
  onCharge: () => void;
  tables?: { id: string; label: string; area: string; occupied: boolean }[];
  tableId?: string;
  onTable?: (id: string) => void;
}) {
  const empty = cart.lines.length === 0;

  return (
    <aside
      className="hidden min-h-0 lg:flex flex-col overflow-hidden rounded-[1.5rem]"
      style={{ background: "var(--s-panel)", boxShadow: "var(--s-shadow)" }}
    >
      <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: "var(--s-border)" }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--s-ink-faint)" }}>
            New order bill
          </p>
          <h2 className="font-extrabold tracking-tight">This order</h2>
        </div>
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

      <div className="border-b px-4 py-3" style={{ borderColor: "var(--s-border)" }}>
        <CustomerFields
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
        <div className="border-t px-4 py-4" style={{ borderColor: "var(--s-border)" }}>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-sm mb-1" style={{ color: "var(--s-ink-muted)" }}>
              <span>Discount</span>
              <span className="money">-{formatGHS(totals.discountAmount)}</span>
            </div>
          )}
          <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--s-ink-muted)" }}>
            <span>Subtotal</span>
            <span className="money">{formatGHS(totals.subtotal)}</span>
          </div>
          <div className="mb-3 flex items-baseline justify-between border-t pt-2" style={{ borderColor: "var(--s-border)" }}>
            <span className="font-extrabold" style={{ color: "var(--s-brand)" }}>Total</span>
            <span className="money text-2xl font-extrabold" style={{ color: "var(--s-brand)" }}>{formatGHS(totals.total)}</span>
          </div>
          <p className="mb-2 text-xs font-bold">Payment method</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { icon: Banknote, label: "Cash" },
              { icon: Smartphone, label: "MoMo" },
              { icon: CreditCard, label: "Card" },
            ].map(({ icon: Icon, label }, index) => (
              <span
                key={label}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold"
                style={{
                  background: index === 1 ? "color-mix(in srgb, var(--s-brand) 10%, var(--s-panel))" : "var(--s-panel-alt)",
                  color: index === 1 ? "var(--s-brand)" : "var(--s-ink-muted)",
                  boxShadow: "inset 0 0 0 1px var(--s-border)",
                }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            ))}
          </div>
          <Button size="lg" className="w-full" onClick={onCharge} disabled={locked}>
            {locked ? "Close the old shift first" : `Charge ${formatGHS(totals.total)}`}
          </Button>
        </div>
      )}
    </aside>
  );
}
