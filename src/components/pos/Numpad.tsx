"use client";

import { Delete } from "lucide-react";

/**
 * Punch pad for quantities and till amounts.
 *
 * Used by the quantity sheet and by shift open / cash in-out so a cashier never
 * has to hunt for a tiny text field with greasy fingers.
 */
const SHORTCUTS = [10, 20, 50, 100] as const;

export default function Numpad({
  value,
  onChange,
  onDone,
  doneLabel = "Done",
  maxDigits = 3,
  allowDecimal = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onDone: () => void;
  doneLabel?: string;
  /** Whole quantities stay short; money fields need room for cedis. */
  maxDigits?: number;
  allowDecimal?: boolean;
}) {
  function append(digit: string) {
    if (digit === ".") {
      if (!allowDecimal || value.includes(".")) return;
      onChange(value === "" ? "0." : `${value}.`);
      return;
    }
    const next = value === "0" && digit !== "." ? digit : `${value}${digit}`;
    const [whole, frac = ""] = next.split(".");
    if (whole.replace(/^0+/, "").length > maxDigits && whole !== "0") return;
    if (frac.length > 2) return;
    onChange(next);
  }

  function backspace() {
    onChange(value.slice(0, -1));
  }

  function clear() {
    onChange("");
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "." : "", "0", "back"] as const;

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {SHORTCUTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(String(amount))}
            className="flex-1 rounded-xl border py-2.5 text-sm font-bold"
            style={{
              borderColor: "var(--s-border)",
              background: "var(--s-panel-alt)",
              color: "var(--s-ink)",
            }}
          >
            {amount}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.map((key, index) => {
          if (key === "") {
            return <span key={`empty-${index}`} />;
          }
          if (key === "back") {
            return (
              <button
                key="back"
                type="button"
                onClick={backspace}
                onContextMenu={(event) => {
                  event.preventDefault();
                  clear();
                }}
                aria-label="Backspace"
                className="rounded-xl border py-3.5 grid place-items-center font-semibold"
                style={{
                  borderColor: "var(--s-border)",
                  background: "var(--s-panel-alt)",
                  color: "var(--s-ink)",
                }}
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => append(key)}
              className="money rounded-xl border py-3.5 text-xl font-bold"
              style={{
                borderColor: "var(--s-border)",
                background: "var(--s-panel)",
                color: "var(--s-ink)",
              }}
            >
              {key}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={clear}
          className="rounded-xl border py-3 text-sm font-semibold"
          style={{ borderColor: "var(--s-border)", color: "var(--s-ink-muted)" }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl py-3 text-sm font-bold text-white"
          style={{ background: "var(--s-brand)" }}
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
