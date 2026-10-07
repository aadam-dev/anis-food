"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Minus, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import type { MenuItem as MenuItemType, OrderItem } from "@/types";
import { formatPrice } from "@/lib/utils";

export type MenuSize = NonNullable<MenuItemType["sizes"]>[number];

interface MenuItemProps {
  item: MenuItemType;
  /** This dish's lines in the cart, one per size. */
  cartItems?: OrderItem[];
  onAddToOrder?: (item: MenuItemType, quantity?: number, size?: MenuSize) => void;
  onDecrease?: (item: MenuItemType, size?: MenuSize) => void;
}

export default function MenuItem({
  item,
  cartItems = [],
  onAddToOrder,
  onDecrease,
}: MenuItemProps) {
  const sizes = item.sizes ?? [];
  const [sizeId, setSizeId] = useState(sizes[0]?.id);
  // A dish down to one size on sale is just that size, with no chooser.
  const size = sizes.find((entry) => entry.id === sizeId) ?? sizes[0];
  const cartQuantity = cartItems.find((line) => (line.size?.id ?? undefined) === size?.id)?.quantity ?? 0;
  const price = size?.price ?? item.price;
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
            {formatPrice(price)}
          </span>
        </div>

        <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {sizes.length > 1 && item.available && (
          <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Size of ${item.name}`}>
            {sizes.map((entry) => {
              const active = entry.id === size?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSizeId(entry.id)}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary-red bg-primary-red text-white"
                      : "border-gray-200 text-gray-700 hover:border-primary-red hover:text-primary-red"
                  }`}
                >
                  {entry.label} <span className="tabular-nums opacity-80">{formatPrice(entry.price)}</span>
                </button>
              );
            })}
          </div>
        )}

        {item.available && onAddToOrder && (
          <div className="mt-auto flex items-center gap-2">
            {cartQuantity > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onDecrease?.(item, size)}
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
                  onClick={() => onAddToOrder(item, 1, size)}
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
                onClick={() => onAddToOrder(item, 1, size)}
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

