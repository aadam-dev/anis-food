import "server-only";
import { prisma } from "@/lib/db";
import { roundMoney } from "@/lib/money";
import { resolveLine } from "@/lib/menu-sizes";

/**
 * Turns what a till, the website or an order edit asked for into priced order
 * lines. Prices and costs are always read from the database — whatever the
 * client said about money is ignored — and every size goes through
 * resolveLine, so all three ways in sell a dish at the same price.
 *
 * Dishes may be named by database id or by slug: the website only knows slugs.
 */

export interface LineRequest {
  menuItemId: string;
  sizeId?: string | null;
  quantity: number;
  notes?: string | null;
}

export interface PricedLine {
  menuItemId: string;
  sizeId: string | null;
  sizeLabel: string | null;
  name: string;
  unitPrice: number;
  unitCost: number | null;
  quantity: number;
  lineTotal: number;
  notes: string | null;
}

export async function priceLines(
  requests: LineRequest[],
): Promise<{ ok: true; lines: PricedLine[] } | { ok: false; error: string; missing?: string[] }> {
  const keys = [...new Set(requests.map((line) => line.menuItemId))];
  const dishes = await prisma.menuItem.findMany({
    where: { OR: [{ id: { in: keys } }, { slug: { in: keys } }] },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      costPrice: true,
      isAvailable: true,
      sizes: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, price: true, costPrice: true, isAvailable: true },
      },
    },
  });
  const byKey = new Map<string, (typeof dishes)[number]>();
  for (const dish of dishes) {
    byKey.set(dish.id, dish);
    byKey.set(dish.slug, dish);
  }

  const missing = keys.filter((key) => !byKey.has(key));
  if (missing.length > 0) {
    return { ok: false, error: "Some dishes are no longer on the menu. Refresh and try again.", missing };
  }

  const lines: PricedLine[] = [];
  for (const request of requests) {
    const resolved = resolveLine(byKey.get(request.menuItemId)!, request.sizeId);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    lines.push({
      menuItemId: resolved.menuItemId,
      sizeId: resolved.sizeId,
      sizeLabel: resolved.sizeLabel,
      name: resolved.name,
      unitPrice: resolved.unitPrice,
      unitCost: resolved.unitCost,
      quantity: request.quantity,
      lineTotal: roundMoney(resolved.unitPrice * request.quantity),
      notes: request.notes?.trim() || null,
    });
  }
  return { ok: true, lines };
}

/** The item rows to create for priced lines. */
export function itemRows(lines: PricedLine[]) {
  return lines.map((line) => ({
    menuItemId: line.menuItemId,
    sizeId: line.sizeId,
    sizeLabel: line.sizeLabel,
    name: line.name,
    unitPrice: line.unitPrice,
    unitCost: line.unitCost,
    quantity: line.quantity,
    lineTotal: line.lineTotal,
    notes: line.notes,
  }));
}
