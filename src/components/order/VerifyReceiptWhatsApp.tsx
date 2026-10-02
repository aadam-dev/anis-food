"use client";

import { useState } from "react";
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
  const [phone, setPhone] = useState(customerPhone?.trim() || "");
  const [needsPhone, setNeedsPhone] = useState(false);

  function share(to: string | null) {
    const message = receiptShareMessage({
      businessName,
      customerName,
      orderNumber,
      total,
      items,
      verifyUrl,
    });
    window.open(getWhatsAppShareUrl(to, message), "_blank", "noopener,noreferrer");
  }

  function openWhatsApp() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setNeedsPhone(true);
      return;
    }
    share(trimmed);
  }

  return (
    <div className="mt-4 space-y-2">
      {(needsPhone || !customerPhone?.trim()) && (
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="WhatsApp number (055…)"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            if (event.target.value.trim()) setNeedsPhone(false);
          }}
          className="w-full min-h-11 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold outline-none"
        />
      )}
      <button
        type="button"
        onClick={openWhatsApp}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
        style={{ background: "#128C7E" }}
      >
        <MessageCircle className="h-4 w-4" />
        Send on WhatsApp
      </button>
      {!phone.trim() && (
        <button
          type="button"
          onClick={() => share(null)}
          className="w-full text-center text-xs font-semibold text-neutral-500 underline-offset-2 hover:underline"
        >
          Or open WhatsApp without a number
        </button>
      )}
    </div>
  );
}
