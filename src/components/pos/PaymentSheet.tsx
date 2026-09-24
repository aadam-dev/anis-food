"use client";

import { useState } from "react";
import {
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  Split,
  Clock,
} from "lucide-react";
import { formatGHS, roundMoney, changeDue, type OrderTotals } from "@/lib/money";
import type { PaymentChoice } from "./types";
import CustomerFields from "./CustomerFields";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";

/**
 * Taking the money.
 *
 * The numpad is deliberately large: this is tapped hundreds of times a day, often
 * one-handed, sometimes by someone also holding a takeaway bag.
 */

const METHODS: { value: PaymentChoice; label: string; icon: typeof Banknote }[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "MOMO", label: "MoMo", icon: Smartphone },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "Transfer", icon: Building2 },
  { value: "SPLIT", label: "Split", icon: Split },
  { value: "UNPAID", label: "Pay later", icon: Clock },
];

/** Notes a cashier is most likely to be handed. */
const QUICK_CASH = [5, 10, 20, 50, 100, 200];

export default function PaymentSheet({
  totals,
  customerName,
  customerPhone,
  onCustomerName,
  onCustomerPhone,
  onClose,
  onConfirm,
}: {
  totals: OrderTotals;
  customerName: string;
  customerPhone: string;
  onCustomerName: (value: string) => void;
  onCustomerPhone: (value: string) => void;
  onClose: () => void;
  onConfirm: (
    method: PaymentChoice,
    extras: {
      tenderedAmount?: number;
      paymentReference?: string;
      splitPayments?: { method: string; amount: number; ref?: string }[];
      customerName?: string;
      customerPhone?: string;
    },
  ) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentChoice>("CASH");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
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

    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(method, {
        tenderedAmount: method === "CASH" && tendered !== "" ? tenderedValue : undefined,
        paymentReference: reference.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerName.trim() ? customerPhone.trim() || undefined : undefined,
        splitPayments:
          method === "SPLIT"
            ? [
                { method: "CASH", amount: splitCashValue },
                { method: "MOMO", amount: splitMomoValue },
              ]
            : undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not take that payment.");
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
    <Sheet
      eyebrow="Total due"
      title={<span className="money text-2xl">{formatGHS(totals.total)}</span>}
      onClose={onClose}
      dismissible={!submitting}
      footer={
        <div className="space-y-2">
          <SheetError message={error} />
          <Button
            size="lg"
            className="w-full"
            onClick={confirm}
            busy={submitting}
            disabled={short || splitInvalid}
          >
            {method === "UNPAID" ? "Send to kitchen" : `Take ${formatGHS(totals.total)}`}
          </Button>
        </div>
      }
    >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((entry) => {
              const Icon = entry.icon;
              const selected = method === entry.value;
              return (
                <button
                  key={entry.value}
                  onClick={() => setMethod(entry.value)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: selected ? "var(--s-brand)" : "var(--s-panel-alt)",
                    color: selected ? "#fff" : "var(--s-ink)",
                    border: selected ? "1px solid transparent" : "1px solid var(--s-border)",
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {entry.label}
                </button>
              );
            })}
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
            <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
              Goes to the kitchen now and waits on Tickets until it is paid for.
            </p>
          )}

          <CustomerFields
            name={customerName}
            phone={customerPhone}
            onName={onCustomerName}
            onPhone={onCustomerPhone}
          />
        </div>
    </Sheet>
  );
}
