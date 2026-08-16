"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { formatGHS, roundMoney, changeDue, type OrderTotals } from "@/lib/money";
import type { PaymentChoice } from "./types";

/**
 * Taking the money.
 *
 * The numpad is deliberately large: this is tapped hundreds of times a day, often
 * one-handed, sometimes by someone also holding a takeaway bag.
 */

const METHODS: { value: PaymentChoice; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "Mobile Money" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Transfer" },
  { value: "SPLIT", label: "Split" },
  { value: "UNPAID", label: "Pay later" },
];

/** Notes a cashier is most likely to be handed. */
const QUICK_CASH = [5, 10, 20, 50, 100, 200];

export default function PaymentSheet({
  totals,
  onClose,
  onConfirm,
}: {
  totals: OrderTotals;
  onClose: () => void;
  onConfirm: (
    method: PaymentChoice,
    extras: {
      tenderedAmount?: number;
      paymentReference?: string;
      splitPayments?: { method: string; amount: number; ref?: string }[];
      customerName?: string;
    },
  ) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentChoice>("CASH");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenderedValue = Number(tendered) || 0;
  const short = method === "CASH" && tendered !== "" && tenderedValue + 0.01 < totals.total;
  const change = method === "CASH" && tendered !== "" ? changeDue(totals.total, tenderedValue) : null;

  const splitCashValue = Math.min(Number(splitCash) || 0, totals.total);
  const splitMomoValue = roundMoney(totals.total - splitCashValue);
  const splitInvalid = method === "SPLIT" && (splitCashValue <= 0 || splitMomoValue <= 0);

  async function confirm() {
    setError(null);
    if (short) {
      setError("That is less than the total.");
      return;
    }
    if (splitInvalid) {
      setError("Both parts of a split need to be more than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(method, {
        tenderedAmount: method === "CASH" && tendered !== "" ? tenderedValue : undefined,
        paymentReference: reference.trim() || undefined,
        customerName: method === "UNPAID" ? customerName.trim() || undefined : undefined,
        splitPayments:
          method === "SPLIT"
            ? [
                { method: "CASH", amount: splitCashValue },
                { method: "MOMO", amount: splitMomoValue },
              ]
            : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    background: "var(--s-panel-alt)",
    borderColor: "var(--s-border)",
    color: "var(--s-ink)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="Take payment"
        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border"
        style={{
          background: "var(--s-panel)",
          borderColor: "var(--s-border)",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-4 py-3 border-b"
          style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--s-ink-muted)" }}>
              Total due
            </p>
            <p className="money text-2xl font-bold">{formatGHS(totals.total)}</p>
          </div>
          <button
            onClick={onClose}
            className="h-11 w-11 grid place-items-center rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((entry) => (
              <button
                key={entry.value}
                onClick={() => setMethod(entry.value)}
                className="rounded-xl px-2 py-3 text-sm font-semibold"
                style={{
                  background: method === entry.value ? "var(--s-brand)" : "var(--s-panel-alt)",
                  color: method === entry.value ? "#fff" : "var(--s-ink-muted)",
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {method === "CASH" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Cash given</label>
              <input
                type="text"
                inputMode="decimal"
                value={tendered}
                onChange={(event) => setTendered(event.target.value.replace(/[^\d.]/g, ""))}
                placeholder={totals.total.toFixed(2)}
                className="money w-full rounded-xl border px-3 py-3 text-right text-xl outline-none focus:ring-2"
                style={fieldStyle}
              />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTendered(totals.total.toFixed(2))}
                  className="rounded-lg py-2.5 text-sm font-semibold"
                  style={{ background: "var(--s-panel-alt)" }}
                >
                  Exact
                </button>
                {QUICK_CASH.filter((note) => note >= totals.total)
                  .slice(0, 2)
                  .map((note) => (
                    <button
                      key={note}
                      onClick={() => setTendered(String(note))}
                      className="money rounded-lg py-2.5 text-sm font-semibold"
                      style={{ background: "var(--s-panel-alt)" }}
                    >
                      {note}
                    </button>
                  ))}
              </div>
              {change !== null && !short && (
                <p className="mt-3 flex justify-between text-lg font-bold">
                  <span>Change</span>
                  <span className="money" style={{ color: "var(--s-good)" }}>
                    {formatGHS(change)}
                  </span>
                </p>
              )}
              {short && (
                <p className="mt-2 text-sm" style={{ color: "var(--s-bad)" }}>
                  That is {formatGHS(totals.total - tenderedValue)} short.
                </p>
              )}
            </div>
          )}

          {(method === "MOMO" || method === "BANK_TRANSFER" || method === "CARD") && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Reference <span style={{ color: "var(--s-ink-faint)" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Transaction ID"
                className="w-full rounded-xl border px-3 py-3 outline-none focus:ring-2"
                style={fieldStyle}
              />
            </div>
          )}

          {method === "SPLIT" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Paid in cash</label>
              <input
                type="text"
                inputMode="decimal"
                value={splitCash}
                onChange={(event) => setSplitCash(event.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className="money w-full rounded-xl border px-3 py-3 text-right text-xl outline-none focus:ring-2"
                style={fieldStyle}
              />
              <p className="flex justify-between text-sm" style={{ color: "var(--s-ink-muted)" }}>
                <span>The rest on Mobile Money</span>
                <span className="money">{formatGHS(splitMomoValue)}</span>
              </p>
            </div>
          )}

          {method === "UNPAID" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Who is this for?</label>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Name or table"
                className="w-full rounded-xl border px-3 py-3 outline-none focus:ring-2"
                style={fieldStyle}
              />
              <p className="mt-2 text-xs" style={{ color: "var(--s-ink-faint)" }}>
                Goes to the kitchen now and waits on the Tickets tab until it is paid for.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--s-bad)" }}>
              {error}
            </p>
          )}

          <button
            onClick={confirm}
            disabled={submitting || short || splitInvalid}
            className="w-full rounded-xl px-4 py-4 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--s-brand)" }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {method === "UNPAID" ? "Send to kitchen" : `Take ${formatGHS(totals.total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
