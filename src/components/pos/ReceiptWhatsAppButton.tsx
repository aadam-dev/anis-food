"use client";

import { MessageCircle } from "lucide-react";
import { callNumber } from "@/lib/session-utils";
import { getWhatsAppShareUrl, receiptShareMessage } from "@/lib/utils";
import type { OrderView } from "@/components/pos/types";

/**
 * Opens WhatsApp with a prefilled receipt summary + verify link.
 * True PDF attachment is not available via wa.me; the verify page is the
 * shareable digital copy the customer can save or forward.
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

  function openWhatsApp() {
    let phone = order.customerPhone?.trim() || "";
    if (!phone && typeof window !== "undefined") {
      const typed = window.prompt(
        "Customer WhatsApp number (e.g. 055…).",
        "",
      );
      if (typed === null) return;
      phone = typed.trim();
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

    window.open(getWhatsAppShareUrl(phone || null, message), "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}
      style={{
        borderColor: "color-mix(in srgb, #25D366 45%, var(--s-border))",
        background: "color-mix(in srgb, #25D366 14%, var(--s-panel))",
        color: "var(--s-ink)",
      }}
    >
      <MessageCircle className="h-4 w-4" style={{ color: "#128C7E" }} />
      Send on WhatsApp
    </button>
  );
}
