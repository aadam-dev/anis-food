"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { callNumber } from "@/lib/session-utils";
import { getWhatsAppShareUrl, receiptShareMessage } from "@/lib/utils";
import type { OrderView } from "@/components/pos/types";

/**
 * Opens WhatsApp with a prefilled receipt summary + verify link.
 * True PDF attachment is not available via wa.me; the verify page is the
 * shareable digital copy the customer can save or forward.
 *
 * Uses an inline phone field instead of window.prompt — prompts are blocked
 * or silent in standalone PWA / fullscreen Chrome on the till.
 */
export default function ReceiptWhatsAppButton({
  order,
  businessName,
  className = "",
}: {
  order: OrderView;
  businessName: string;
  className?: string;
}) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const verifyUrl = `${siteUrl}/receipt/${order.clientRef}`;
  const [phone, setPhone] = useState(order.customerPhone?.trim() || "");
  const [needsPhone, setNeedsPhone] = useState(false);

  function openWhatsApp() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setNeedsPhone(true);
      return;
    }

    const message = receiptShareMessage({
      businessName,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      callNumber: callNumber(order.orderNumber),
      total: order.total,
      items: order.items.map((item) => ({ quantity: item.quantity, name: item.name })),
      verifyUrl,
    });

    window.open(getWhatsAppShareUrl(trimmed, message), "_blank", "noopener,noreferrer");
  }

  function openPicker() {
    const message = receiptShareMessage({
      businessName,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      callNumber: callNumber(order.orderNumber),
      total: order.total,
      items: order.items.map((item) => ({ quantity: item.quantity, name: item.name })),
      verifyUrl,
    });
    window.open(getWhatsAppShareUrl(null, message), "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {(needsPhone || !order.customerPhone?.trim()) && (
        <div className="space-y-1">
          <label
            htmlFor="receipt-wa-phone"
            className="block text-xs font-semibold"
            style={{ color: "var(--s-ink-muted)" }}
          >
            Customer WhatsApp number
          </label>
          <input
            id="receipt-wa-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="055…"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              if (event.target.value.trim()) setNeedsPhone(false);
            }}
            className="w-full min-h-11 rounded-xl border px-3.5 text-sm font-semibold outline-none"
            style={{
              background: "var(--s-panel-alt)",
              borderColor: needsPhone ? "var(--s-bad)" : "var(--s-border)",
              color: "var(--s-ink)",
            }}
          />
          {needsPhone && (
            <p className="text-xs font-medium" style={{ color: "var(--s-bad)" }}>
              Enter a number, or open WhatsApp to pick a contact.
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={openWhatsApp}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white"
        style={{ background: "#128C7E" }}
      >
        <MessageCircle className="h-4 w-4" />
        Send on WhatsApp
      </button>
      {!phone.trim() && (
        <button
          type="button"
          onClick={openPicker}
          className="w-full text-center text-xs font-semibold underline-offset-2 hover:underline"
          style={{ color: "var(--s-ink-muted)" }}
        >
          Or open WhatsApp without a number
        </button>
      )}
    </div>
  );
}
