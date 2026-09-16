"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatGHS } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";

/**
 * The list of what is in the order, with the controls to change it: quantity up
 * and down, and remove. Shared by the desktop cart rail and the mobile cart
 * sheet so a cashier on a phone gets exactly the same controls as one on a
 * tablet — a mis-tapped dish is always recoverable, on any screen.
 */
export default function CartLines({
  cart,
  dispatch,
}: {
  cart: CartState;
  dispatch: React.Dispatch<CartAction>;
}) {
  if (cart.lines.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
        Tap a dish to start.
      </p>
    );
  }

  return (
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
              className="h-11 w-11 grid place-items-center rounded-lg border"
              style={{ borderColor: "var(--s-border)" }}
              aria-label={`One less ${line.name}`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="money w-8 text-center font-semibold">{line.quantity}</span>
            <button
              onClick={() => dispatch({ type: "increment", menuItemId: line.menuItemId })}
              className="h-11 w-11 grid place-items-center rounded-lg border"
              style={{ borderColor: "var(--s-border)" }}
              aria-label={`One more ${line.name}`}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
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
  );
}
