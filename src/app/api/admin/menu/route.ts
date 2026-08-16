import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp, maySeeCosts } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { revalidateMenu } from "@/lib/menu-data.server";
import { toMoney } from "@/lib/money";

/**
 * Menu management.
 *
 * Every write ends with revalidateMenu(), because a price Karim changes here and
 * a price the customer sees on /menu must never be two different numbers.
 */

const priceSchema = z
  .number()
  .min(0, "A price cannot be negative")
  .max(100000, "That price looks like a typo")
  .refine((value) => Number.isFinite(value), "Not a valid price");

const createItemSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  name: z.string().min(1, "Give the dish a name").max(120),
  description: z.string().max(500).default(""),
  price: priceSchema,
  costPrice: priceSchema.nullable().optional(),
  categoryId: z.string().min(1, "Pick a category"),
  imageUrl: z.string().max(500).nullable().optional(),
  isPopular: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  tags: z.array(z.string().max(30)).max(10).default([]),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export async function GET() {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;

  try {
    const [categories, items] = await Promise.all([
      prisma.menuCategory.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.menuItem.findMany({
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        include: { category: { select: { id: true, name: true } } },
      }),
    ]);

    const showCosts = maySeeCosts(auth);

    return ok({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      })),
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: toMoney(item.price),
        // A cashier promoted to see this screen still must not see margins.
        costPrice: showCosts && item.costPrice !== null ? toMoney(item.costPrice) : null,
        categoryId: item.categoryId,
        categoryName: item.category.name,
        imageUrl: item.imageUrl,
        isPopular: item.isPopular,
        isAvailable: item.isAvailable,
        tags: item.tags,
        sortOrder: item.sortOrder,
      })),
      canSeeCosts: showCosts,
    });
  } catch (error) {
    return handlePrismaError(error, "admin/menu GET");
  }
}

export async function POST(request: Request) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createItemSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const item = await prisma.menuItem.create({
      data: {
        slug: body.slug,
        name: body.name,
        description: body.description,
        price: body.price,
        costPrice: body.costPrice ?? null,
        categoryId: body.categoryId,
        imageUrl: body.imageUrl ?? null,
        isPopular: body.isPopular,
        isAvailable: body.isAvailable,
        tags: body.tags,
        sortOrder: body.sortOrder,
      },
    });

    revalidateMenu();
    await logAudit({
      actorId: auth.user.sub,
      action: "menu.item.create",
      resource: "MenuItem",
      resourceId: item.id,
      detail: { slug: item.slug, name: item.name, price: body.price },
      ip: clientIp(request),
    });

    return ok({ id: item.id, slug: item.slug }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/menu POST");
  }
}
