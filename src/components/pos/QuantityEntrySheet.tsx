"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Numpad from "./Numpad";

/**
 * Punch a quantity for one cart line.
 *
 * Mirrors the al-boyut QuantityEntrySheet wiring: open from a product or line,
 * confirm writes setQuantity, cancel leaves the cart alone.
 */
export default function QuantityEntrySheet({
  productName,
  initialQty,
  maxQty = 999,
  onConfirm,
  onClose,
}: {
  productName: string;
  initialQty: number;
  maxQty?: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState(initialQty > 0 ? String(initialQty) : "");

  function confirm() {
    const quantity = Math.max(0, Math.min(maxQty, Math.trunc(Number(raw) || 0)));
    onConfirm(quantity);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label="Cancel quantity"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />
      <section
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border p-4"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-medium" style={{ color: "var(--s-ink-faint)" }}>
              Quantity
            </p>
            <h2 className="font-bold truncate">{productName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 grid place-items-center rounded-lg shrink-0"
            style={{ color: "var(--s-ink-muted)" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="money mb-4 rounded-xl border px-4 py-3 text-right text-3xl font-bold"
          style={{
            background: "var(--s-panel-alt)",
            borderColor: "var(--s-border)",
            color: "var(--s-ink)",
          }}
        >
          {raw || "0"}
        </div>

        <Numpad value={raw} onChange={setRaw} onDone={confirm} doneLabel="Set quantity" maxDigits={3} />
      </section>
    </div>
  );
}
