"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark } from "lucide-react";
import { formatGHS } from "@/lib/money";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { FieldInput, FieldLabel, FieldSelect, SegmentedControl } from "./ui/Field";
import { posRequest, usePosAction } from "./usePosAction";

type Kind = "IN" | "SPEND" | "DEPOSIT";
type Destination = "MOMO" | "BANK";

const SPEND_REASONS = ["Bought gas", "Bought ingredients", "Paid supplier", "Paid delivery rider"] as const;
const IN_REASONS = ["Change from bank", "Float top-up", "Owner put in"] as const;

/**
 * Money in or out of the drawer that is not a sale.
 *
 * A spend always files an expense. A deposit moves cash into MoMo or the bank
 * and is not a cost. Put-in is float or change.
 */
export default function CashMovementDialog({
  expenseCategories,
  onClose,
  onRecorded,
}: {
  expenseCategories: { id: string; name: string }[];
  canFileExpense?: boolean;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [kind, setKind] = useState<Kind>("SPEND");
  const [destination, setDestination] = useState<Destination>("BANK");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const { run, busy, error } = usePosAction();

  const value = Number(amount) || 0;
  const chips = kind === "IN" ? IN_REASONS : kind === "SPEND" ? SPEND_REASONS : [];
  const canSubmit =
    value > 0 && reason.trim().length >= 3 && (kind !== "SPEND" || (!!categoryId && expenseCategories.length > 0));

  async function record() {
    if (!canSubmit) return;
    const done = await run(() =>
      posRequest("/api/pos/cash-movements", "POST", {
        kind,
        amount: value,
        reason: reason.trim(),
        expenseCategoryId: kind === "SPEND" ? categoryId : undefined,
        destination: kind === "DEPOSIT" ? destination : undefined,
      }),
    );
    if (done) {
      onRecorded();
      onClose();
    }
  }

  const tone = kind === "IN" ? "var(--s-good)" : "var(--s-bad)";

  return (
    <Sheet
      title="Move money"
      subtitle="Float, a spend, or a deposit. Spends are filed in the books."
      onClose={onClose}
      dismissible={!busy}
      footer={
        <Button size="lg" className="w-full" busy={busy} disabled={!canSubmit} onClick={record}>
          {value > 0 ? `Record ${formatGHS(value)}` : "Enter an amount"}
        </Button>
      }
    >
      <div className="space-y-4">
        <SegmentedControl
          ariaLabel="Movement"
          value={kind}
          onChange={(next) => {
            setKind(next);
            setReason(next === "DEPOSIT" ? "Cash deposited" : "");
          }}
          options={[
            { value: "IN", label: "Put in", icon: <ArrowDownLeft className="h-3.5 w-3.5" /> },
            { value: "SPEND", label: "Spent", icon: <ArrowUpRight className="h-3.5 w-3.5" /> },
            { value: "DEPOSIT", label: "Deposit", icon: <Landmark className="h-3.5 w-3.5" /> },
          ]}
        />

        <div
          className="money rounded-2xl border px-4 py-3 text-right text-3xl font-bold"
          style={{
            background: "var(--s-panel-alt)",
            borderColor: "var(--s-border)",
            color: value > 0 ? tone : "var(--s-ink-faint)",
          }}
        >
          {kind === "IN" ? "+" : "−"}
          {formatGHS(value)}
        </div>

        <Numpad value={amount} onChange={setAmount} maxDigits={7} allowDecimal shortcuts={CASH_SHORTCUTS} />

        {kind === "DEPOSIT" && (
          <SegmentedControl
            ariaLabel="Deposit destination"
            value={destination}
            onChange={setDestination}
            options={[
              { value: "BANK", label: "Bank" },
              { value: "MOMO", label: "MoMo" },
            ]}
          />
        )}

        {kind === "SPEND" && (
          <div>
            <FieldLabel htmlFor="spend-category">Category</FieldLabel>
            <FieldSelect
              id="spend-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </FieldSelect>
          </div>
        )}

        <div>
          <FieldLabel>What was it for?</FieldLabel>
          {chips.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
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
          )}
          <FieldInput
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            placeholder={kind === "DEPOSIT" ? "Cash deposited" : "Reason"}
          />
        </div>
        {kind === "SPEND" && expenseCategories.length === 0 && (
          <p className="text-sm" style={{ color: "var(--s-warn)" }}>
            Add an expense category in the back office before recording a spend.
          </p>
        )}
        <SheetError message={error} />
      </div>
    </Sheet>
  );
}
