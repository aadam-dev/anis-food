import MenuItem from "./MenuItem";
import { MenuItem as MenuItemType } from "@/types";

interface MenuCardProps {
  items: MenuItemType[];
  onAddToOrder?: (item: MenuItemType) => void;
}

export default function MenuCard({ items, onAddToOrder }: MenuCardProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No items found in this category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <MenuItem key={item.id} item={item} onAddToOrder={onAddToOrder} />
      ))}
    </div>
  );
}

