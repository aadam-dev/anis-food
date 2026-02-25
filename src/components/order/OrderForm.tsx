"use client";

/**
 * Order form: delivery type, contact fields, notes. Submits via WhatsApp with pre-filled message.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { MessageCircle, Send } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { MenuItem } from "@/types";
import { OrderFormData } from "@/types";
import { generateWhatsAppOrderMessage, formatPrice, getOrderTotals, validateOrderPhone, generateOrderReference } from "@/lib/utils";
import { BUSINESS_INFO, ORDER_CONFIG } from "@/lib/constants";

interface OrderFormProps {
  items: Array<{ menuItem: { id: string; name: string; price: number }; quantity: number }>;
  onSubmit?: (data: OrderFormData) => void;
  /** Optional order ref to include in WhatsApp message (set by parent at payment step). */
  orderRef?: string;
  /** When "continue", button says "Continue to payment" and calls onContinueToPayment; no WhatsApp. */
  primaryAction?: "continue" | "submit";
  /** Called when primaryAction is "continue" and user submits (validated form data + deliveryType). */
  onContinueToPayment?: (data: Omit<OrderFormData, "items"> & { deliveryType: "pickup" | "delivery" }) => void;
}

export default function OrderForm({
  items,
  onSubmit,
  orderRef,
  primaryAction = "submit",
  onContinueToPayment,
}: OrderFormProps) {
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("delivery");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormData>();

  const totals = getOrderTotals(
    items.map((i) => ({ price: i.menuItem.price, quantity: i.quantity })),
    ORDER_CONFIG.VAT_RATE,
    ORDER_CONFIG.VAT_INCLUSIVE
  );

  const onSubmitForm = (data: OrderFormData) => {
    if (primaryAction === "continue" && onContinueToPayment) {
      onContinueToPayment({
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        deliveryType,
        notes: data.notes,
      });
      return;
    }

    const ref = orderRef ?? generateOrderReference();
    const orderData: OrderFormData = {
      ...data,
      deliveryType,
      orderRef: ref,
      items: items.map((item) => ({
        menuItem: {
          ...item.menuItem,
          description: "",
          category: "local",
        } as MenuItem,
        quantity: item.quantity,
      })),
    };

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
      totals.total,
      data.notes,
      {
        orderRef: ref,
        subtotal: totals.subtotal,
        vat: totals.vat,
      }
    );
    const whatsappUrl = `https://wa.me/${BUSINESS_INFO.phoneSecondary.replace(/\D/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");

    onSubmit?.(orderData);
  };

  return (
    <Card className="p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center space-x-2 mb-2">
        <MessageCircle className="w-6 h-6 text-[#10B981]" />
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Order</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">Fill in your details and send directly to our team on WhatsApp for quick confirmation.</p>

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
        {/* Delivery Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Order Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryType("delivery")}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryType === "delivery"
                  ? "border-[#DC2626] bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <span className="font-semibold block">Delivery</span>
              <span className="text-sm text-gray-600">We&apos;ll bring it to you</span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("pickup")}
              className={`p-4 rounded-xl border-2 transition-all ${
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
          placeholder="e.g. 050 160 0160 or 055 250 1280"
          {...register("phone", {
            required: "Phone number is required",
            validate: (value) => validateOrderPhone(value),
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
            label={deliveryType === "pickup" ? "Name for pickup" : "Delivery address"}
            {...register("address", {
              required: deliveryType === "pickup" ? "Name for pickup is required" : "Delivery address is required",
            })}
            error={errors.address?.message}
            placeholder={
              deliveryType === "pickup"
                ? "Name we'll call for your order"
                : "Area + landmark (e.g. Madina, near XYZ)"
            }
          />
          {deliveryType === "delivery" && (
            <p className="mt-1 text-xs text-gray-500">Include area and a landmark so we can find you.</p>
          )}
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
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
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
          <div className="mt-3 pt-3 border-t border-gray-300 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal (ex-VAT):</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({(totals.vatRate * 100).toFixed(1)}%):</span>
              <span>{formatPrice(totals.vat)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-300">
            <span className="font-bold text-lg">Total:</span>
            <span className="font-bold text-xl text-[#DC2626]">
              {formatPrice(totals.total)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant={primaryAction === "continue" ? "primary" : "success"}
          size="lg"
          fullWidth
          className="group"
        >
          {primaryAction === "continue" ? (
            <>
              Continue to payment
              <span className="ml-2">→</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2 inline group-hover:translate-x-1 transition-transform" />
              Send Order via WhatsApp
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          By placing an order, you agree to our terms and conditions. 
          We&apos;ll confirm your order via phone call.
        </p>
      </form>
    </Card>
  );
}

