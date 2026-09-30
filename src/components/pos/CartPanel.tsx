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
  customerName: string;
  customerPhone: string;
  onCustomerName: (value: string) => void;
  onCustomerPhone: (value: string) => void;
  onClear: () => void;
  onCharge: () => void;
  tables?: { id: string; label: string; area: string; occupied: boolean }[];
  tableId?: string;
  onTable?: (id: string) => void;
}) {
  const empty = cart.lines.length === 0;

  return (
    <aside
      className="hidden lg:flex flex-col"
      style={{ background: "var(--s-bg)" }}
    >
      <div className="m-3 mb-0 flex items-center justify-between rounded-[1.25rem] px-4 py-3 s-card">
        <h2 className="font-extrabold tracking-tight">This order</h2>
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

      <div className="mx-3 mt-3 rounded-[1.25rem] px-4 py-3 s-card">
        <TablePicker tables={tables} tableId={tableId} onTable={onTable} />
        <div className="mt-3">
        <CustomerFields
          name={customerName}
          phone={customerPhone}
          onName={onCustomerName}
          onPhone={onCustomerPhone}
        />
        </div>
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
        <div className="m-3 mt-0 rounded-[1.25rem] px-4 py-4 s-card">
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

function TablePicker({
  tables,
  tableId,
  onTable,
}: {
  tables: { id: string; label: string; area: string; occupied: boolean }[];
  tableId: string;
  onTable?: (id: string) => void;
}) {
  if (tables.length === 0) return null;
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--s-ink-faint)" }}>
        Table
      </span>
      <select
        value={tableId}
        onChange={(event) => onTable?.(event.target.value)}
        className="w-full rounded-2xl px-3 py-2.5 text-sm font-semibold outline-none min-h-12"
        style={{ background: "var(--s-panel-alt)", color: "var(--s-ink)" }}
      >
        <option value="">Takeaway / no table</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id} disabled={table.occupied && table.id !== tableId}>
            {table.area} · {table.label}
            {table.occupied ? " (in use)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
