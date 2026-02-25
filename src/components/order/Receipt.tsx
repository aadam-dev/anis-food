"use client";

/**
 * Order receipt for pickup confirmation, print, and download.
 * Renders order ref, items, VAT breakdown, customer details, and business info.
 */
import { forwardRef } from "react";
import { OrderItem } from "@/types";
import { OrderTotals } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/constants";
import { format } from "date-fns";
import type { PaymentMethod } from "@/types";

export interface ReceiptData {
  orderRef: string;
  items: OrderItem[];
  totals: OrderTotals;
  customerName: string;
  customerPhone: string;
  deliveryType: "pickup" | "delivery";
  address: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  /** ISO date string when order was placed */
  placedAt: string;
}

interface ReceiptProps {
  data: ReceiptData;
  /** If true, use compact layout for on-screen display. If false, use full layout (print). */
  compact?: boolean;
  className?: string;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pay_on_pickup: "Pay on pickup/delivery",
  paystack: "Card / Online (Paystack)",
};

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(function Receipt(
  { data, compact = false, className = "" },
  ref
) {

  const formattedDate = format(new Date(data.placedAt), "dd MMM yyyy, HH:mm");

  return (
    <div
      ref={ref}
      className={`bg-white text-neutral-black ${compact ? "rounded-xl border border-gray-200 p-6" : "p-8"} ${className}`}
      data-receipt
    >
      <div className={compact ? "space-y-4" : "space-y-6"}>
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold font-heading">{BUSINESS_INFO.name}</h2>
          <p className="text-sm text-gray-600 mt-1">{BUSINESS_INFO.address}</p>
          <p className="text-sm text-gray-600">{BUSINESS_INFO.phone}</p>
        </div>

        {/* Order ref & date */}
        <div className="flex justify-between text-sm">
          <span className="font-semibold">Order ref:</span>
          <span>{data.orderRef}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Date:</span>
          <span>{formattedDate}</span>
        </div>

        {/* Customer & delivery */}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Customer:</span>
            <span>{data.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span>{data.customerPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{data.deliveryType === "delivery" ? "Delivery address:" : "Pickup name:"}</span>
            <span>{data.address}</span>
          </div>
          {data.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-gray-600">Payment:</span>
              <span>{PAYMENT_LABELS[data.paymentMethod]}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-sm text-gray-600 mb-2">Items</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.menuItem.id} className="border-b border-gray-100">
                  <td className="py-2">{item.menuItem.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatPrice(item.menuItem.price)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatPrice(item.menuItem.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal (ex-VAT):</span>
            <span>{formatPrice(data.totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT ({(data.totals.vatRate * 100).toFixed(1)}%):</span>
            <span>{formatPrice(data.totals.vat)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Total:</span>
            <span className="text-[#DC2626]">{formatPrice(data.totals.total)}</span>
          </div>
        </div>

        {data.notes && (
          <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Notes: </span>
            {data.notes}
          </div>
        )}

        <p className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
          Thank you for your order. Show this receipt at pickup if requested.
        </p>
      </div>
    </div>
  );
});

export default Receipt;
