"use client";

import { useEffect, useRef, useState } from "react";
import { X, Printer } from "lucide-react";
import QRCode from "qrcode";
import Receipt80mm, { type ReceiptData } from "./Receipt80mm";
import { printReceiptNow } from "@/lib/receipt-print";
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
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>();

  // The public page a customer reaches by scanning the slip. clientRef is an
  // unguessable UUID already on the order, so it doubles as the receipt token.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const verifyUrl = `${siteUrl}/receipt/${order.clientRef}`;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 240 })
      .then((url) => {
        if (alive) setQrDataUrl(url);
      })
      .catch(() => {
        // No QR is better than a blank box; the receipt still prints without it.
      });
    return () => {
      alive = false;
    };
  }, [verifyUrl]);

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
    taxLines: order.tax?.lines.map((line) => ({
      code: line.code,
      label: line.label,
      amount: line.amount,
    })),
    taxInclusive: order.tax?.inclusive,
    taxableNet: order.tax?.net,
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
    verifyUrl,
    qrDataUrl,
  };

  useEffect(() => {
    // Print once, as soon as the QR is in the DOM — printReceiptNow waits for the
    // image to decode so the QR never lands on paper as a blank box. If the QR is
    // slow or fails, a 1.2s fallback prints the receipt without it rather than
    // leaving the cashier waiting with a customer's hand out.
    if (printed.current) return;
    if (qrDataUrl) {
      printed.current = true;
      printReceiptNow();
      return;
    }
    const timer = setTimeout(() => {
      if (printed.current) return;
      printed.current = true;
      printReceiptNow();
    }, 1200);
    return () => clearTimeout(timer);
  }, [qrDataUrl]);

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
              onClick={() => printReceiptNow()}
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
