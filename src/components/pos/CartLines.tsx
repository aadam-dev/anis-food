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
 * they just rang before punching a bulk quantity. Tapping the number opens the
 * quantity sheet — the al-boyut pattern for orders of 50 without fifty taps.
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
      <FocusedLine line={focused} dispatch={dispatch} onEditQty={onEditQty} />

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
                    className="h-12 w-12 shrink-0 rounded-xl overflow-hidden"
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
              <div className="mt-2 flex items-center gap-2" style={{ paddingLeft: "3.75rem" }}>
                <QtyStepper
                  name={line.name}
                  quantity={line.quantity}
                  size="sm"
                  onDec={() => dispatch({ type: "decrement", menuItemId: line.menuItemId })}
                  onInc={() => dispatch({ type: "increment", menuItemId: line.menuItemId })}
                  onEdit={() => onEditQty?.(line)}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: "remove", menuItemId: line.menuItemId })}
                  className="ml-auto h-11 w-11 grid place-items-center rounded-xl"
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
        className="overflow-hidden rounded-[1.35rem]"
        style={{
          background: "var(--s-panel-alt)",
          boxShadow: "inset 0 0 0 1px var(--s-border)",
        }}
      >
        <DishThumb
          name={line.name}
          imageUrl={line.imageUrl}
          className="w-full aspect-[4/3]"
          letterClassName="text-5xl"
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold leading-snug text-base">{line.name}</p>
              <p className="money mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {formatGHS(line.unitPrice)} each
              </p>
            </div>
            <span className="money text-base font-bold whitespace-nowrap">
              {formatGHS(line.unitPrice * line.quantity)}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <QtyStepper
              name={line.name}
              quantity={line.quantity}
              size="lg"
              onDec={() => dispatch({ type: "decrement", menuItemId: line.menuItemId })}
              onInc={() => dispatch({ type: "increment", menuItemId: line.menuItemId })}
              onEdit={() => onEditQty?.(line)}
            />
            <button
              type="button"
              onClick={() => dispatch({ type: "remove", menuItemId: line.menuItemId })}
              className="h-12 w-12 grid place-items-center rounded-2xl"
              style={{ color: "var(--s-ink-faint)" }}
              aria-label={`Remove ${line.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] font-medium" style={{ color: "var(--s-ink-faint)" }}>
            Tap the number to type a bulk quantity
          </p>
        </div>
      </div>
    </div>
  );
}

function QtyStepper({
  name,
  quantity,
  size,
  onDec,
  onInc,
  onEdit,
}: {
  name: string;
  quantity: number;
  size: "sm" | "lg";
  onDec: () => void;
  onInc: () => void;
  onEdit: () => void;
}) {
  const btn =
    size === "lg"
      ? "h-12 w-12 rounded-2xl"
      : "h-11 w-11 rounded-xl";
  const qty =
    size === "lg"
      ? "flex-1 min-h-12 rounded-2xl text-2xl"
      : "min-w-12 min-h-11 rounded-xl text-base px-2";

  return (
    <>
      <button
        type="button"
        onClick={onDec}
        className={`${btn} grid place-items-center active:scale-[0.96] transition-transform`}
        style={{ background: "var(--s-panel)", boxShadow: "inset 0 0 0 1px var(--s-border)" }}
        aria-label={`One less ${name}`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className={`money ${qty} font-bold text-center active:scale-[0.98] transition-transform`}
        style={{
          background: "color-mix(in srgb, var(--s-brand) 12%, var(--s-panel))",
          boxShadow: "inset 0 0 0 1.5px color-mix(in srgb, var(--s-brand) 55%, var(--s-border))",
          color: "var(--s-ink)",
        }}
        aria-label={`Type quantity for ${name}`}
      >
        {quantity}
      </button>
      <button
        type="button"
        onClick={onInc}
        className={`${btn} grid place-items-center active:scale-[0.96] transition-transform`}
        style={{ background: "var(--s-panel)", boxShadow: "inset 0 0 0 1px var(--s-border)" }}
        aria-label={`One more ${name}`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </>
  );
}
