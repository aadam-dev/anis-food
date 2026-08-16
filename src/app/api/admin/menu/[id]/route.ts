import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, notFound, badRequest, handlePrismaError } from "@/lib/api-utils";
import { revalidateMenu } from "@/lib/menu-data.server";
import { toMoney } from "@/lib/money";

const priceSchema = z
  .number()
  .min(0, "A price cannot be negative")
  .max(100000, "That price looks like a typo");

const updateItemSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    price: priceSchema.optional(),
    costPrice: priceSchema.nullable().optional(),
    categoryId: z.string().min(1).optional(),
    imageUrl: z.string().max(500).nullable().optional(),
    isPopular: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to update");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, updateItemSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const before = await prisma.menuItem.findUnique({ where: { id } });
    if (!before) return notFound("That menu item no longer exists.");

    const item = await prisma.menuItem.update({ where: { id }, data: body });

    revalidateMenu();

    // Record what actually moved, not the whole row — a price history that reads
    // "100.00 → 110.00" is worth something six months from now; a JSON dump isn't.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(body) as (keyof typeof body)[]) {
      const from = before[key as keyof typeof before];
      const to = item[key as keyof typeof item];
      const normalise = (value: unknown) =>
        typeof value === "object" && value !== null && "toString" in value
          ? String(value)
          : value;
      if (normalise(from) !== normalise(to)) {
        changes[key] = { from: normalise(from), to: normalise(to) };
      }
    }

    if (Object.keys(changes).length > 0) {
      await logAudit({
        actorId: auth.user.sub,
        action: "menu.item.update",
        resource: "MenuItem",
        resourceId: item.id,
        detail: { slug: item.slug, changes },
        ip: clientIp(request),
      });
    }

    return ok({
      id: item.id,
      slug: item.slug,
      name: item.name,
      price: toMoney(item.price),
      isAvailable: item.isAvailable,
    });
  } catch (error) {
    return handlePrismaError(error, "admin/menu/[id] PATCH");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!item) return notFound("That menu item no longer exists.");

    // A dish that has been sold is part of the accounting record. Deleting it
    // would orphan historical order lines and quietly change past reports, so
    // the answer is to stop selling it, not to erase it.
    if (item._count.orderItems > 0) {
      return badRequest(
        `"${item.name}" has been sold ${item._count.orderItems} time(s), so it cannot be deleted. ` +
          `Mark it unavailable instead — it will disappear from the menu and the till, ` +
          `and past receipts stay correct.`,
      );
    }

    await prisma.menuItem.delete({ where: { id } });
    revalidateMenu();

    await logAudit({
      actorId: auth.user.sub,
      action: "menu.item.delete",
      resource: "MenuItem",
      resourceId: id,
      detail: { slug: item.slug, name: item.name },
      ip: clientIp(request),
    });

    return ok({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "admin/menu/[id] DELETE");
  }
}
