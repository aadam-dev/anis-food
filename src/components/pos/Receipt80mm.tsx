"use client";

import { formatGHS } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { RECEIPT_CREDIT } from "@/lib/developer-credit";

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
  /** Size chosen, e.g. "Large". Printed after the name. */
  size?: string | null;
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
  /** Itemised VAT + levies for compliance. When present, replaces the single tax row. */
  taxLines?: { code: string; label: string; amount: number }[];
  /** true → prices already include the taxes; false → they were added on top. */
  taxInclusive?: boolean;
  /** The tax-exclusive value, shown under an inclusive-price breakdown. */
  taxableNet?: number;
  total: number;
  paymentMethod: string;
  splitPayments?: { method: string; amount: number; ref?: string }[] | null;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  deliveryType?: string | null;
  tableLabel?: string | null;
  paymentStatus?: string | null;
  notes?: string | null;
  header: string;
  address: string;
  phone: string;
  footer: string;
  /** "Invoice" on a customer slip. A plain receipt leaves this off. */
  documentTitle?: string;
  /** A bill is presented before payment: amount due, no "paid by", no change,
   *  no verify code. A receipt proves a payment. */
  kind?: "receipt" | "bill";
  /** Brand logo shown at the top of the slip; falls back to the text name. */
  logoUrl?: string;
  /** Public URL a customer can open to verify this sale (printed under the QR). */
  verifyUrl?: string;
  /** The verify URL as a scannable QR, pre-rendered to a data: URL by the caller. */
  qrDataUrl?: string;
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

const FULFILLMENT_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
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
        {data.logoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- printed
                directly; next/image's loader would break the thermal print. */}
            <img
              src={data.logoUrl}
              alt=""
              className="r-logo"
            />
          </>
        ) : (
          <div className="r-title">{data.header}</div>
        )}
        <div className="r-small">{data.address}</div>
        <div className="r-small">{data.phone}</div>
        {data.documentTitle && <div className="r-title">{data.documentTitle}</div>}
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
        {data.customerName?.trim() ? (
          <>
            <div>Customer: {data.customerName.trim()}</div>
            {data.customerPhone?.trim() && <div>{data.customerPhone.trim()}</div>}
          </>
        ) : (
          <div>Walk-in</div>
        )}
        {data.deliveryType && (
          <div>
            {FULFILLMENT_LABELS[data.deliveryType] ?? data.deliveryType}
            {data.deliveryType === "DINE_IN" && data.tableLabel ? ` · ${data.tableLabel}` : ""}
            {data.deliveryType === "DELIVERY" && data.customerAddress?.trim()
              ? ` · ${data.customerAddress.trim()}`
              : ""}
          </div>
        )}
      </div>

      <div className="r-rule" />

      <table className="r-table">
        <tbody>
          {data.lines.map((line, index) => (
            <tr key={index}>
              <td className="r-qty">{line.quantity}</td>
              <td className="r-name">
                {line.name}
                {line.size ? ` · ${line.size}` : ""}
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

      {(() => {
        const itemised = data.taxLines && data.taxLines.length > 0;
        const inclusive = data.taxInclusive !== false;
        const showTaxOnTop = itemised && !inclusive;
        // Subtotal only earns its place when something changes it. On a plain
        // sale it is just the total said twice — and with inclusive tax the
        // breakdown lives under the total, so the subtotal would still equal it.
        const showSubtotal =
          data.discountAmount > 0 || showTaxOnTop || (!itemised && data.taxAmount > 0);

        return (
          <>
            {showSubtotal && (
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

            {/* Tax added on top of the price: each levy and VAT as its own line. */}
            {showTaxOnTop &&
              data.taxLines!.map((line) => (
                <div className="r-row" key={line.code}>
                  <span>{line.label}</span>
                  <span>{formatGHS(line.amount)}</span>
                </div>
              ))}
            {/* Legacy single-line tax, only when there is no itemised breakdown. */}
            {!itemised && data.taxAmount > 0 && (
              <div className="r-row">
                <span>{data.taxLabel ?? "Tax"}</span>
                <span>{formatGHS(data.taxAmount)}</span>
              </div>
            )}

            <div className="r-row r-total">
              <span>TOTAL</span>
              <span>{formatGHS(data.total)}</span>
            </div>

            {/* Tax already inside the price: show what it breaks down to, as the
                GRA expects a VAT-inclusive receipt to. */}
            {itemised && inclusive && (
              <>
                <div className="r-rule" />
                <div className="r-small">Included in the price:</div>
                {typeof data.taxableNet === "number" && (
                  <div className="r-row r-small">
                    <span>Taxable (excl.)</span>
                    <span>{formatGHS(data.taxableNet)}</span>
                  </div>
                )}
                {data.taxLines!.map((line) => (
                  <div className="r-row r-small" key={line.code}>
                    <span>{line.label}</span>
                    <span>{formatGHS(line.amount)}</span>
                  </div>
                ))}
              </>
            )}
          </>
        );
      })()}

      <div className="r-rule" />

      {data.kind === "bill" ? (
        <>
          <div className="r-row r-total">
            <span>AMOUNT DUE</span>
            <span>{formatGHS(data.total)}</span>
          </div>
          <div className="r-small">Not paid yet. Pay by cash, MoMo or card at the counter.</div>
        </>
      ) : data.splitPayments && data.splitPayments.length > 0 ? (
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
          <span>{data.paymentMethod === "BOLT_FOOD" ? "Tender" : "Paid by"}</span>
          <span>{METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod}</span>
        </div>
      )}

      {data.kind !== "bill" && data.paymentMethod === "BOLT_FOOD" && (
        <div className="r-small">Money is with Bolt. Not collected at the till.</div>
      )}

      {data.kind !== "bill" && data.tenderedAmount !== null && data.tenderedAmount !== undefined && (
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
      </div>

      {data.kind !== "bill" && data.qrDataUrl && (
        <div className="r-center r-small" style={{ marginTop: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- inline data: URL,
              printed directly; next/image's loader would break the thermal print. */}
          <img
            src={data.qrDataUrl}
            alt=""
            className="r-qr"
          />
          <div>Scan to verify this receipt</div>
        </div>
      )}

      <div className="r-rule" />
      <div className="r-center r-credit">
        <div className="r-spacer" />
        {RECEIPT_CREDIT.printLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
