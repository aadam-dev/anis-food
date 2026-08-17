/**
 * Menu data — server only, read from the database.
 *
 * The database is the source of truth: what Karim edits in /admin/menu is what
 * the public site shows. src/data/menu.json is now only the seed, kept in the
 * repo as the record of the opening menu.
 *
 * Reads are cached and tagged, so an admin edit calls revalidateMenu() once and
 * every page that shows a price updates — rather than each of them holding its
 * own stale copy for up to a minute.
 */
import "server-only";
import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import seed from "@/data/menu.json";
import type { SerializedMenuCategory, SerializedMenuItem } from "./menu-data";

export type { SerializedMenuCategory, SerializedMenuItem };

export const MENU_CACHE_TAG = "menu";

/**
 * The committed menu.json, mapped to the serialized shape, used only when the
 * database is unreachable.
 *
 * The database is still the source of truth — this is a fallback on failure, not
 * a second live source. It exists because the public menu must never be taken
 * down by a database blip: Vercel prerenders `/` and `/menu` with several workers
 * hitting the pooler cold at build time, and Supabase's transaction pooler drops
 * the occasional cold connection. Without this, one dropped connection fails the
 * whole deploy. At runtime it means a customer always sees a menu, even mid-outage
 * — just possibly a slightly stale one until the next revalidation reconnects.
 */
function seedCategories(): SerializedMenuCategory[] {
  return seed.categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    slug: category.id,
    sortOrder: index,
    active: true,
  }));
}

function seedItems(): SerializedMenuItem[] {
  const categoryName = new Map(seed.categories.map((c) => [c.id, c.name]));
  return seed.items
    .filter((item) => ("available" in item ? item.available !== false : true))
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      price: toMoney(item.price),
      categorySlug: item.category,
      categoryName: categoryName.get(item.category) ?? item.category,
      categoryId: item.category,
      imageUrl: "image" in item ? (item.image as string) : null,
      popular: "popular" in item ? Boolean(item.popular) : false,
      available: true,
      tags: "tags" in item ? ((item.tags as string[]) ?? []) : [],
    }));
}

/**
 * Backstop TTL, matched to the pages' own `revalidate = 60`.
 *
 * The tag is the real invalidation path: an admin edit purges instantly. This
 * exists for changes that arrive some other way — a direct SQL fix, a restore, a
 * second admin session — so the worst case is a minute of staleness rather than
 * however long until someone happens to save something in /admin/menu. It costs
 * two queries a minute, which is nothing next to showing a price the till will
 * not charge.
 */
const MENU_CACHE_TTL_SECONDS = 60;

export const dbGetCategories = unstable_cache(
  async (): Promise<SerializedMenuCategory[]> => {
    try {
      const categories = await prisma.menuCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, description: true, sortOrder: true, isActive: true },
      });

      return categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        slug: category.id,
        sortOrder: category.sortOrder,
        active: category.isActive,
      }));
    } catch (error) {
      console.error("[menu] categories: database unreachable, serving the seed", error);
      return seedCategories();
    }
  },
  ["menu-categories"],
  { tags: [MENU_CACHE_TAG], revalidate: MENU_CACHE_TTL_SECONDS },
);

export const dbGetMenuItems = unstable_cache(
  async (): Promise<SerializedMenuItem[]> => {
    let items;
    try {
      items = await prisma.menuItem.findMany({
        where: { isAvailable: true, category: { isActive: true } },
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        select: {
          slug: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isPopular: true,
          isAvailable: true,
          tags: true,
          category: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      console.error("[menu] items: database unreachable, serving the seed", error);
      return seedItems();
    }

    return items.map((item) => ({
      // The public id stays the slug so existing /menu#anchor links, shared
      // WhatsApp order references and search results keep resolving.
      id: item.slug,
      name: item.name,
      description: item.description || null,
      price: toMoney(item.price),
      categorySlug: item.category.id,
      categoryName: item.category.name,
      categoryId: item.category.id,
      imageUrl: item.imageUrl,
      popular: item.isPopular,
      available: item.isAvailable,
      tags: item.tags,
    }));
  },
  ["menu-items"],
  { tags: [MENU_CACHE_TAG], revalidate: MENU_CACHE_TTL_SECONDS },
);

export async function dbGetPopularItems(): Promise<SerializedMenuItem[]> {
  const items = await dbGetMenuItems();
  return items.filter((item) => item.popular);
}

/** Public pages whose rendered HTML embeds menu prices. */
const MENU_PATHS = ["/menu", "/"];

/**
 * Call after any admin write that changes what a customer would see.
 *
 * Two caches have to be cleared, and clearing only the first is a silent bug:
 *
 *  1. The *data* cache — the unstable_cache entries above. `revalidateTag` does
 *     this. Next 16 also wants a cache-life profile, which sets how long the
 *     invalidation marker survives; "max" means no cached copy can outlive it.
 *  2. The *full route* cache — the prerendered HTML for /menu and /, which
 *     already has the old price baked into it. Tag invalidation does not touch
 *     this, so without revalidatePath the new price sits in a fresh data cache
 *     that nobody reads until the page's own 60s timer happens to fire.
 */
export function revalidateMenu(): void {
  revalidateTag(MENU_CACHE_TAG, "max");
  for (const path of MENU_PATHS) revalidatePath(path);
}
