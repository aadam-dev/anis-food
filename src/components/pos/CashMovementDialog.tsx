"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatGHS } from "@/lib/money";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { posRequest, usePosAction } from "./usePosAction";

const CASH_OUT_REASONS = [
  "Bought gas",
  "Bought ingredients",
  "Paid supplier",
  "Paid delivery rider",
  "Banked takings",
] as const;

const CASH_IN_REASONS = ["Change from bank", "Float top-up", "Owner put in"] as const;

/**
 * Money in or out of the drawer that is not a sale.
 *
 * The amount is punched, the reason is required (a chip or a typed line), and a
 * manager can file a cash-out straight into the expense book in the same step so
 * the till and the books agree.
 */
export default function CashMovementDialog({
  expenseCategories,
  canFileExpense,
  onClose,
  onRecorded,
}: {
  expenseCategories: { id: string; name: string }[];
  canFileExpense: boolean;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [direction, setDirection] = useState<"OUT" | "IN">("OUT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [fileAsExpense, setFileAsExpense] = useState(false);
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const { run, busy, error } = usePosAction();

  const value = Number(amount) || 0;
  const chips = direction === "OUT" ? CASH_OUT_REASONS : CASH_IN_REASONS;
  const showExpense = canFileExpense && direction === "OUT" && expenseCategories.length > 0;
  const filing = showExpense && fileAsExpense;
  const ready = value > 0 && reason.trim().length >= 3 && (!filing || !!categoryId);

  async function record() {
    if (!ready) return;
    const done = await run(() =>
      posRequest("/api/pos/cash-movements", "POST", {
        direction,
        amount: value,
        reason: reason.trim(),
        expenseCategoryId: filing ? categoryId : undefined,
      }),
    );
    if (done) {
      onRecorded();
      onClose();
    }
  }

  const fieldStyle = {
    background: "var(--s-panel-alt)",
    borderColor: "var(--s-border)",
    color: "var(--s-ink)",
  };

  return (
    <Sheet
      title="Cash in or out"
      subtitle="Anything that is not a sale."
      onClose={onClose}
      dismissible={!busy}
      footer={
        <Button size="lg" className="w-full" busy={busy} disabled={!ready} onClick={record}>
          {value > 0
            ? `Record ${direction === "OUT" ? "−" : "+"}${formatGHS(value)}`
            : "Enter an amount"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl p-1" style={{ background: "var(--s-panel-alt)" }}>
          {(
            [
              ["OUT", "Took out", ArrowUpRight],
              ["IN", "Put in", ArrowDownLeft],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={direction === value}
              onClick={() => {
                setDirection(value);
                setReason("");
                setFileAsExpense(false);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold"
              style={{
                background: direction === value ? "var(--s-panel)" : "transparent",
                color: direction === value ? "var(--s-ink)" : "var(--s-ink-muted)",
                boxShadow: direction === value ? "0 1px 2px rgba(0,0,0,0.2)" : undefined,
              }}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div
          className="money rounded-2xl border px-4 py-3 text-right text-4xl font-bold"
          style={{
            ...fieldStyle,
            color: value > 0 ? (direction === "OUT" ? "var(--s-bad)" : "var(--s-good)") : "var(--s-ink-faint)",
          }}
        >
          {direction === "OUT" ? "−" : "+"}
          {formatGHS(value)}
        </div>

        <Numpad value={amount} onChange={setAmount} maxDigits={7} allowDecimal shortcuts={CASH_SHORTCUTS} />

        <div>
          <p className="mb-2 text-sm font-medium">What was it for?</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                aria-pressed={reason === chip}
                onClick={() => setReason(chip)}
                className="rounded-full border px-3 py-2 text-xs font-semibold"
                style={{
                  borderColor: reason === chip ? "var(--s-brand)" : "var(--s-border)",
                  background:
                    reason === chip
                      ? "color-mix(in srgb, var(--s-brand) 14%, var(--s-panel))"
                      : "var(--s-panel-alt)",
                  color: "var(--s-ink)",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            placeholder="Or type the reason"
            className="mt-2 w-full rounded-2xl border px-3 py-3 text-sm outline-none"
            style={fieldStyle}
          />
        </div>

        {showExpense && (
          <div className="rounded-2xl border p-3" style={{ borderColor: "var(--s-border)" }}>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={fileAsExpense}
                onChange={(event) => setFileAsExpense(event.target.checked)}
                className="h-5 w-5"
                style={{ accentColor: "var(--s-brand)" }}
              />
              Also file it in the expense book
            </label>
            {fileAsExpense && (
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                aria-label="Expense category"
                className="mt-3 w-full rounded-xl border px-3 py-3 text-sm outline-none"
                style={fieldStyle}
              >
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <SheetError message={error} />
      </div>
    </Sheet>
  );
}
