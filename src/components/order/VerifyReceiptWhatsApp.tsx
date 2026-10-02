"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppShareUrl, receiptShareMessage } from "@/lib/utils";

export default function VerifyReceiptWhatsApp({
  businessName,
  customerName,
  customerPhone,
  orderNumber,
  total,
  items,
  verifyUrl,
}: {
  businessName: string;
  customerName: string | null;
  customerPhone: string | null;
  orderNumber: string;
  total: number;
  items: { quantity: number; name: string }[];
  verifyUrl: string;
}) {
  function openWhatsApp() {
    let phone = customerPhone?.trim() || "";
    if (!phone && typeof window !== "undefined") {
      const typed = window.prompt("WhatsApp number to send this receipt to:", "");
      if (typed === null) return;
      phone = typed.trim();
    }

    const message = receiptShareMessage({
      businessName,
      customerName,
      orderNumber,
      total,
      items,
      verifyUrl,
    });

    window.open(getWhatsAppShareUrl(phone || null, message), "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
      style={{ background: "#128C7E" }}
    >
      <MessageCircle className="h-4 w-4" />
      Send on WhatsApp
    </button>
  );
}
