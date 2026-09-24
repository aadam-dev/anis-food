"use client";

import { useState } from "react";
import { formatGHS } from "@/lib/money";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import Sheet from "./ui/Sheet";
import Button from "./ui/Button";

/** Punch a money amount. */
export default function AmountEntrySheet({
  title,
  subtitle,
  initialValue,
  onConfirm,
  onClose,
  doneLabel = "Use this amount",
  allowEmpty = false,
  emptyLabel = "Not recorded",
}: {
  title: string;
  subtitle?: string;
  initialValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
  doneLabel?: string;
  /** For optional figures like MoMo, where blank means "not checked". */
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [raw, setRaw] = useState(initialValue);

  return (
    <Sheet
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size="sm"
      footer={
        <div className="grid gap-2">
          <Button
            size="lg"
            className="w-full"
            disabled={!allowEmpty && raw === ""}
            onClick={() => {
              onConfirm(raw);
              onClose();
            }}
          >
            {doneLabel}
          </Button>
          {allowEmpty && (
            <Button
              tone="ghost"
              className="w-full"
              onClick={() => {
                onConfirm("");
                onClose();
              }}
            >
              {emptyLabel}
            </Button>
          )}
        </div>
      }
    >
      <div
        className="money mb-4 rounded-2xl border px-4 py-3 text-right text-4xl font-bold"
        style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
      >
        {raw === "" ? <span style={{ color: "var(--s-ink-faint)" }}>{formatGHS(0)}</span> : formatGHS(Number(raw) || 0)}
      </div>
      <Numpad
        value={raw}
        onChange={setRaw}
        maxDigits={7}
        allowDecimal
        shortcuts={CASH_SHORTCUTS}
      />
    </Sheet>
  );
}
