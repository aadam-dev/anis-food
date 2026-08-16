"use client";

import { formatGHS } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { DEVELOPER_CREDIT } from "@/lib/developer-credit";

/**
 * The receipt, at 72mm printable width on 80mm thermal paper.
 *
 * One component with a `preview` prop, so what the cashier checks on screen is
 * literally the markup that goes to the printer. Two components would drift, and
 * the first anyone would know is a customer holding a receipt that does not
 * match what they were shown.
 */

export interface ReceiptLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
}

export interface ReceiptData {
  orderNumber: string;
  createdAt: string;
  soldBy?: string;
  lines: ReceiptLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxLabel?: string;
  total: number;
  paymentMethod: string;
  splitPayments?: { method: string; amount: number; ref?: string }[] | null;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  header: string;
  address: string;
  phone: string;
  footer: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  MOMO: "Mobile Money",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  BOLT_FOOD: "Bolt Food",
  SPLIT: "Split",
  UNPAID: "Not yet paid",
};

export default function Receipt80mm({
  data,
  preview = false,
}: {
  data: ReceiptData;
  preview?: boolean;
}) {
  const when = new Date(data.createdAt).toLocaleString("en-GB", {
    timeZone: "Africa/Accra",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      data-anis-receipt
      className={preview ? "anis-receipt anis-receipt--preview" : "anis-receipt"}
    >
      <div className="r-center">
        <div className="r-title">{data.header}</div>
        <div className="r-small">{data.address}</div>
        <div className="r-small">{data.phone}</div>
      </div>

      <div className="r-rule" />

      {/* The number the customer is called by. Big enough to read across a
          counter without picking the slip up. */}
      <div className="r-center">
        <div className="r-small">Order number</div>
        <div className="r-callno">{callNumber(data.orderNumber)}</div>
        <div className="r-small">{data.orderNumber}</div>
      </div>

      <div className="r-rule" />

      <div className="r-small">
        <div>{when}</div>
        {data.soldBy && <div>Served by {data.soldBy}</div>}
        {data.customerName && <div>Customer: {data.customerName}</div>}
        {data.customerPhone && <div>{data.customerPhone}</div>}
      </div>

      <div className="r-rule" />

      <table className="r-table">
        <tbody>
          {data.lines.map((line, index) => (
            <tr key={index}>
              <td className="r-qty">{line.quantity}</td>
              <td className="r-name">
                {line.name}
                {line.notes && <div className="r-note">{line.notes}</div>}
                {line.quantity > 1 && (
                  <div className="r-note">@ {formatGHS(line.unitPrice)}</div>
                )}
              </td>
              <td className="r-amt">{formatGHS(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="r-rule" />

      {/* Subtotal only earns its place when something changes it. On a plain
          sale with no discount and no tax it is just the total said twice. */}
      {(data.discountAmount > 0 || data.taxAmount > 0) && (
        <div className="r-row">
          <span>Subtotal</span>
          <span>{formatGHS(data.subtotal)}</span>
        </div>
      )}
      {data.discountAmount > 0 && (
        <div className="r-row">
          <span>Discount</span>
          <span>-{formatGHS(data.discountAmount)}</span>
        </div>
      )}
      {data.taxAmount > 0 && (
        <div className="r-row">
          <span>{data.taxLabel ?? "Tax"}</span>
          <span>{formatGHS(data.taxAmount)}</span>
        </div>
      )}

      <div className="r-row r-total">
        <span>TOTAL</span>
        <span>{formatGHS(data.total)}</span>
      </div>

      <div className="r-rule" />

      {data.splitPayments && data.splitPayments.length > 0 ? (
        <>
          {data.splitPayments.map((leg, index) => (
            <div className="r-row" key={index}>
              <span>{METHOD_LABELS[leg.method] ?? leg.method}</span>
              <span>{formatGHS(leg.amount)}</span>
            </div>
          ))}
        </>
      ) : (
        <div className="r-row">
          <span>Paid by</span>
          <span>{METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod}</span>
        </div>
      )}

      {data.tenderedAmount !== null && data.tenderedAmount !== undefined && (
        <>
          <div className="r-row">
            <span>Cash given</span>
            <span>{formatGHS(data.tenderedAmount)}</span>
          </div>
          <div className="r-row r-change">
            <span>Change</span>
            <span>{formatGHS(data.changeAmount ?? 0)}</span>
          </div>
        </>
      )}

      {data.notes && (
        <>
          <div className="r-rule" />
          <div className="r-small">{data.notes}</div>
        </>
      )}

      <div className="r-rule" />
      <div className="r-center r-small">
        <div>{data.footer}</div>
        <div className="r-spacer" />
        {DEVELOPER_CREDIT.printLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
