import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeCosts } from "@/lib/permissions";
import { toMoney } from "@/lib/money";
import { menuImage } from "@/lib/menu-image";
import { addDays } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { businessDay } from "@/lib/session-utils";
import MenuManagerClient, { type AdminMenuItem, type AdminMenuCategory } from "./MenuManagerClient";

export const metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function AdminMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const showCosts = canSeeCosts(user?.role);
  const today = businessDay();
  const { start, end } = periodBounds(addDays(today, -29), today);

  const [categories, items, sold] = await Promise.all([
    prisma.menuCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.menuItem.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: { category: { select: { name: true } } },
    }),
    // What each dish sold in the last 30 days, so costing starts where the money is.
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: {
          isDemo: false,
          paymentStatus: "PAID",
          status: { not: "CANCELLED" },
          createdAt: { gte: start, lt: end },
        },
      },
      _sum: { quantity: true, lineTotal: true },
    }),
  ]);
  const soldBy = new Map(sold.map((row) => [row.menuItemId, row._sum]));

  const serializedCategories: AdminMenuCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
  }));

  const serializedItems: AdminMenuItem[] = items.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    price: toMoney(item.price),
    costPrice: showCosts && item.costPrice !== null ? toMoney(item.costPrice) : null,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    imageUrl: menuImage(item.imageUrl, item.categoryId, item.name),
    isPopular: item.isPopular,
    isAvailable: item.isAvailable,
    sold30: soldBy.get(item.id)?.quantity ?? 0,
    revenue30: toMoney(soldBy.get(item.id)?.lineTotal ?? 0),
  }));

  return (
    <MenuManagerClient
      categories={serializedCategories}
      items={serializedItems}
      canSeeCosts={showCosts}
      initialView={params.view === "costing" && showCosts ? "costing" : "grid"}
    />
  );
}
