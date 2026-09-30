/**
 * A dish's own photograph always wins. The category fallbacks make the product
 * grid visually complete while Anis replaces them with exact dish photography.
 */
const CATEGORY_FALLBACKS: Record<string, string> = {
  rice: "/images/menu/rice-jollof.webp",
  noodles: "/images/menu/noodles-bowl.webp",
  sandwiches: "/images/menu/sandwich-chicken.webp",
  sides: "/images/menu/fries.jpg",
  local: "/images/menu/local-stew.webp",
  drinks: "/images/menu/drink-hibiscus.webp",
};

export function menuImage(imageUrl: string | null | undefined, categoryId?: string): string {
  return imageUrl || (categoryId ? CATEGORY_FALLBACKS[categoryId] : undefined) || "/images/menu/servings.jpg";
}

