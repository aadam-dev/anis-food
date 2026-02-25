"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ShoppingBag, ExternalLink, Phone, MessageCircle, Printer, Download } from "lucide-react";
import OrderForm from "@/components/order/OrderForm";
import OrderSummary from "@/components/order/OrderSummary";
import Receipt, { type ReceiptData } from "@/components/order/Receipt";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { BUSINESS_INFO, ORDER_CONFIG } from "@/lib/constants";
import { useCart } from "@/contexts/CartContext";
import { getOrderTotals } from "@/lib/utils";
import type { OrderFormData } from "@/types";
import Link from "next/link";

const LAST_ORDER_STORAGE_KEY = "anis_last_order";

type CheckoutStep = "review" | "complete";

export default function OrderPage() {
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("review");
  const [lastOrder, setLastOrderState] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const { items: orderItems, updateQuantity, removeItem, clearCart } = useCart();

  const setLastOrder = useCallback((data: ReceiptData) => {
    setLastOrderState(data);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    }
  }, []);

  // Restore last order from sessionStorage after refresh so user can re-print/re-download receipt
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReceiptData;
      if (parsed?.orderRef && Array.isArray(parsed?.items) && parsed?.totals) {
        const timer = window.setTimeout(() => {
          setLastOrderState(parsed);
          setCheckoutStep("complete");
        }, 0);
        return () => {
          window.clearTimeout(timer);
        };
      }
    } catch {
      // ignore
    }
  }, []);

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    updateQuantity(itemId, quantity);
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleOrderSubmitted = useCallback(
    (data: OrderFormData) => {
      if (!data.orderRef || !data.items?.length) return;
      const totals = getOrderTotals(
        data.items.map((i) => ({ price: i.menuItem.price, quantity: i.quantity })),
        ORDER_CONFIG.VAT_RATE,
        ORDER_CONFIG.VAT_INCLUSIVE
      );
      const receiptData: ReceiptData = {
        orderRef: data.orderRef,
        items: data.items.map((i) => ({ menuItem: i.menuItem, quantity: i.quantity })),
        totals,
        customerName: data.name,
        customerPhone: data.phone,
        deliveryType: data.deliveryType,
        address: data.address,
        paymentMethod: "pay_on_pickup",
        notes: data.notes,
        placedAt: new Date().toISOString(),
      };
      setLastOrder(receiptData);
      clearCart();
      setCheckoutStep("complete");
    },
    [clearCart, setLastOrder]
  );

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    const el = receiptRef.current;
    if (!el) return;
    const html = el.outerHTML;
    const printStyles = `
      body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
      [data-receipt] { max-width: 400px; margin: 0 auto; }
    `;
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${printStyles}</style></head><body>${html}</body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(doc);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 250);
    }
  };

  const emptyCart = orderItems.length === 0;
  const showEmptyState = emptyCart && checkoutStep === "review" && !lastOrder;
  const showReview = !emptyCart && checkoutStep === "review";
  const showComplete = checkoutStep === "complete" && lastOrder;

  const whatsappEmptyUrl = `https://wa.me/${BUSINESS_INFO.phoneSecondary.replace(/\D/g, "")}?text=${encodeURIComponent("Hi, I'd like to place an order.")}`;

  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 display-font">
            Place Your Order
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Order your favorite dishes and we&apos;ll prepare them fresh for you
          </p>
        </div>

        {showComplete && lastOrder && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-8 text-center">
              <MessageCircle className="w-16 h-16 text-[#25D366] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order placed</h2>
              <p className="text-gray-600 mb-2">
                Send the message in WhatsApp to confirm. We&apos;ll call you to confirm.
              </p>
              <p className="text-sm text-gray-500 mb-6">Order ref: {lastOrder.orderRef}</p>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Receipt</h3>
              <div className="mb-6">
                <Receipt ref={receiptRef} data={lastOrder} compact />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handlePrintReceipt}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print receipt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleDownloadReceipt}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save as PDF
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Use &quot;Save as PDF&quot; in the print dialog to download.
              </p>
            </Card>

            <div className="text-center">
              <Link href="/menu">
                <Button variant="primary" size="lg">
                  Add more items
                </Button>
              </Link>
            </div>
          </div>
        )}

        {showEmptyState && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your order is empty</h2>
              <p className="text-gray-600 mb-8">
                Browse our menu and add items, or order via WhatsApp or phone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <a href={`tel:${BUSINESS_INFO.phone}`} className="inline-flex justify-center">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">
                    <Phone className="w-5 h-5 mr-2" />
                    Call to order
                  </Button>
                </a>
                <a
                  href={whatsappEmptyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex justify-center"
                >
                  <Button variant="success" size="lg" className="w-full sm:w-auto">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Order via WhatsApp
                  </Button>
                </a>
              </div>
              <Link href="/menu">
                <Button variant="outline" size="lg">
                  View Menu
                </Button>
              </Link>
            </Card>
            <div className="mt-8">
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
        )}

        {showReview && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <OrderForm
                items={orderItems.map((item) => ({
                  menuItem: item.menuItem,
                  quantity: item.quantity,
                }))}
                primaryAction="submit"
                onSubmit={handleOrderSubmitted}
              />
            </div>
            <div className="lg:col-span-1">
              <OrderSummary
                items={orderItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                showVat
              />
              <div className="mt-6">
                <Link href="/menu">
                  <Button variant="outline" size="md" fullWidth>
                    Add more items
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
