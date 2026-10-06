"use client";

import { useState } from "react";
import { formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import type { OrderView } from "./types";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { FieldInput, FieldSelect } from "./ui/Field";
import MethodMark from "./MethodMark";
import { posRequest, usePosAction } from "./usePosAction";

const METHODS = ["CASH", "MOMO", "CARD", "BOLT_FOOD", "SPLIT"] as const;
const SPLIT_METHODS = ["CASH", "MOMO", "CARD"] as const;

const LABELS: Record<string, string> = {
  CASH: "Cash",
  MOMO: "MoMo",
  CARD: "Card",
  BOLT_FOOD: "Bolt",
  SPLIT: "Split",
};

/**
 * Fix the tender on a sale while the shift is still open.
 * Collecting a Bolt payout is the same action: it marks the order paid.
 */
export default function PaymentCorrectionSheet({
  order,
  endpoint,
  onClose,
  onSaved,
}: {
  order: OrderView;
  endpoint: string;
  onClose: () => void;
  onSaved: (order: OrderView) => void;
}) {
  const [method, setMethod] = useState<(typeof METHODS)[number]>(
    METHODS.includes(order.paymentMethod as (typeof METHODS)[number])
      ? (order.paymentMethod as (typeof METHODS)[number])
      : "CASH",
  );
  const [legs, setLegs] = useState<
    { method: (typeof SPLIT_METHODS)[number]; amount: string }[]
  >([
    { method: "CASH", amount: "" },
    { method: "MOMO", amount: "" },
  ]);
  const { run, busy, error } = usePosAction();

  const legAmounts = legs.map((leg, index) => {
    if (index === legs.length - 1) {
      const prior = legs.slice(0, -1).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      return roundMoney(Math.max(0, order.total - prior));
    }
    return roundMoney(Number(leg.amount) || 0);
  });
  const splitInvalid = method === "SPLIT" && legAmounts.some((amount) => amount <= 0);

  async function save() {
    if (splitInvalid) return;
    const data = await run(() =>
      posRequest<{ order: OrderView }>(endpoint, "PATCH", {
        action: "payment",
        paymentMethod: method,
        splitPayments:
          method === "SPLIT"
            ? legs.map((leg, index) => ({ method: leg.method, amount: legAmounts[index] }))
            : undefined,
      }),
    );
    if (data) onSaved(data.order);
  }

  return (
    <Sheet
      eyebrow={`Order ${callNumber(order.orderNumber)}`}
      title="Fix the payment"
      subtitle={<span className="money font-semibold">{formatGHS(order.total)}</span>}
      onClose={onClose}
      dismissible={!busy}
      footer={
        <Button size="lg" className="w-full" busy={busy} disabled={splitInvalid} onClick={save}>
          Save payment
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold"
              style={{
                background: method === value ? "var(--s-brand)" : "var(--s-panel-alt)",
                color: method === value ? "#fff" : "var(--s-ink)",
                boxShadow: method === value ? undefined : "inset 0 0 0 1px var(--s-border)",
              }}
            >
              <MethodMark method={value} />
              {LABELS[value]}
            </button>
          ))}
        </div>
        {method === "BOLT_FOOD" && (
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Bolt collects this. It leaves the drawer until the payout is recorded as a transfer.
          </p>
        )}
        {method === "SPLIT" && (
          <div className="space-y-2">
            {legs.map((leg, index) => {
              const last = index === legs.length - 1;
              return (
                <div key={index} className="grid grid-cols-[1fr_8rem] gap-2">
                  <FieldSelect
                    aria-label={`Part ${index + 1} method`}
                    value={leg.method}
                    onChange={(event) => {
                      const next = event.target.value as (typeof SPLIT_METHODS)[number];
                      setLegs((current) =>
                        current.map((entry, i) => (i === index ? { ...entry, method: next } : entry)),
                      );
                    }}
                  >
                    {SPLIT_METHODS.map((option) => (
                      <option key={option} value={option}>
                        {LABELS[option]}
                      </option>
                    ))}
                  </FieldSelect>
                  <FieldInput
                    aria-label={`Part ${index + 1} amount`}
                    inputMode="decimal"
                    value={last ? legAmounts[index].toFixed(2) : leg.amount}
                    readOnly={last}
                    onChange={(event) => {
                      const amount = event.target.value.replace(/[^\d.]/g, "");
                      setLegs((current) =>
                        current.map((entry, i) => (i === index ? { ...entry, amount } : entry)),
                      );
                    }}
                    className="money text-right"
                  />
                </div>
              );
            })}
          </div>
        )}
        <SheetError message={error} />
      </div>
    </Sheet>
  );
}
