"use client";

import { useState } from "react";
import { formatGHS, roundMoney, changeDue, type OrderTotals } from "@/lib/money";
import type { PaymentChoice } from "./types";
import { OrderContextBar, type FulfillmentType } from "./CustomerFields";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { FieldInput, FieldLabel, FieldSelect } from "./ui/Field";
import MethodMark from "./MethodMark";

/**
 * Taking the money.
 *
 * The numpad is deliberately large: this is tapped hundreds of times a day, often
 * one-handed, sometimes by someone also holding a takeaway bag.
 */

const METHODS: { value: PaymentChoice; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Transfer" },
  { value: "BOLT_FOOD", label: "Bolt" },
  { value: "SPLIT", label: "Split" },
  { value: "UNPAID", label: "Pay later" },
];

const SPLIT_METHODS = ["CASH", "MOMO", "CARD", "BANK_TRANSFER"] as const;

export default function PaymentSheet({
  totals,
  fulfillment,
  onFulfillment,
  customerName,
  customerPhone,
  customerAddress,
  onCustomerName,
  onCustomerPhone,
  onCustomerAddress,
  tables = [],
  tableId = "",
  onTable,
  onClose,
  onConfirm,
}: {
  totals: OrderTotals;
  fulfillment: FulfillmentType;
  onFulfillment: (value: FulfillmentType) => void;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  onCustomerName: (value: string) => void;
  onCustomerPhone: (value: string) => void;
  onCustomerAddress: (value: string) => void;
  tables?: { id: string; label: string; area: string; occupied: boolean }[];
  tableId?: string;
  onTable?: (id: string) => void;
  onClose: () => void;
  onConfirm: (
    method: PaymentChoice,
    extras: {
      tenderedAmount?: number;
      paymentReference?: string;
      splitPayments?: { method: string; amount: number; ref?: string }[];
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
    },
  ) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentChoice>("CASH");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [legs, setLegs] = useState<
    { method: (typeof SPLIT_METHODS)[number]; amount: string }[]
  >([
    { method: "CASH", amount: "" },
    { method: "MOMO", amount: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenderedValue = Number(tendered) || 0;
  const short = method === "CASH" && tendered !== "" && tenderedValue + 0.01 < totals.total;
  const change = method === "CASH" && tendered !== "" ? changeDue(totals.total, tenderedValue) : null;

  const legAmounts = legs.map((leg, index) => {
    if (index === legs.length - 1) {
      const prior = legs
        .slice(0, -1)
        .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      return roundMoney(Math.max(0, totals.total - prior));
    }
    return roundMoney(Number(leg.amount) || 0);
  });
  const splitInvalid =
    method === "SPLIT" && (legs.length < 2 || legAmounts.some((amount) => amount <= 0));

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
        customerPhone: customerPhone.trim() || undefined,
        customerAddress:
          fulfillment === "DELIVERY" ? customerAddress.trim() || undefined : undefined,
        splitPayments:
          method === "SPLIT"
            ? legs.map((leg, index) => ({ method: leg.method, amount: legAmounts[index] }))
            : undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not take that payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      eyebrow="Step 2 of 2 · Total due"
      title={<span className="money text-2xl">{formatGHS(totals.total)}</span>}
      onClose={onClose}
      dismissible={!submitting}
      fullOnMobile
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
            {method === "UNPAID"
              ? "Send to kitchen"
              : method === "BOLT_FOOD"
                ? "Send on Bolt"
                : `Take ${formatGHS(totals.total)}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {METHODS.slice(0, 4).map((entry) => (
            <MethodTile
              key={entry.value}
              entry={entry}
              selected={method === entry.value}
              onSelect={() => setMethod(entry.value)}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.slice(4).map((entry) => (
            <MethodTile
              key={entry.value}
              entry={entry}
              selected={method === entry.value}
              onSelect={() => setMethod(entry.value)}
            />
          ))}
        </div>

        {method === "CASH" && (
          <div>
            <div className="mb-3 text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--s-ink-muted)" }}>
                Cash given
              </p>
              <p className="money mt-1 text-4xl font-extrabold tracking-tight">
                {formatGHS(Number(tendered) || 0)}
              </p>
              <button
                type="button"
                onClick={() => setTendered(totals.total.toFixed(2))}
                className="mt-2 text-sm font-bold"
                style={{ color: "var(--s-brand)" }}
              >
                Exact {formatGHS(totals.total)}
              </button>
            </div>
            <Numpad
              value={tendered}
              onChange={setTendered}
              maxDigits={7}
              allowDecimal
              shortcuts={CASH_SHORTCUTS}
            />
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
            <FieldLabel htmlFor="payment-ref" hint="Optional">
              Reference
            </FieldLabel>
            <FieldInput
              id="payment-ref"
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Transaction ID"
              maxLength={100}
            />
          </div>
        )}

        {method === "BOLT_FOOD" && (
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Bolt collects this. It is not cash in the drawer. Mark it paid when the payout lands.
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
                      const method = event.target.value as (typeof SPLIT_METHODS)[number];
                      setLegs((current) => current.map((entry, i) => (i === index ? { ...entry, method } : entry)));
                    }}
                  >
                    {SPLIT_METHODS.map((option) => (
                      <option key={option} value={option}>
                        {option === "BANK_TRANSFER" ? "Transfer" : option === "MOMO" ? "MoMo" : option === "CARD" ? "Card" : "Cash"}
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
                      setLegs((current) => current.map((entry, i) => (i === index ? { ...entry, amount } : entry)));
                    }}
                    className="money text-right"
                  />
                </div>
              );
            })}
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-bold"
                style={{ color: "var(--s-brand)" }}
                onClick={() => setLegs((current) => [...current, { method: "CARD", amount: "" }])}
              >
                Add another tender
              </button>
              {legs.length > 2 && (
                <button
                  type="button"
                  className="text-sm font-medium"
                  style={{ color: "var(--s-ink-muted)" }}
                  onClick={() => setLegs((current) => current.slice(0, -1))}
                >
                  Remove last
                </button>
              )}
            </div>
          </div>
        )}

        {method === "UNPAID" && (
          <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
            Goes to the kitchen now and waits on Tickets until it is paid for.
          </p>
        )}

        <OrderContextBar
          fulfillment={fulfillment}
          onFulfillment={onFulfillment}
          name={customerName}
          phone={customerPhone}
          address={customerAddress}
          onName={onCustomerName}
          onPhone={onCustomerPhone}
          onAddress={onCustomerAddress}
          tables={tables}
          tableId={tableId}
          onTable={onTable}
        />
      </div>
    </Sheet>
  );
}

function MethodTile({
  entry,
  selected,
  onSelect,
}: {
  entry: (typeof METHODS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold"
      style={{
        background: selected ? "var(--s-brand)" : "var(--s-panel-alt)",
        color: selected ? "#fff" : "var(--s-ink)",
        boxShadow: selected ? undefined : "inset 0 0 0 1px var(--s-border)",
      }}
    >
      <MethodMark method={entry.value} />
      {entry.label}
    </button>
  );
}
