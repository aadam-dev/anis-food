"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MessageCircle, Send } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { OrderFormData } from "@/types";
import { generateWhatsAppOrderMessage, formatPrice } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/constants";

interface OrderFormProps {
  items: Array<{ menuItem: { id: string; name: string; price: number }; quantity: number }>;
  onSubmit?: (data: OrderFormData) => void;
}

export default function OrderForm({ items, onSubmit }: OrderFormProps) {
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("delivery");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormData>();

  const total = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  const onSubmitForm = (data: OrderFormData) => {
    const orderData: OrderFormData = {
      ...data,
      deliveryType,
      items: items.map((item) => ({
        menuItem: item.menuItem as any,
        quantity: item.quantity,
      })),
    };

    if (onSubmit) {
      onSubmit(orderData);
    } else {
      // Default: Open WhatsApp with pre-filled message
      const message = generateWhatsAppOrderMessage(
        data.name,
        data.phone,
        data.address,
        items.map((item) => ({
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
        })),
        deliveryType,
        total,
        data.notes
      );

      const whatsappUrl = `https://wa.me/${BUSINESS_INFO.phone.replace(/\D/g, "")}?text=${message}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-center space-x-2 mb-6">
        <MessageCircle className="w-6 h-6 text-[#10B981]" />
        <h2 className="text-2xl font-bold text-gray-900">Place Your Order</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
        {/* Delivery Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Order Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDeliveryType("delivery")}
              className={`p-4 rounded-lg border-2 transition-all ${
                deliveryType === "delivery"
                  ? "border-[#DC2626] bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <span className="font-semibold block">Delivery</span>
              <span className="text-sm text-gray-600">We'll bring it to you</span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("pickup")}
              className={`p-4 rounded-lg border-2 transition-all ${
                deliveryType === "pickup"
                  ? "border-[#DC2626] bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <span className="font-semibold block">Pickup</span>
              <span className="text-sm text-gray-600">Collect at restaurant</span>
            </button>
          </div>
        </div>

        {/* Customer Details */}
        <Input
          label="Full Name"
          {...register("name", { required: "Name is required" })}
          error={errors.name?.message}
        />

        <Input
          label="Phone Number"
          type="tel"
          {...register("phone", {
            required: "Phone number is required",
            pattern: {
              value: /^[0-9+\s()-]+$/,
              message: "Please enter a valid phone number",
            },
          })}
          error={errors.phone?.message}
        />

        <Input
          label="Email (Optional)"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />

        <div>
          <Input
            label={deliveryType === "delivery" ? "Delivery Address" : "Pickup Name"}
            {...register("address", { required: "Address is required" })}
            error={errors.address?.message}
            placeholder={
              deliveryType === "delivery"
                ? "Enter your delivery address"
                : "Enter name for pickup order"
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            {...register("notes")}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-colors"
            placeholder="Any special instructions or dietary requirements..."
          />
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Order Total</h3>
          <div className="space-y-1 text-sm">
            {items.map((item) => (
              <div key={item.menuItem.id} className="flex justify-between">
                <span>
                  {item.quantity}x {item.menuItem.name}
                </span>
                <span>{formatPrice(item.menuItem.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-300">
            <span className="font-bold text-lg">Total:</span>
            <span className="font-bold text-xl text-[#DC2626]">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="success"
          size="lg"
          fullWidth
          className="group"
        >
          <Send className="w-5 h-5 mr-2 inline group-hover:translate-x-1 transition-transform" />
          Send Order via WhatsApp
        </Button>

        <p className="text-xs text-gray-500 text-center">
          By placing an order, you agree to our terms and conditions. 
          We'll confirm your order via phone call.
        </p>
      </form>
    </Card>
  );
}

