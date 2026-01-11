"use client";

import { X, Plus, Minus } from "lucide-react";
import { OrderItem } from "@/types";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

export default function OrderSummary({
  items,
  onUpdateQuantity,
  onRemoveItem,
}: OrderSummaryProps) {
  const total = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">Your order is empty</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Order Summary</h3>
      <div className="space-y-4 mb-6">
        {items.map((orderItem) => (
          <div
            key={orderItem.menuItem.id}
            className="flex items-start justify-between border-b border-gray-200 pb-4"
          >
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {orderItem.menuItem.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {formatPrice(orderItem.menuItem.price)} each
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(orderItem.menuItem.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-4"
                  aria-label="Remove item"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center space-x-3 mt-2">
                <button
                  onClick={() =>
                    onUpdateQuantity(
                      orderItem.menuItem.id,
                      Math.max(0, orderItem.quantity - 1)
                    )
                  }
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-semibold w-8 text-center">
                  {orderItem.quantity}
                </span>
                <button
                  onClick={() =>
                    onUpdateQuantity(orderItem.menuItem.id, orderItem.quantity + 1)
                  }
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="font-semibold text-gray-900">
                {formatPrice(orderItem.menuItem.price * orderItem.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-900">Total:</span>
          <span className="text-2xl font-bold text-[#DC2626]">
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </Card>
  );
}

