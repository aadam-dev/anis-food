"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, ExternalLink } from "lucide-react";
import OrderForm from "@/components/order/OrderForm";
import OrderSummary from "@/components/order/OrderSummary";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { OrderItem } from "@/types";
import { BUSINESS_INFO } from "@/lib/constants";
import Link from "next/link";

export default function OrderPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    // Load items from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("orderItems");
      if (stored) {
        try {
          const items = JSON.parse(stored);
          setOrderItems(items);
        } catch (e) {
          console.error("Error loading order items:", e);
        }
      }
    }
  }, []);

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveItem(itemId);
      return;
    }
    const updated = orderItems.map((item) =>
      item.menuItem.id === itemId ? { ...item, quantity } : item
    );
    setOrderItems(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("orderItems", JSON.stringify(updated));
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const updated = orderItems.filter((item) => item.menuItem.id !== itemId);
    setOrderItems(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("orderItems", JSON.stringify(updated));
    }
  };

  const handleOrderSubmit = (data: any) => {
    // Order is sent via WhatsApp, clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("orderItems");
    }
    setOrderItems([]);
  };

  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 display-font">
            Place Your Order
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Order your favorite dishes and we'll prepare them fresh for you
          </p>
        </div>

        {orderItems.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <Card className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Your order is empty
              </h2>
              <p className="text-gray-600 mb-8">
                Browse our menu and add items to your order to get started
              </p>
              <Link href="/menu">
                <Button variant="primary" size="lg">
                  View Menu
                </Button>
              </Link>
            </Card>

            {/* Alternative Ordering Options */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-2">Order via Phone</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Call us directly to place your order
                </p>
                <a href={`tel:${BUSINESS_INFO.phone}`}>
                  <Button variant="outline" size="md" fullWidth>
                    {BUSINESS_INFO.phone}
                  </Button>
                </a>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-2">Order on Bolt Food</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Use our delivery partner for quick ordering
                </p>
                <a
                  href={BUSINESS_INFO.deliveryPlatforms.boltFood}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="md" fullWidth>
                    Order on Bolt Food
                    <ExternalLink className="w-4 h-4 ml-2 inline" />
                  </Button>
                </a>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Form */}
            <div className="lg:col-span-2">
              <OrderForm
                items={orderItems.map((item) => ({
                  menuItem: item.menuItem,
                  quantity: item.quantity,
                }))}
                onSubmit={handleOrderSubmit}
              />
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary
                items={orderItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
              />
              <div className="mt-6">
                <Link href="/menu">
                  <Button variant="outline" size="md" fullWidth>
                    Add More Items
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

