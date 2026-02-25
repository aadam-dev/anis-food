"use client";

/**
 * Menu page client component.
 * Receives menu data as props from the server component.
 */
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import MenuCategory from "@/components/menu/MenuCategory";
import MenuCard from "@/components/menu/MenuCard";
import Input from "@/components/ui/Input";
import type { SerializedMenuCategory, SerializedMenuItem } from "@/lib/menu-data";
import { MenuItem as MenuItemType, DietaryTag, MenuCategoryData } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

const DIETARY_FILTERS: { value: DietaryTag | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "spicy", label: "Spicy" },
];

interface Props {
  categories: SerializedMenuCategory[];
  items: SerializedMenuItem[];
}

/** Convert serialized menu item to the legacy MenuItem type for existing components. */
function toMenuItem(item: SerializedMenuItem): MenuItemType {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    category: item.categorySlug as MenuItemType["category"],
    image: item.imageUrl ?? undefined,
    popular: item.popular,
    available: item.available,
    tags: item.tags as DietaryTag[],
  };
}

export default function MenuPageClient({ categories, items }: Props) {
  const defaultCategory = categories[0]?.slug ?? "rice";
  const [activeCategory, setActiveCategory] = useState<string>(defaultCategory);
  const [activeDietaryTag, setActiveDietaryTag] = useState<DietaryTag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { items: cartItems, addItem, updateQuantity, removeItem, count: cartCount } = useCart();
  const { toast } = useToast();

  const categoryData: MenuCategoryData[] = categories.map((c) => ({
    id: c.slug as MenuCategoryData["id"],
    name: c.name,
    description: c.description ?? "",
  }));

  const itemsInActiveCategory = useMemo(
    () => items.filter((item) => item.categorySlug === activeCategory),
    [items, activeCategory]
  );

  const filteredItems = useMemo(() => {
    let filtered = items.filter((item) => item.categorySlug === activeCategory);

    if (activeDietaryTag) {
      filtered = filtered.filter((item) => item.tags?.includes(activeDietaryTag));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description ?? "").toLowerCase().includes(query)
      );
    }

    return filtered.map(toMenuItem);
  }, [items, activeCategory, activeDietaryTag, searchQuery]);

  const handleAddToOrder = (item: MenuItemType, quantity = 1) => {
    addItem(item, quantity);
    const newCount = cartCount + quantity;
    toast({
      message: `${item.name} added — ${newCount} item${newCount !== 1 ? "s" : ""} in cart`,
      action: { label: "View cart", href: "/order" },
    });
  };

  const handleDecrease = (item: MenuItemType) => {
    const entry = cartItems.find((i) => i.menuItem.id === item.id);
    if (!entry) return;
    if (entry.quantity <= 1) {
      removeItem(item.id);
    } else {
      updateQuantity(item.id, entry.quantity - 1);
    }
  };

  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 display-font">
            Our Menu
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our delicious selection of authentic Ghanaian dishes
          </p>
        </div>

        {/* Search + filters */}
        <div className="mb-8 max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {DIETARY_FILTERS.map(({ value, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveDietaryTag(value)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  activeDietaryTag === value
                    ? "bg-primary-red text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-primary-red hover:text-primary-red"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categoryData.map((category) => (
            <MenuCategory
              key={category.id}
              category={category}
              isActive={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            />
          ))}
        </div>

        {/* Menu Items */}
        <div className="mb-8">
          <MenuCard
            items={filteredItems}
            cartItems={cartItems}
            onAddToOrder={handleAddToOrder}
            onDecrease={handleDecrease}
          />
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-16 px-4">
            {itemsInActiveCategory.length === 0 ? (
              <>
                <p className="text-gray-600 text-lg mb-2">Temporarily out of stock</p>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  We&apos;re restocking this section. Check back soon!
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-lg mb-2">Nothing matches right now.</p>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  Try another category, clear your search, or browse all dishes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveDietaryTag(null);
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-red text-white font-semibold px-6 py-3 text-sm hover:bg-red-700 transition-colors"
                >
                  View full menu
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
