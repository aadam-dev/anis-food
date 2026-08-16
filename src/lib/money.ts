/**
 * Money arithmetic for Anis.
 *
 * Every cedi figure in the app — register, receipt, API, reports — goes through
 * this module. That is the whole point: the number on the Charge button and the
 * number written to the database are produced by the same function, so they
 * cannot disagree. Inline `price * quantity` anywhere else is a bug waiting for
 * a busy Saturday.
 */

export const CURRENCY_SYMBOL = "GH₵";

/**
 * Floating point puts 1.005 * 100 at 100.49999999999999, so a naive round sends
 * it *down* to 1.00 and the customer is short-changed a pesewa. The nudge is
 * small enough never to promote a genuine 100.4999 and large enough to fix the
 * representation error.
 */
const EPSILON = 1e-9;

/** Rounds to 2dp, half away from zero (so -1.005 → -1.01, not -1.00). */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`roundMoney received a non-finite value: ${value}`);
  }
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + EPSILON)) / 100;
}

/**
 * Prisma hands back Decimal objects, JSON hands back strings, forms hand back
 * numbers. One doorway for all three.
 */
export function toMoney(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return roundMoney(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new RangeError(`Not a money value: "${value}"`);
    return roundMoney(parsed);
  }
  if (typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value));
    if (!Number.isFinite(parsed)) throw new RangeError(`Not a money value: "${String(value)}"`);
    return roundMoney(parsed);
  }
  throw new RangeError(`Not a money value: ${typeof value}`);
}

/** Rounds once at the end, not per addend, so long carts do not accumulate drift. */
export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

export function lineTotal(unitPrice: number, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantity must be a non-negative integer, got ${quantity}`);
  }
  return roundMoney(toMoney(unitPrice) * quantity);
}

export interface OrderLineInput {
  unitPrice: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export interface ComputeOrderTotalsInput {
  lines: OrderLineInput[];
  discountAmount?: number;
  /**
   * Decimal rate, e.g. 0.125 for 12.5%. Ani's does not charge VAT, so this is 0
   * in practice — but the parameter stays so turning tax on later is a settings
   * change rather than a rewrite of every call site.
   */
  taxRate?: number;
}

export function computeOrderTotals({
  lines,
  discountAmount = 0,
  taxRate = 0,
}: ComputeOrderTotalsInput): OrderTotals {
  if (taxRate < 0 || taxRate >= 1) {
    throw new RangeError(`taxRate must be a decimal in [0, 1), got ${taxRate}`);
  }

  const subtotal = sumMoney(lines.map((line) => lineTotal(line.unitPrice, line.quantity)));

  // A discount can never exceed the bill or go negative, however the caller
  // fat-fingers it. Clamping here means no downstream code has to wonder.
  const discount = roundMoney(Math.min(Math.max(0, toMoney(discountAmount)), subtotal));

  const taxableAmount = roundMoney(subtotal - discount);
  const taxAmount = roundMoney(taxableAmount * taxRate);
  const total = roundMoney(taxableAmount + taxAmount);

  return { subtotal, discountAmount: discount, taxableAmount, taxAmount, total };
}

/** Change owed. Never negative: under-tendering is a validation error, not change. */
export function changeDue(total: number, tendered: number): number {
  return roundMoney(Math.max(0, toMoney(tendered) - toMoney(total)));
}

export function formatGHS(value: unknown): string {
  const amount = toMoney(value);
  const formatted = Math.abs(amount).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "−" : ""}${CURRENCY_SYMBOL}${formatted}`;
}
