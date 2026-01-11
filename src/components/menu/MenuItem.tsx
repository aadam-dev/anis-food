import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { MenuItem as MenuItemType } from "@/types";
import { formatPrice } from "@/lib/utils";

interface MenuItemProps {
  item: MenuItemType;
  onAddToOrder?: (item: MenuItemType) => void;
}

export default function MenuItem({ item, onAddToOrder }: MenuItemProps) {
  return (
    <Card hover className="h-full flex flex-col">
      <div className="relative h-48 bg-gradient-to-br from-[#DC2626] to-[#F97316]">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white text-4xl">
            🍽️
          </div>
        )}
        {item.popular && (
          <div className="absolute top-4 right-4 bg-[#10B981] text-white px-3 py-1 rounded-full text-xs font-semibold">
            Popular
          </div>
        )}
        {!item.available && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold">
              Unavailable
            </span>
          </div>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
        <p className="text-gray-600 text-sm mb-4 flex-1">{item.description}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-2xl font-bold text-[#DC2626]">
            {formatPrice(item.price)}
          </span>
          {item.available && onAddToOrder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddToOrder(item)}
            >
              Add to Order
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

