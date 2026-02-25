/**
 * POS quick filters: config-driven sub-filters per category for faster item lookup.
 * Keyed by category slug so adding a category or new items doesn't require code changes
 * beyond adding a config entry here. Each filter uses a predicate so new menu items
 * automatically fall into the right bucket when their name/tags match.
 */

export interface QuickFilter {
  id: string;
  label: string;
  /** Return true if this item belongs under this quick filter. */
  match: (itemName: string, itemTags: string[]) => boolean;
}

/** Quick filters per category slug. Only categories with entries here show the quick-filter bar. */
export const POS_QUICK_FILTERS_BY_SLUG: Record<string, QuickFilter[]> = {
  rice: [
    {
      id: "jollof",
      label: "Jollof",
      match: (name) => /jollof/i.test(name),
    },
    {
      id: "fried-rice",
      label: "Fried Rice",
      match: (name) => /fried rice/i.test(name),
    },
    {
      id: "beef-fish",
      label: "Beef & Fish",
      match: (name) =>
        /\b(beef|fish|snapper|fillet)\b/i.test(name),
    },
    {
      id: "sauces-more",
      label: "Sauces & more",
      match: (name) =>
        /sauce|gizzard|vegetable rice|plain rice|garden egg|peppered|turkey stew|assorted|vegetarian/i.test(name),
    },
  ],
  sandwiches: [
    {
      id: "sandwich",
      label: "Sandwich",
      match: (name) => /sandwich/i.test(name),
    },
    {
      id: "salad",
      label: "Salad",
      match: (name) => /salad/i.test(name),
    },
    {
      id: "snacks",
      label: "Snacks",
      match: (name) => /spring roll|samosa/i.test(name),
    },
  ],
};

/**
 * Returns quick filters for a category slug, or undefined if none configured.
 */
export function getQuickFiltersForCategorySlug(
  categorySlug: string
): QuickFilter[] | undefined {
  return POS_QUICK_FILTERS_BY_SLUG[categorySlug];
}
