"use client";

import { formatGHS } from "@/lib/money";
import Sheet from "./ui/Sheet";
import type { PosMenuItem, PosMenuSize } from "./types";

/**
 * Which size? Shown when a dish with sizes is tapped. Big targets with the
 * price on each, so the cashier picks in one tap without reading small print.
 */
export default function SizePickerSheet({
  item,
  onPick,
  onClose,
}: {
  item: PosMenuItem;
  onPick: (size: PosMenuSize) => void;
  onClose: () => void;
}) {
  const sizes = item.sizes ?? [];
  return (
    <Sheet eyebrow="Pick a size" title={item.name} onClose={onClose} size="sm">
      <div className={`grid gap-2 ${sizes.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            onClick={() => onPick(size)}
            className="flex min-h-24 flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition-transform active:scale-[0.97]"
            style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
          >
            <span className="text-base font-extrabold">{size.label}</span>
            <span className="money mt-1 text-sm font-semibold" style={{ color: "var(--s-brand)" }}>
              {formatGHS(size.price)}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
