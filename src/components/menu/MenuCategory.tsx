"use client";

import { MenuCategoryData } from "@/types";
import { cn } from "@/lib/utils";

interface MenuCategoryProps {
  category: MenuCategoryData;
  isActive: boolean;
  onClick: () => void;
}

export default function MenuCategory({ category, isActive, onClick }: MenuCategoryProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-3 rounded-lg font-semibold transition-all duration-200",
        isActive
          ? "bg-[#DC2626] text-white shadow-lg"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      )}
    >
      {category.name}
    </button>
  );
}

