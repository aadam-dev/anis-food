"use client";

import { useState } from "react";
import { formatGHS } from "@/lib/money";
import { MAX_LINE_QTY } from "./cartReducer";
import Numpad, { QTY_SHORTCUTS } from "./Numpad";
import Sheet from "./ui/Sheet";
import Button from "./ui/Button";

/**
 * Punch a quantity for one cart line — al-boyut style.
 *
 * The current quantity seeds the display. The first digit (or a shortcut)
 * replaces it, so an order of 50 is five-zero, not fifty taps on +. Zero removes
 * the line.
 */
export default function QuantityEntrySheet({
  productName,
  unitPrice,
  initialQty,
  maxQty = MAX_LINE_QTY,
  onConfirm,
  onClose,
}: {
  productName: string;
  unitPrice?: number;
  initialQty: number;
  maxQty?: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState(initialQty > 0 ? String(initialQty) : "");
  const [replaceFirst, setReplaceFirst] = useState(initialQty > 0);
  const quantity = Math.max(0, Math.min(maxQty, Math.trunc(Number(raw) || 0)));

  function confirm() {
    onConfirm(quantity);
    onClose();
  }

  return (
    <Sheet
      eyebrow="Tap to type"
      title={productName}
      subtitle="Punch the quantity — first digit replaces the current count."
      onClose={onClose}
      size="sm"
      footer={
        <Button size="lg" className="w-full" tone={quantity === 0 ? "danger" : "primary"} onClick={confirm}>
          {quantity === 0 ? "Remove from order" : `Set quantity to ${quantity}`}
        </Button>
      }
    >
      <div
        className="mb-4 rounded-[1.25rem] px-4 py-5 text-center"
        style={{
          background: "color-mix(in srgb, var(--s-brand) 8%, var(--s-panel-alt))",
          border: "1px solid color-mix(in srgb, var(--s-brand) 25%, var(--s-border))",
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "var(--s-ink-faint)" }}
        >
          Quantity
        </p>
        <p className="money mt-1 text-5xl font-bold tracking-tight tabular-nums leading-none">
          {raw || "0"}
        </p>
        {unitPrice !== undefined && (
          <p className="money mt-2 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Line total {formatGHS(unitPrice * quantity)}
          </p>
        )}
      </div>
      <Numpad
        value={raw}
        onChange={setRaw}
        maxDigits={3}
        shortcuts={QTY_SHORTCUTS}
        replaceFirst={replaceFirst}
        onReplaceConsumed={() => setReplaceFirst(false)}
      />
    </Sheet>
  );
}
