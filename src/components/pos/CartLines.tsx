"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatGHS } from "@/lib/money";
import type { CartAction, CartState } from "./cartReducer";
import type { CartLine } from "./types";
import DishThumb from "./DishThumb";

/**
 * The bill. Compact rows — a small photo, the name, the line total, and a
 * stepper — so a phone and a tablet show the same order. Tapping the number
 * opens the quantity pad (first digit replaces the current count).
 */
export default function CartLines({
  cart,
  dispatch,
  focusedMenuItemId,
  onFocus,
  onEditQty,
  selectedIds,
  onToggle,
}: {
  cart: CartState;
  dispatch: React.Dispatch<CartAction>;
  focusedMenuItemId?: string | null;
  onFocus?: (menuItemId: string) => void;
  onEditQty?: (line: CartLine) => void;
  selectedIds?: string[];
  onToggle?: (menuItemId: string) => void;
}) {
  if (cart.lines.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
        Tap a dish to start.
      </p>
    );
  }

  return (
    <ul className="space-y-2 px-3 py-3">
      {cart.lines.map((line) => {
        const focused = line.key === focusedMenuItemId;
        const selected = selectedIds?.includes(line.key) ?? false;
        return (
          <li
            key={line.key}
            className="rounded-2xl px-3 py-3"
            style={{
              background: focused
                ? "color-mix(in srgb, var(--s-brand) 7%, var(--s-panel))"
                : "var(--s-panel-alt)",
            }}
          >
            {onToggle && (
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(line.key)}
                  aria-label={`Select ${line.name}`}
                />
                {selected ? "On this check" : "Leave on the bill"}
              </label>
            )}
            <button
              type="button"
              onClick={() => onFocus?.(line.key)}
              className="flex w-full items-start gap-3 text-left min-h-0"
            >
              <DishThumb
                name={line.name}
                imageUrl={line.imageUrl}
                className="h-12 w-12 shrink-0 overflow-hidden rounded-xl"
                letterClassName="text-base"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">
                  {line.name}
                  {line.sizeLabel && (
                    <span className="ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ background: "color-mix(in srgb, var(--s-brand) 12%, transparent)", color: "var(--s-brand)" }}>
                      {line.sizeLabel}
                    </span>
                  )}
                </span>
                <span className="money mt-0.5 block text-xs" style={{ color: "var(--s-ink-muted)" }}>
                  {formatGHS(line.unitPrice)} each
                </span>
              </span>
              <span className="money text-sm font-bold whitespace-nowrap">
                {formatGHS(line.unitPrice * line.quantity)}
              </span>
            </button>
            <div className="mt-2.5 flex items-center gap-2 pl-15" style={{ paddingLeft: "3.75rem" }}>
              <button
                type="button"
                onClick={() => dispatch({ type: "decrement", key: line.key })}
                className="grid h-11 w-11 place-items-center rounded-xl"
                style={{ background: "var(--s-panel)", boxShadow: "inset 0 0 0 1px var(--s-border)" }}
                aria-label={`One less ${line.name}`}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onEditQty?.(line)}
                className="money min-h-11 min-w-12 rounded-xl px-3 text-base font-extrabold"
                style={{
                  background: "color-mix(in srgb, var(--s-brand) 10%, var(--s-panel))",
                  boxShadow: "inset 0 0 0 1.5px color-mix(in srgb, var(--s-brand) 45%, var(--s-border))",
                }}
                aria-label={`Type quantity for ${line.name}`}
              >
                {line.quantity}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "increment", key: line.key })}
                className="grid h-11 w-11 place-items-center rounded-xl"
                style={{ background: "var(--s-panel)", boxShadow: "inset 0 0 0 1px var(--s-border)" }}
                aria-label={`One more ${line.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "remove", key: line.key })}
                className="ml-auto grid h-11 w-11 place-items-center rounded-xl"
                style={{ color: "var(--s-ink-faint)" }}
                aria-label={`Remove ${line.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
