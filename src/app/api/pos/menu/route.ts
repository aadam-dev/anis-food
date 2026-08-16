import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, handlePrismaError } from "@/lib/api-utils";
import { toMoney } from "@/lib/money";

/**
 * The menu as the till needs it.
 *
 * Note what is not here: costPrice. A cashier must never see what a plate costs
 * to make — it is not their business, and a customer glancing at the screen
 * should not learn Anis's margins either.
 *
 * The service worker caches this response, so a till that loses signal mid-shift
 * still has a menu to sell from.
 */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const [categories, items] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, sortOrder: true },
      }),
      prisma.menuItem.findMany({
        where: { isAvailable: true, category: { isActive: true } },
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          categoryId: true,
          imageUrl: true,
          isPopular: true,
        },
      }),
    ]);

    return ok({
      categories,
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        price: toMoney(item.price),
        categoryId: item.categoryId,
        imageUrl: item.imageUrl,
        isPopular: item.isPopular,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handlePrismaError(error, "pos/menu GET");
  }
}
