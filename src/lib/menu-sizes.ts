import type { Prisma } from "@/generated/prisma";
import { roundMoney, toMoney } from "./money";

/**
 * Sizes: one dish, several portions, each with its own price and cost.
 *
 * Every place that turns a menu pick into an order line (the till, the website,
 * an order edit) goes through `resolveLine`, so a size can never be sold at the
 * wrong price or snapshotted with the wrong cost.
 */

export interface SizedDish {
  id: string;
  name: string;
  price: unknown;
  costPrice: unknown | null;
  isAvailable: boolean;
  sizes: { id: string; label: string; price: unknown; costPrice: unknown | null; isAvailable: boolean }[];
}

export type ResolvedLine =
  | {
      ok: true;
      menuItemId: string;
      name: string;
      sizeId: string | null;
      sizeLabel: string | null;
      unitPrice: number;
      unitCost: number | null;
    }
  | { ok: false; error: string };

/** The price and cost for one dish in one size, or why it cannot be sold. */
export function resolveLine(dish: SizedDish, sizeId?: string | null): ResolvedLine {
  if (!dish.isAvailable) return { ok: false, error: `${dish.name} is not available right now.` };

  const sizes = dish.sizes.filter((size) => size.isAvailable);
  if (dish.sizes.length > 0) {
    if (!sizeId) {
      return { ok: false, error: `Pick a size for ${dish.name}.` };
    }
    const size = sizes.find((entry) => entry.id === sizeId);
    if (!size) return { ok: false, error: `That size of ${dish.name} is not available.` };
    return {
      ok: true,
      menuItemId: dish.id,
      name: dish.name,
      sizeId: size.id,
      sizeLabel: size.label,
      unitPrice: roundMoney(toMoney(size.price)),
      unitCost: size.costPrice === null || size.costPrice === undefined ? null : roundMoney(toMoney(size.costPrice)),
    };
  }

  if (sizeId) return { ok: false, error: `${dish.name} does not come in sizes.` };
  return {
    ok: true,
    menuItemId: dish.id,
    name: dish.name,
    sizeId: null,
    sizeLabel: null,
    unitPrice: roundMoney(toMoney(dish.price)),
    unitCost: dish.costPrice === null || dish.costPrice === undefined ? null : roundMoney(toMoney(dish.costPrice)),
  };
}

/** "from GH₵50" price for a dish with sizes: its cheapest available size. */
export function fromPrice(dish: { price: number; sizes: { price: number; isAvailable: boolean }[] }): number {
  const available = dish.sizes.filter((size) => size.isAvailable);
  return available.length > 0 ? Math.min(...available.map((size) => size.price)) : dish.price;
}

/** How a sized line reads everywhere: "Jollof with Grilled Chicken · Large". */
export function lineName(name: string, sizeLabel?: string | null): string {
  return sizeLabel ? `${name} · ${sizeLabel}` : name;
}

/**
 * Prisma filter for dishes that can be sold right now: on the menu, in a shown
 * category, and either priced on their own or with at least one size on sale.
 */
export const SELLABLE_DISH: Prisma.MenuItemWhereInput = {
  isAvailable: true,
  category: { isActive: true },
  OR: [{ sizes: { none: {} } }, { sizes: { some: { isAvailable: true } } }],
};
