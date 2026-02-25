/**
 * Menu data — server-only. Static JSON only (no database).
 * Import from server components / route handlers.
 */
import { MENU_CATEGORIES, MENU_ITEMS } from "./menu-data";
import type { SerializedMenuCategory, SerializedMenuItem } from "./menu-data";

export type { SerializedMenuCategory, SerializedMenuItem };

export async function dbGetCategories(): Promise<SerializedMenuCategory[]> {
  return MENU_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    slug: c.id,
    sortOrder: 0,
    active: true,
  }));
}

export async function dbGetMenuItems(): Promise<SerializedMenuItem[]> {
  return MENU_ITEMS.filter((item) => item.available !== false).map((item) => {
    const cat = MENU_CATEGORIES.find((c) => c.id === item.category);
    return {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      price: item.price,
      categorySlug: item.category,
      categoryName: cat?.name ?? item.category,
      categoryId: item.category,
      imageUrl: item.image ?? null,
      popular: item.popular ?? false,
      available: item.available ?? true,
      tags: item.tags ?? [],
    };
  });
}

export async function dbGetPopularItems(): Promise<SerializedMenuItem[]> {
  const items = await dbGetMenuItems();
  return items.filter((item) => item.popular);
}
