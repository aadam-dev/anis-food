import { roundMoney } from "@/lib/money";
import type { CartLine, PosMenuItem } from "./types";

/**
 * Cart state.
 *
 * A reducer rather than scattered useState calls, so every way the cart can
 * change is in one readable list — and so the "clear after a sale" path cannot
 * forget a field.
 */

/** Catering trays need room past a single plate; fat-finger still clamps. */
export const MAX_LINE_QTY = 999;

export type CartAction =
  | { type: "add"; item: PosMenuItem }
  | { type: "setQuantity"; menuItemId: string; quantity: number }
  | { type: "increment"; menuItemId: string }
  | { type: "decrement"; menuItemId: string }
  | { type: "remove"; menuItemId: string }
  | { type: "setNotes"; menuItemId: string; notes: string }
  | { type: "setDiscount"; amount: number }
  | { type: "replace"; lines: CartLine[]; discount?: number }
  | { type: "enrichImages"; byId: Record<string, string | null> }
  | { type: "clear" };

export interface CartState {
  lines: CartLine[];
  discount: number;
}

export const emptyCart: CartState = { lines: [], discount: 0 };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((line) => line.menuItemId === action.item.id);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            line.menuItemId === action.item.id
              ? {
                  ...line,
                  quantity: Math.min(MAX_LINE_QTY, line.quantity + 1),
                  imageUrl: line.imageUrl ?? action.item.imageUrl,
                }
              : line,
          ),
        };
      }
      return {
        ...state,
        lines: [
          ...state.lines,
          {
            menuItemId: action.item.id,
            name: action.item.name,
            unitPrice: action.item.price,
            quantity: 1,
            imageUrl: action.item.imageUrl,
          },
        ],
      };
    }

    case "setQuantity": {
      const quantity = Math.max(0, Math.min(MAX_LINE_QTY, Math.trunc(action.quantity)));
      if (quantity === 0) {
        return {
          ...state,
          lines: state.lines.filter((line) => line.menuItemId !== action.menuItemId),
        };
      }
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.menuItemId === action.menuItemId ? { ...line, quantity } : line,
        ),
      };
    }

    case "increment":
      return cartReducer(state, {
        type: "setQuantity",
        menuItemId: action.menuItemId,
        quantity:
          (state.lines.find((line) => line.menuItemId === action.menuItemId)?.quantity ?? 0) + 1,
      });

    case "decrement":
      return cartReducer(state, {
        type: "setQuantity",
        menuItemId: action.menuItemId,
        quantity:
          (state.lines.find((line) => line.menuItemId === action.menuItemId)?.quantity ?? 0) - 1,
      });

    case "remove":
      return {
        ...state,
        lines: state.lines.filter((line) => line.menuItemId !== action.menuItemId),
      };

    case "setNotes":
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.menuItemId === action.menuItemId ? { ...line, notes: action.notes } : line,
        ),
      };

    case "setDiscount":
      return { ...state, discount: Math.max(0, roundMoney(action.amount)) };

    case "replace":
      return { lines: action.lines, discount: action.discount ?? 0 };

    case "enrichImages":
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.imageUrl !== undefined || !(line.menuItemId in action.byId)
            ? line
            : { ...line, imageUrl: action.byId[line.menuItemId] ?? null },
        ),
      };

    case "clear":
      return emptyCart;
  }
}

/** Total number of items, for the cart badge. */
export function cartCount(state: CartState): number {
  return state.lines.reduce((count, line) => count + line.quantity, 0);
}
