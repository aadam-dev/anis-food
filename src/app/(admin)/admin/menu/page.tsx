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
    prisma.menuCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { items: true } } } }),
    prisma.menuItem.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        category: { select: { name: true } },
        sizes: { orderBy: { sortOrder: "asc" } },
        _count: { select: { orderItems: true } },
      },
    }),
    // What each dish (and size) sold in the last 30 days, so costing starts where the money is.
    prisma.orderItem.groupBy({
      by: ["menuItemId", "sizeId"],
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
  const soldByDish = new Map<string, { quantity: number; revenue: number }>();
  const soldBySize = new Map<string, { quantity: number; revenue: number }>();
  for (const row of sold) {
    const quantity = row._sum.quantity ?? 0;
    const revenue = toMoney(row._sum.lineTotal ?? 0);
    if (row.menuItemId) {
      const dish = soldByDish.get(row.menuItemId) ?? { quantity: 0, revenue: 0 };
      dish.quantity += quantity;
      dish.revenue += revenue;
      soldByDish.set(row.menuItemId, dish);
    }
    if (row.sizeId) soldBySize.set(row.sizeId, { quantity, revenue });
  }

  const serializedCategories: AdminMenuCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    count: category._count.items,
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
    timesSold: item._count.orderItems,
    sold30: soldByDish.get(item.id)?.quantity ?? 0,
    revenue30: soldByDish.get(item.id)?.revenue ?? 0,
    sizes: item.sizes.map((size) => ({
      id: size.id,
      label: size.label,
      price: toMoney(size.price),
      costPrice: showCosts && size.costPrice !== null ? toMoney(size.costPrice) : null,
      isAvailable: size.isAvailable,
      sold30: soldBySize.get(size.id)?.quantity ?? 0,
      revenue30: soldBySize.get(size.id)?.revenue ?? 0,
    })),
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
