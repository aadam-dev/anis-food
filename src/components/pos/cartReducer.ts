import { roundMoney } from "@/lib/money";
import type { CartLine, PosMenuItem, PosMenuSize } from "./types";

/**
 * Cart state.
 *
 * A reducer rather than scattered useState calls, so every way the cart can
 * change is in one readable list — and so the "clear after a sale" path cannot
 * forget a field.
 *
 * Lines are keyed by dish + size, so a Small and a Large jollof are two lines
 * with their own price and quantity.
 */

/** Catering trays need room past a single plate; fat-finger still clamps. */
export const MAX_LINE_QTY = 999;

export function lineKey(menuItemId: string, sizeId?: string | null): string {
  return sizeId ? `${menuItemId}:${sizeId}` : menuItemId;
}

export type CartAction =
  | { type: "add"; item: PosMenuItem; size?: PosMenuSize | null }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "increment"; key: string }
  | { type: "decrement"; key: string }
  | { type: "remove"; key: string }
  | { type: "removeMany"; keys: string[] }
  | { type: "setNotes"; key: string; notes: string }
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
      const size = action.size ?? null;
      const key = lineKey(action.item.id, size?.id);
      const existing = state.lines.find((line) => line.key === key);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            line.key === key
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
            key,
            menuItemId: action.item.id,
            sizeId: size?.id ?? null,
            sizeLabel: size?.label ?? null,
            name: action.item.name,
            unitPrice: size ? size.price : action.item.price,
            quantity: 1,
            imageUrl: action.item.imageUrl,
          },
        ],
      };
    }

    case "setQuantity": {
      const quantity = Math.max(0, Math.min(MAX_LINE_QTY, Math.trunc(action.quantity)));
      if (quantity === 0) {
        return { ...state, lines: state.lines.filter((line) => line.key !== action.key) };
      }
      return {
        ...state,
        lines: state.lines.map((line) => (line.key === action.key ? { ...line, quantity } : line)),
      };
    }

    case "increment":
      return cartReducer(state, {
        type: "setQuantity",
        key: action.key,
        quantity: (state.lines.find((line) => line.key === action.key)?.quantity ?? 0) + 1,
      });

    case "decrement":
      return cartReducer(state, {
        type: "setQuantity",
        key: action.key,
        quantity: (state.lines.find((line) => line.key === action.key)?.quantity ?? 0) - 1,
      });

    case "remove":
      return { ...state, lines: state.lines.filter((line) => line.key !== action.key) };

    case "removeMany": {
      const drop = new Set(action.keys);
      return { ...state, lines: state.lines.filter((line) => !drop.has(line.key)) };
    }

    case "setNotes":
      return {
        ...state,
        lines: state.lines.map((line) => (line.key === action.key ? { ...line, notes: action.notes } : line)),
      };

    case "setDiscount":
      return { ...state, discount: Math.max(0, roundMoney(action.amount)) };

    case "replace":
      // Carts saved before sizes existed have no key: the dish id was the key.
      return {
        lines: action.lines.map((line) => ({ ...line, key: line.key ?? lineKey(line.menuItemId, line.sizeId) })),
        discount: action.discount ?? 0,
      };

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
