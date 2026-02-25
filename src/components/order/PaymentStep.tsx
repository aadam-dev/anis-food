"use client";

/**
 * Payment step: choose payment method (pay on pickup/delivery or Paystack when keys available).
 */
import { CreditCard, Banknote } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import OrderSummary from "@/components/order/OrderSummary";
import type { PaymentMethod } from "@/types";
import type { OrderItem } from "@/types";

interface PaymentStepProps {
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onPlaceOrder: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  /** When true, show Paystack as available (keys configured). When false, show as "Coming soon". */
  paystackEnabled?: boolean;
  isSubmitting?: boolean;
}

export default function PaymentStep({
  items,
  paymentMethod,
  onPaymentMethodChange,
  onPlaceOrder,
  onUpdateQuantity,
  onRemoveItem,
  paystackEnabled = false,
  isSubmitting = false,
}: PaymentStepProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment method</h2>
          <p className="text-gray-600 text-sm mb-6">
            Choose how you&apos;ll pay. You can pay when we deliver or at pickup.
          </p>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => onPaymentMethodChange("pay_on_pickup")}
              className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${
                paymentMethod === "pay_on_pickup"
                  ? "border-[#DC2626] bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Banknote className="w-6 h-6 text-gray-600 shrink-0" />
              <div>
                <span className="font-semibold block">Pay on pickup / delivery</span>
                <span className="text-sm text-gray-600">Cash or card when you receive your order</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => paystackEnabled && onPaymentMethodChange("paystack")}
              disabled={!paystackEnabled}
              className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${
                paymentMethod === "paystack"
                  ? "border-[#DC2626] bg-red-50"
                  : paystackEnabled
                    ? "border-gray-200 hover:border-gray-300"
                    : "border-gray-200 bg-gray-50 opacity-75 cursor-not-allowed"
              }`}
            >
              <CreditCard className="w-6 h-6 text-gray-600 shrink-0" />
              <div>
                <span className="font-semibold block">
                  Pay with card / Mobile Money
                  {!paystackEnabled && (
                    <span className="ml-2 text-xs font-normal text-gray-500">(Coming soon)</span>
                  )}
                </span>
                <span className="text-sm text-gray-600">
                  {paystackEnabled
                    ? "Secure payment via Paystack"
                    : "Online payment will be available soon"}
                </span>
              </div>
            </button>
          </div>
        </Card>

        <Button
          type="button"
          variant="success"
          size="lg"
          fullWidth
          onClick={onPlaceOrder}
          disabled={isSubmitting}
          className="group"
        >
          {isSubmitting ? "Placing order…" : "Place order"}
        </Button>
      </div>

      <div className="lg:col-span-1">
        <OrderSummary
          items={items}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          showVat
        />
      </div>
    </div>
  );
}
