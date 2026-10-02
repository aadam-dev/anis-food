"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, X, Printer } from "lucide-react";
import QRCode from "qrcode";
import Receipt80mm, { type ReceiptData } from "./Receipt80mm";
import ReceiptWhatsAppButton from "./ReceiptWhatsAppButton";
import { printReceiptNow } from "@/lib/receipt-print";
import type { OrderView } from "./types";

export default function ReceiptModal({
  order,
  business,
  soldBy,
  onClose,
  kind = "receipt",
}: {
  order: OrderView;
  business: { header: string; address: string; phone: string; footer: string; taxLabel: string };
  soldBy: string;
  onClose: () => void;
  /** Both are 80mm slips. Invoice adds the document title; the lines are the same. */
  kind?: "receipt" | "invoice";
}) {
  const printed = useRef(false);
  const printAfterKind = useRef(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>();
  const [slipKind, setSlipKind] = useState(kind);

  function chooseSlip(next: "receipt" | "invoice") {
    if (next === slipKind) {
      printReceiptNow();
      return;
    }
    printAfterKind.current = true;
    setSlipKind(next);
  }

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
    customerAddress: order.customerAddress,
    deliveryType: order.deliveryType,
    tableLabel: order.tableLabel,
    paymentStatus: order.paymentStatus,
    notes: order.notes,
    header: business.header,
    address: business.address,
    phone: business.phone,
    footer: business.footer,
    documentTitle: slipKind === "invoice" ? "INVOICE" : undefined,
    logoUrl: "/images/logo.png",
    verifyUrl,
    qrDataUrl,
  };

  useEffect(() => {
    // Defer auto-print so the receipt sheet paints and the payment spinner can
    // clear before the browser print dialog blocks the main thread. On some POS
    // Chromes, print() hung the UI while "Processing…" was still showing.
    if (printed.current) return;
    if (!qrDataUrl) {
      const timer = setTimeout(() => {
        if (printed.current) return;
        printed.current = true;
        queueMicrotask(() => {
          try {
            printReceiptNow();
          } catch {
            // Print is best-effort; cashier can tap Print.
          }
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
    printed.current = true;
    const frame = requestAnimationFrame(() => {
      window.setTimeout(() => {
        try {
          printReceiptNow();
        } catch {
          // Print is best-effort.
        }
      }, 80);
    });
    return () => cancelAnimationFrame(frame);
  }, [qrDataUrl]);

  useEffect(() => {
    if (!printAfterKind.current) return;
    printAfterKind.current = false;
    printReceiptNow();
  }, [slipKind]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div
        className="relative flex w-full max-w-sm max-h-[92dvh] flex-col overflow-hidden rounded-2xl border"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b px-4 py-3"
          style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
        >
          <h2 className="font-semibold">{slipKind === "invoice" ? "Invoice" : "Receipt"}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => chooseSlip("receipt")}
              className="h-11 px-3 flex items-center gap-1.5 rounded-lg text-sm font-semibold"
              style={{ background: "var(--s-panel-alt)" }}
            >
              <Printer className="w-4 h-4" /> Slip
            </button>
            <button
              onClick={() => chooseSlip("invoice")}
              className="h-11 px-3 flex items-center gap-1.5 rounded-lg text-sm font-semibold"
              style={{ background: "var(--s-panel-alt)" }}
            >
              <FileText className="w-4 h-4" /> Invoice
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Receipt80mm data={data} preview />
        </div>

        {/* Pinned under the slip so WhatsApp is never buried below a long receipt. */}
        <div
          className="shrink-0 space-y-2 border-t px-4 py-3"
          style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
        >
          <ReceiptWhatsAppButton order={order} businessName={business.header} />
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
