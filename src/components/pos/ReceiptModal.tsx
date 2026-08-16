"use client";

import { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import Receipt80mm, { type ReceiptData } from "./Receipt80mm";
import type { OrderView } from "./types";

export default function ReceiptModal({
  order,
  business,
  soldBy,
  onClose,
}: {
  order: OrderView;
  business: { header: string; address: string; phone: string; footer: string; taxLabel: string };
  soldBy: string;
  onClose: () => void;
}) {
  const printed = useRef(false);

  const data: ReceiptData = {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    soldBy,
    lines: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      notes: item.notes,
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    taxLabel: business.taxLabel,
    total: order.total,
    paymentMethod: order.paymentMethod,
    splitPayments: order.splitPayments,
    tenderedAmount: order.tenderedAmount,
    changeAmount: order.changeAmount,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    notes: order.notes,
    header: business.header,
    address: business.address,
    phone: business.phone,
    footer: business.footer,
  };

  useEffect(() => {
    // Print once, shortly after the receipt is on screen — long enough for the
    // browser to lay it out, short enough that the cashier is not left waiting
    // with a customer's hand out.
    if (printed.current) return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-2xl border"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-4 py-3 border-b"
          style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
        >
          <h2 className="font-semibold">Receipt</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.print()}
              className="h-11 px-3 flex items-center gap-1.5 rounded-lg text-sm font-semibold"
              style={{ background: "var(--s-panel-alt)" }}
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onClose}
              className="h-11 w-11 grid place-items-center rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <Receipt80mm data={data} preview />
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl px-4 py-3.5 font-bold text-white"
            style={{ background: "var(--s-brand)" }}
          >
            Next customer
          </button>
        </div>
      </div>
    </div>
  );
}
