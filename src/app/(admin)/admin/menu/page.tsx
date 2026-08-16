import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeCosts } from "@/lib/permissions";
import { toMoney } from "@/lib/money";
import MenuManagerClient, { type AdminMenuItem, type AdminMenuCategory } from "./MenuManagerClient";

export const metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const user = await getCurrentUser();
  const showCosts = canSeeCosts(user?.role);

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.menuItem.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: { category: { select: { name: true } } },
    }),
  ]);

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
    imageUrl: item.imageUrl,
    isPopular: item.isPopular,
    isAvailable: item.isAvailable,
  }));

  return (
    <MenuManagerClient
      categories={serializedCategories}
      items={serializedItems}
      canSeeCosts={showCosts}
    />
  );
}
