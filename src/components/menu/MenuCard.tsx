import MenuItem, { type MenuSize } from "./MenuItem";
import { MenuItem as MenuItemType } from "@/types";
import type { OrderItem } from "@/types";

interface MenuCardProps {
  items: MenuItemType[];
  cartItems?: OrderItem[];
  onAddToOrder?: (item: MenuItemType, quantity?: number, size?: MenuSize) => void;
  onDecrease?: (item: MenuItemType, size?: MenuSize) => void;
}

export default function MenuCard({
  items,
  cartItems = [],
  onAddToOrder,
  onDecrease,
}: MenuCardProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <MenuItem
          key={item.id}
          item={item}
          cartItems={cartItems.filter((line) => line.menuItem.id === item.id)}
          onAddToOrder={onAddToOrder}
          onDecrease={onDecrease}
        />
      ))}
    </div>
  );
}
