/**
 * Menu data access layer — client-safe static JSON exports.
 *
 * This file is safe to import from client components.
 * For DB reads, server components should import from menu-data.server.ts.
 */
import { MenuItem, MenuCategoryData } from "@/types";
import menuJson from "@/data/menu.json";

// ---------------------------------------------------------------------------
// Static JSON exports (backward compatibility / client-safe)
// ---------------------------------------------------------------------------

export const MENU_CATEGORIES: MenuCategoryData[] = menuJson.categories as MenuCategoryData[];
export const MENU_ITEMS: MenuItem[] = menuJson.items as MenuItem[];

export const getMenuItemsByCategory = (category: string): MenuItem[] => {
  return MENU_ITEMS.filter((item) => item.category === category);
};

export const getCategoriesWithItems = (): MenuCategoryData[] => {
  const counts = new Map<string, number>();
  for (const item of MENU_ITEMS) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return MENU_CATEGORIES.filter((c) => (counts.get(c.id) ?? 0) > 0);
};

export const getPopularItems = (): MenuItem[] => {
  return MENU_ITEMS.filter((item) => item.popular === true);
};

export const getMenuItemById = (id: string): MenuItem | undefined => {
  return MENU_ITEMS.find((item) => item.id === id);
};

// ---------------------------------------------------------------------------
// Serialized types for passing from server to client components
// ---------------------------------------------------------------------------

export interface SerializedMenuCategory {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  sortOrder: number;
  active: boolean;
}

export interface SerializedMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categorySlug: string;
  categoryName: string;
  categoryId: string;
  imageUrl: string | null;
  popular: boolean;
  available: boolean;
  tags: string[];
}
