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
import CustomerFields, { type FulfillmentType } from "./CustomerFields";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { FieldInput, FieldLabel } from "./ui/Field";

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
        customerPhone: customerPhone.trim() || undefined,
        customerAddress:
          fulfillment === "DELIVERY" ? customerAddress.trim() || undefined : undefined,
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
            {method === "UNPAID" ? "Send to kitchen" : `Take ${formatGHS(totals.total)}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {METHODS.slice(0, 3).map((entry) => (
            <MethodTile
              key={entry.value}
              entry={entry}
              selected={method === entry.value}
              onSelect={() => setMethod(entry.value)}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.slice(3).map((entry) => (
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

        {method === "SPLIT" && (
          <div className="space-y-2">
            <FieldLabel htmlFor="split-cash">Paid in cash</FieldLabel>
            <FieldInput
              id="split-cash"
              type="text"
              inputMode="decimal"
              value={splitCash}
              onChange={(event) => setSplitCash(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              className="money text-right text-xl"
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
  const Icon = entry.icon;
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
      <Icon className="w-5 h-5" />
      {entry.label}
    </button>
  );
}
