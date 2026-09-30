import { formatGHS } from "./money";
import { callNumber } from "./session-utils";

export interface InvoiceInput {
  orderNumber: string;
  createdAt: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  deliveryType?: string | null;
  tableLabel?: string | null;
  lines: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxLines?: { label: string; amount: number }[];
  taxInclusive?: boolean;
  total: number;
  paymentMethod: string;
  paymentStatus?: string | null;
  splitPayments?: { method: string; amount: number }[] | null;
}

const METHOD: Record<string, string> = {
  CASH: "Cash",
  MOMO: "Mobile Money",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  BOLT_FOOD: "Bolt Food",
  SPLIT: "Split",
  UNPAID: "Not yet paid",
};

const FULFILLMENT: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A4 invoice. Printed from its own document so it does not use the 80mm slip page. */
export function buildInvoiceHtml(data: InvoiceInput): string {
  const when = new Date(data.createdAt).toLocaleString("en-GB", {
    timeZone: "Africa/Accra",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const fulfillment = data.deliveryType ? (FULFILLMENT[data.deliveryType] ?? data.deliveryType) : "";
  const where =
    data.deliveryType === "DINE_IN" && data.tableLabel
      ? `${fulfillment} · Table ${data.tableLabel}`
      : data.deliveryType === "DELIVERY" && data.customerAddress
        ? `${fulfillment} · ${data.customerAddress}`
        : fulfillment;
  const customer = data.customerName?.trim() || "Walk-in";
  const bolt = data.paymentMethod === "BOLT_FOOD";
  const rows = data.lines
    .map(
      (line) => `<tr>
        <td>${line.quantity}</td>
        <td>${escapeHtml(line.name)}</td>
        <td class="num">${escapeHtml(formatGHS(line.unitPrice))}</td>
        <td class="num">${escapeHtml(formatGHS(line.lineTotal))}</td>
      </tr>`,
    )
    .join("");
  const taxRows = (data.taxLines ?? [])
    .map(
      (line) =>
        `<tr><td colspan="3">${escapeHtml(line.label)}${data.taxInclusive === false ? "" : " (included)"}</td><td class="num">${escapeHtml(formatGHS(line.amount))}</td></tr>`,
    )
    .join("");
  const tenderRows =
    data.splitPayments && data.splitPayments.length > 0
      ? data.splitPayments
          .map(
            (leg) =>
              `<tr><td colspan="3">${escapeHtml(METHOD[leg.method] ?? leg.method)}</td><td class="num">${escapeHtml(formatGHS(leg.amount))}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="3">${escapeHtml(METHOD[data.paymentMethod] ?? data.paymentMethod)}</td><td class="num">${bolt ? "With Bolt" : escapeHtml(formatGHS(data.total))}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(data.orderNumber)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif; color: #1a1d1f; margin: 0; }
    h1 { font-size: 22px; margin: 0; }
    .muted { color: #5c656b; font-size: 13px; }
    .top { display: flex; justify-content: space-between; gap: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th { text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #5c656b; border-bottom: 1px solid #d7dde1; padding: 8px 0; }
    td { padding: 8px 0; border-bottom: 1px solid #eef1f3; font-size: 14px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .total td { font-weight: 700; font-size: 16px; border-bottom: none; }
    .note { margin-top: 16px; font-size: 13px; color: #5c656b; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <h1>${escapeHtml(data.businessName)}</h1>
      <p class="muted">${escapeHtml(data.businessAddress)}<br />${escapeHtml(data.businessPhone)}</p>
    </div>
    <div>
      <h1>Invoice</h1>
      <p class="muted">
        ${escapeHtml(data.orderNumber)}<br />
        Call ${escapeHtml(callNumber(data.orderNumber))}<br />
        ${escapeHtml(when)}
      </p>
    </div>
  </div>
  <p>
    <strong>${escapeHtml(customer)}</strong><br />
    <span class="muted">${escapeHtml(data.customerPhone?.trim() || "")}</span><br />
    <span class="muted">${escapeHtml(where)}</span>
  </p>
  <table>
    <thead>
      <tr><th>Qty</th><th>Item</th><th class="num">Price</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>
      ${rows}
      ${data.discountAmount > 0 ? `<tr><td colspan="3">Discount</td><td class="num">-${escapeHtml(formatGHS(data.discountAmount))}</td></tr>` : ""}
      ${taxRows}
      <tr class="total"><td colspan="3">Total</td><td class="num">${escapeHtml(formatGHS(data.total))}</td></tr>
      ${tenderRows}
    </tbody>
  </table>
  ${bolt ? `<p class="note">This sale is with Bolt. The money was not collected at the till.</p>` : ""}
  ${data.paymentStatus === "PENDING" && !bolt ? `<p class="note">Not yet paid.</p>` : ""}
</body>
</html>`;
}
