"use client";

import { useState } from "react";
import { formatGHS } from "@/lib/money";
import { MAX_LINE_QTY } from "./cartReducer";
import Numpad, { QTY_SHORTCUTS } from "./Numpad";
import Sheet from "./ui/Sheet";
import Button from "./ui/Button";

/**
 * Punch a quantity for one cart line: open from a line, confirm writes
 * setQuantity, cancel leaves the cart alone. Zero removes the line.
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
  const quantity = Math.max(0, Math.min(maxQty, Math.trunc(Number(raw) || 0)));

  function confirm() {
    onConfirm(quantity);
    onClose();
  }

  return (
    <Sheet
      eyebrow="Quantity"
      title={productName}
      onClose={onClose}
      size="sm"
      footer={
        <Button size="lg" className="w-full" tone={quantity === 0 ? "danger" : "primary"} onClick={confirm}>
          {quantity === 0 ? "Remove from order" : `Set ${quantity}`}
        </Button>
      }
    >
      <div
        className="mb-4 flex items-baseline justify-between rounded-2xl border px-4 py-3"
        style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
      >
        <span className="money text-4xl font-bold">{raw || "0"}</span>
        {unitPrice !== undefined && (
          <span className="money text-sm" style={{ color: "var(--s-ink-muted)" }}>
            {formatGHS(unitPrice * quantity)}
          </span>
        )}
      </div>
      <Numpad value={raw} onChange={setRaw} maxDigits={3} shortcuts={QTY_SHORTCUTS} />
    </Sheet>
  );
}
