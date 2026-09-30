"use client";

import { useState } from "react";
import { formatGHS } from "@/lib/money";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import Sheet from "./ui/Sheet";
import Button from "./ui/Button";

/** Punch a money amount — big readout, pad below, no text-field cursor tricks. */
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
  const [replaceFirst, setReplaceFirst] = useState(initialValue !== "");

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
        className="mb-4 rounded-[1.25rem] px-4 py-5 text-center"
        style={{
          background: "color-mix(in srgb, var(--s-brand) 8%, var(--s-panel-alt))",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--s-brand) 25%, var(--s-border))",
        }}
      >
        <p className="money text-[2.75rem] font-bold tracking-tight tabular-nums leading-none">
          {raw === "" ? (
            <span style={{ color: "var(--s-ink-faint)" }}>{formatGHS(0)}</span>
          ) : (
            formatGHS(Number(raw) || 0)
          )}
        </p>
      </div>
      <Numpad
        value={raw}
        onChange={setRaw}
        maxDigits={7}
        allowDecimal
        shortcuts={CASH_SHORTCUTS}
        replaceFirst={replaceFirst}
        onReplaceConsumed={() => setReplaceFirst(false)}
      />
    </Sheet>
  );
}
