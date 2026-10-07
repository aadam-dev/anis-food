import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp, maySeeCosts } from "@/lib/api-auth";
import { ok, parseBody, notFound, badRequest, handlePrismaError } from "@/lib/api-utils";
import { revalidateMenu } from "@/lib/menu-data.server";
import { roundMoney, toMoney } from "@/lib/money";

/**
 * A dish's sizes, saved as one list: rows with an id are updated, rows without
 * are added, and sizes left out are removed. Past orders keep their size label
 * (it is snapshotted on the order line), so removing a size never rewrites a
 * receipt.
 *
 * The dish's own price follows its cheapest size, so anything that shows a
 * single price (the website card, search results) says "from" correctly.
 */
const sizeSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().trim().min(1, "Name every size").max(30),
  price: z.number().min(0).max(100000),
  costPrice: z.number().min(0).max(100000).nullable().optional(),
  isAvailable: z.boolean().default(true),
});

const bodySchema = z.object({ sizes: z.array(sizeSchema).max(8, "Eight sizes is plenty") });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, bodySchema);
  if (parsed instanceof NextResponse) return parsed;
  const sizes = parsed.data.sizes;

  const showCosts = maySeeCosts(auth);
  const labels = sizes.map((size) => size.label.toLowerCase());
  if (new Set(labels).size !== labels.length) return badRequest("Two sizes have the same name.");
  if (sizes.length === 1) return badRequest("A dish with sizes needs at least two. With one, just set the dish's price.");

  try {
    const dish = await prisma.menuItem.findUnique({ where: { id }, include: { sizes: true } });
    if (!dish) return notFound("That dish no longer exists.");

    const known = new Set(dish.sizes.map((size) => size.id));
    if (sizes.some((size) => size.id && !known.has(size.id))) return badRequest("One of those sizes is not on this dish.");

    const keep = new Set(sizes.filter((size) => size.id).map((size) => size.id!));
    const removed = dish.sizes.filter((size) => !keep.has(size.id));

    await prisma.$transaction(async (tx) => {
      if (removed.length > 0) await tx.menuItemSize.deleteMany({ where: { id: { in: removed.map((size) => size.id) } } });
      // Rename in two steps so swapping two labels never trips the unique index.
      for (const size of sizes.filter((entry) => entry.id)) {
        await tx.menuItemSize.update({ where: { id: size.id }, data: { label: `__${size.id}` } });
      }
      for (const [index, size] of sizes.entries()) {
        const data = {
          label: size.label,
          price: roundMoney(size.price),
          // Someone who may not see costs must not wipe them either: their
          // save leaves each size's cost as it was.
          ...(showCosts && size.costPrice !== undefined
            ? { costPrice: size.costPrice === null ? null : roundMoney(size.costPrice) }
            : {}),
          isAvailable: size.isAvailable,
          sortOrder: index,
        };
        if (size.id) await tx.menuItemSize.update({ where: { id: size.id }, data });
        else await tx.menuItemSize.create({ data: { ...data, menuItemId: id } });
      }
      const available = sizes.filter((size) => size.isAvailable);
      if (available.length > 0) {
        await tx.menuItem.update({
          where: { id },
          data: { price: roundMoney(Math.min(...available.map((size) => size.price))) },
        });
      }
    });

    revalidateMenu();
    await logAudit({
      actorId: auth.user.sub,
      action: "menu.item.sizes",
      resource: "MenuItem",
      resourceId: id,
      detail: {
        before: dish.sizes.map((size) => ({ label: size.label, price: toMoney(size.price) })),
        after: sizes.map((size) => ({ label: size.label, price: size.price })),
      },
      ip: clientIp(request),
    });

    const saved = await prisma.menuItemSize.findMany({ where: { menuItemId: id }, orderBy: { sortOrder: "asc" } });
    return ok({
      sizes: saved.map((size) => ({
        id: size.id,
        label: size.label,
        price: toMoney(size.price),
        costPrice: showCosts && size.costPrice !== null ? toMoney(size.costPrice) : null,
        isAvailable: size.isAvailable,
      })),
    });
  } catch (error) {
    return handlePrismaError(error, "admin/menu/[id]/sizes PUT");
  }
}
