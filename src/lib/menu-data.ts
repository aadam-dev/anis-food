/**
 * Menu types shared between server and client components.
 *
 * The static accessors that used to live here (MENU_ITEMS, getPopularItems and
 * friends) are gone on purpose. The database is now the source of truth, and a
 * second, silently-stale copy of the menu sitting one import away is exactly how
 * a site ends up advertising a price the till will not charge.
 *
 * src/data/menu.json still exists, but only as the seed — see prisma/seed.ts.
 * To read the menu on the server, import from menu-data.server.ts.
 */

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
