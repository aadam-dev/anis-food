"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import MenuCategory from "@/components/menu/MenuCategory";
import MenuCard from "@/components/menu/MenuCard";
import Input from "@/components/ui/Input";
import { MENU_CATEGORIES, MENU_ITEMS, getMenuItemsByCategory } from "@/lib/menu-data";
import { MenuItem } from "@/types";

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<string>("rice");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderItems, setOrderItems] = useState<MenuItem[]>([]);

  const filteredItems = useMemo(() => {
    let items = getMenuItemsByCategory(activeCategory);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    return items;
  }, [activeCategory, searchQuery]);

  const handleAddToOrder = (item: MenuItem) => {
    // Store in localStorage for now, can be enhanced later
    if (typeof window !== "undefined") {
      const existingItems = JSON.parse(localStorage.getItem("orderItems") || "[]");
      const newItems = [...existingItems, { menuItem: item, quantity: 1 }];
      localStorage.setItem("orderItems", JSON.stringify(newItems));
      setOrderItems([...orderItems, item]);
      
      // Show notification (can be enhanced with toast)
      alert(`${item.name} added to order!`);
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

        {/* Search Bar */}
        <div className="mb-8 max-w-2xl mx-auto">
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
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {MENU_CATEGORIES.map((category) => (
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
          <MenuCard items={filteredItems} onAddToOrder={handleAddToOrder} />
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              No items found. Try a different search or category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

