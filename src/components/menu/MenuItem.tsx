import Image from "next/image";
import { Plus, Minus, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import { MenuItem as MenuItemType } from "@/types";
import { formatPrice } from "@/lib/utils";

interface MenuItemProps {
  item: MenuItemType;
  cartQuantity?: number;
  onAddToOrder?: (item: MenuItemType, quantity?: number) => void;
  onDecrease?: (item: MenuItemType) => void;
}

export default function MenuItem({
  item,
  cartQuantity = 0,
  onAddToOrder,
  onDecrease,
}: MenuItemProps) {
  // Temporary fallback logic for images
  const fallbackImage = item.category === "drinks"
    ? "/images/hero/jollof-hero.png" // Ideally replace with drink image
    : "/images/hero/jollof-hero.png";

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={item.image || fallbackImage}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

        {item.popular && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-neutral-black shadow-sm flex items-center gap-1">
            <Star className="w-3 h-3 text-accent-orange fill-accent-orange" />
            Popular
          </div>
        )}

        {!item.available && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg font-semibold text-sm backdrop-blur-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-baseline gap-3 mb-2">
          <h3 className="text-lg font-bold text-neutral-black group-hover:text-primary-red transition-colors line-clamp-2 leading-tight min-w-0">
            {item.name}
          </h3>
          <span className="text-lg font-bold text-primary-red shrink-0 tabular-nums">
            {formatPrice(item.price)}
          </span>
        </div>

        <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {item.available && onAddToOrder && (
          <div className="mt-auto flex items-center gap-2">
            {cartQuantity > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onDecrease?.(item)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-gray-200 text-neutral-black hover:border-primary-red hover:bg-red-50 hover:text-primary-red transition-colors"
                  aria-label={`Remove one ${item.name}`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[2rem] text-center font-semibold text-neutral-black">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => onAddToOrder(item, 1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-primary-red bg-primary-red text-white hover:bg-red-700 transition-colors"
                  aria-label={`Add one more ${item.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => onAddToOrder(item, 1)}
                className="border-gray-200 hover:border-primary-red hover:bg-primary-red hover:text-white transition-all duration-300 group/btn"
              >
                <span>Add to Order</span>
                <Plus className="w-4 h-4 shrink-0 group-hover/btn:rotate-90 transition-transform duration-300" />
              </Button>
            )}
          </div>
        )}
        {item.available && !onAddToOrder && <div className="h-9" />}
        {!item.available && <div className="h-9" />}
      </div>
    </div>
  );
}

