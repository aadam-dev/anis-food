import MenuItem from "./MenuItem";
import { MenuItem as MenuItemType } from "@/types";
import type { OrderItem } from "@/types";

interface MenuCardProps {
  items: MenuItemType[];
  cartItems?: OrderItem[];
  onAddToOrder?: (item: MenuItemType, quantity?: number) => void;
  onDecrease?: (item: MenuItemType) => void;
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
          cartQuantity={cartItems.find((i) => i.menuItem.id === item.id)?.quantity ?? 0}
          onAddToOrder={onAddToOrder}
          onDecrease={onDecrease}
        />
      ))}
    </div>
  );
}

