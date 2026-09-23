"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { formatGHS } from "@/lib/money";
import Numpad from "./Numpad";

/**
 * Punch a money amount for opening float or cash in/out.
 */
export default function AmountEntrySheet({
  title,
  subtitle,
  initialValue,
  onConfirm,
  onClose,
  doneLabel = "Use this amount",
}: {
  title: string;
  subtitle?: string;
  initialValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
  doneLabel?: string;
}) {
  const [raw, setRaw] = useState(initialValue);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label="Cancel amount"
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
            <h2 className="font-bold">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {subtitle}
              </p>
            )}
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
          {raw === "" ? "—" : formatGHS(Number(raw) || 0)}
        </div>

        <Numpad
          value={raw}
          onChange={setRaw}
          onDone={() => {
            onConfirm(raw);
            onClose();
          }}
          doneLabel={doneLabel}
          maxDigits={7}
          allowDecimal
        />
      </section>
    </div>
  );
}
