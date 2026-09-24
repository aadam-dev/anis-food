"use client";

import { Delete } from "lucide-react";

/**
 * Punch pad for quantities and till amounts.
 *
 * Used by the quantity sheet, shift open, cash in/out and the drawer count so a
 * cashier never has to hunt for a tiny text field with greasy fingers.
 */
export const QTY_SHORTCUTS = [10, 20, 50, 100] as const;
export const CASH_SHORTCUTS = [50, 100, 200, 500] as const;

/** Applies one key press to the current value. Pure, so it can be tested. */
export function applyNumpadKey(
  value: string,
  key: string,
  { maxDigits, allowDecimal }: { maxDigits: number; allowDecimal: boolean },
): string {
  if (key === "back") return value.slice(0, -1);
  if (key === "clear") return "";
  if (key === ".") {
    if (!allowDecimal || value.includes(".")) return value;
    return value === "" ? "0." : `${value}.`;
  }
  if (!/^\d$/.test(key)) return value;
  const next = value === "0" ? key : `${value}${key}`;
  const [whole, frac] = next.split(".");
  if (whole.length > maxDigits) return value;
  if (frac !== undefined && frac.length > 2) return value;
  return next;
}

export default function Numpad({
  value,
  onChange,
  onDone,
  doneLabel = "Done",
  maxDigits = 3,
  allowDecimal = false,
  shortcuts = QTY_SHORTCUTS,
  shortcutPrefix = "",
}: {
  value: string;
  onChange: (next: string) => void;
  /** Omit when the sheet footer carries the confirm button. */
  onDone?: () => void;
  doneLabel?: string;
  maxDigits?: number;
  allowDecimal?: boolean;
  shortcuts?: readonly number[];
  shortcutPrefix?: string;
}) {
  const press = (key: string) => onChange(applyNumpadKey(value, key, { maxDigits, allowDecimal }));
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "." : "clear", "0", "back"];

  const keyStyle = {
    borderColor: "var(--s-border)",
    background: "var(--s-panel-alt)",
    color: "var(--s-ink)",
  };

  return (
    <div>
      {shortcuts.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-2">
          {shortcuts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onChange(String(amount))}
              className="money rounded-xl border py-2.5 text-sm font-bold active:scale-[0.97] transition-transform"
              style={{
                borderColor: "color-mix(in srgb, var(--s-brand) 35%, var(--s-border))",
                background: "color-mix(in srgb, var(--s-brand) 10%, var(--s-panel))",
                color: "var(--s-ink)",
              }}
            >
              {shortcutPrefix}
              {amount}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => {
          if (key === "back") {
            return (
              <button
                key="back"
                type="button"
                onClick={() => press("back")}
                aria-label="Backspace"
                className="rounded-xl border py-3.5 grid place-items-center active:scale-[0.97] transition-transform"
                style={keyStyle}
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          if (key === "clear") {
            return (
              <button
                key="clear"
                type="button"
                onClick={() => press("clear")}
                className="rounded-xl border py-3.5 text-sm font-semibold active:scale-[0.97] transition-transform"
                style={{ ...keyStyle, color: "var(--s-ink-muted)" }}
              >
                Clear
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="money rounded-xl border py-3.5 text-xl font-bold active:scale-[0.97] transition-transform"
              style={{ ...keyStyle, background: "var(--s-panel)" }}
            >
              {key}
            </button>
          );
        })}
      </div>

      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="mt-3 w-full rounded-2xl py-3.5 text-sm font-bold text-white"
          style={{ background: "var(--s-brand)" }}
        >
          {doneLabel}
        </button>
      )}
    </div>
  );
}
