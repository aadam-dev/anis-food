"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatGHS } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";
import type { CartLine } from "./types";
import DishThumb from "./DishThumb";

/**
 * The list of what is in the order, with the controls to change it: quantity up
 * and down, and remove. Shared by the desktop cart rail and the mobile cart
 * sheet so a cashier on a phone gets exactly the same controls as one on a
 * tablet — a mis-tapped dish is always recoverable, on any screen.
 *
 * The focused line gets a large photo so the cashier can confirm which dish
 * they just rang before punching a bulk quantity.
 */
export default function CartLines({
  cart,
  dispatch,
  focusedMenuItemId,
  onFocus,
  onEditQty,
}: {
  cart: CartState;
  dispatch: React.Dispatch<CartAction>;
  focusedMenuItemId?: string | null;
  onFocus?: (menuItemId: string) => void;
  onEditQty?: (line: CartLine) => void;
}) {
  if (cart.lines.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
        Tap a dish to start.
      </p>
    );
  }

  const focused =
    cart.lines.find((line) => line.menuItemId === focusedMenuItemId) ?? cart.lines[cart.lines.length - 1];
  const others = cart.lines.filter((line) => line.menuItemId !== focused.menuItemId);

  return (
    <div>
      <FocusedLine
        line={focused}
        dispatch={dispatch}
        onEditQty={onEditQty}
      />

      {others.length > 0 && (
        <ul className="divide-y border-t" style={{ borderColor: "var(--s-border)" }}>
          {others.map((line) => (
            <li key={line.menuItemId} className="px-4 py-3">
              <button
                type="button"
                onClick={() => onFocus?.(line.menuItemId)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <DishThumb
                    name={line.name}
                    imageUrl={line.imageUrl}
                    className="h-12 w-12 shrink-0 rounded-lg overflow-hidden"
                    letterClassName="text-base"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">{line.name}</span>
                      <span className="money text-sm font-semibold whitespace-nowrap">
                        {formatGHS(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
              <div className="mt-2 flex items-center gap-2 pl-15" style={{ paddingLeft: "3.75rem" }}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "decrement", menuItemId: line.menuItemId })}
                  className="h-11 w-11 grid place-items-center rounded-lg border"
                  style={{ borderColor: "var(--s-border)" }}
                  aria-label={`One less ${line.name}`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEditQty?.(line)}
                  className="money min-w-10 px-2 text-center font-semibold"
                  aria-label={`Set quantity for ${line.name}`}
                >
                  {line.quantity}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "increment", menuItemId: line.menuItemId })}
                  className="h-11 w-11 grid place-items-center rounded-lg border"
                  style={{ borderColor: "var(--s-border)" }}
                  aria-label={`One more ${line.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "remove", menuItemId: line.menuItemId })}
                  className="ml-auto h-11 w-11 grid place-items-center rounded-lg"
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
  );
}

function FocusedLine({
  line,
  dispatch,
  onEditQty,
}: {
  line: CartLine;
  dispatch: React.Dispatch<CartAction>;
  onEditQty?: (line: CartLine) => void;
}) {
  return (
    <div className="px-4 py-4">
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
      >
        <DishThumb
          name={line.name}
          imageUrl={line.imageUrl}
          className="w-full aspect-[4/3]"
          letterClassName="text-5xl"
        />
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{line.name}</p>
              <p className="money mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {formatGHS(line.unitPrice)} each
              </p>
            </div>
            <span className="money text-sm font-bold whitespace-nowrap">
              {formatGHS(line.unitPrice * line.quantity)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "decrement", menuItemId: line.menuItemId })}
              className="h-12 w-12 grid place-items-center rounded-xl border"
              style={{ borderColor: "var(--s-border)", background: "var(--s-panel)" }}
              aria-label={`One less ${line.name}`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onEditQty?.(line)}
              className="money flex-1 rounded-xl border py-3 text-center text-2xl font-bold"
              style={{
                borderColor: "var(--s-brand)",
                background: "var(--s-panel)",
                color: "var(--s-ink)",
              }}
              aria-label={`Set quantity for ${line.name}`}
            >
              {line.quantity}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "increment", menuItemId: line.menuItemId })}
              className="h-12 w-12 grid place-items-center rounded-xl border"
              style={{ borderColor: "var(--s-border)", background: "var(--s-panel)" }}
              aria-label={`One more ${line.name}`}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "remove", menuItemId: line.menuItemId })}
              className="h-12 w-12 grid place-items-center rounded-xl"
              style={{ color: "var(--s-ink-faint)" }}
              aria-label={`Remove ${line.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
