/**
 * Dish photography for the till and menu.
 *
 * An item's own photograph always wins. When none is stored, we pick the closest
 * Anis plate photo by dish name, then a category plate, then a generic serving.
 * Stock Pexels files stay only as last-resort category fills — never preferred
 * over the restaurant's own images.
 */

const ANIS_BY_HINT: { match: RegExp; src: string }[] = [
  { match: /assorted.*fried rice|special.*fried rice/i, src: "/images/menu/assorted-fried-rice.jpg" },
  { match: /assorted.*jollof|special.*jollof/i, src: "/images/menu/assorted-jollof-fried-chicken.jpg" },
  { match: /indomie|noodle/i, src: "/images/menu/assorted-noodles.jpg" },
  { match: /loaded fries|french fries|fries/i, src: "/images/menu/fries.jpg" },
  { match: /fish fillet|snapper|fish sauce|jollof with fish/i, src: "/images/menu/jollof-fish.jpg" },
  { match: /jollof.*chicken|chicken.*jollof|fried rice.*chicken|chicken.*fried rice/i, src: "/images/menu/jollof-fried-chicken.jpg" },
  { match: /goat|grilled meat|turkey wings|wings \(/i, src: "/images/menu/jollof-grilled-meat.jpg" },
  { match: /chicken only|^chicken\b(?!.*(?:jollof|fried rice|sauce|sandwich))/i, src: "/images/menu/grilled-chicken.jpg" },
  { match: /coated chicken/i, src: "/images/menu/grilled-chicken.jpg" },
  { match: /jollof|fried rice|plain rice|vegetable rice|pepper/i, src: "/images/menu/jollof-chicken-serving.jpg" },
  { match: /sobolo|hibiscus/i, src: "/images/menu/drink-on-menu.webp" },
  { match: /banku|omo tuo|okro|groundnut|stew|soup|local/i, src: "/images/menu/local-stew.webp" },
  { match: /sandwich|salad|spring roll|samosa/i, src: "/images/menu/sandwich-chicken.webp" },
  { match: /drink|malt|fanta|coca|water/i, src: "/images/menu/drink-hibiscus.webp" },
];

const CATEGORY_FALLBACKS: Record<string, string> = {
  rice: "/images/menu/jollof-chicken-serving.jpg",
  noodles: "/images/menu/assorted-noodles.jpg",
  sandwiches: "/images/menu/sandwich-chicken.webp",
  sides: "/images/menu/fries.jpg",
  local: "/images/menu/local-stew.webp",
  drinks: "/images/menu/drink-on-menu.webp",
};

export function menuImage(
  imageUrl: string | null | undefined,
  categoryId?: string,
  name?: string,
): string {
  if (imageUrl) return imageUrl;
  if (name) {
    for (const entry of ANIS_BY_HINT) {
      if (entry.match.test(name)) return entry.src;
    }
  }
  if (categoryId && CATEGORY_FALLBACKS[categoryId]) return CATEGORY_FALLBACKS[categoryId];
  return "/images/menu/servings.jpg";
}
