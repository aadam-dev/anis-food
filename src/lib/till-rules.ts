/**
 * Rules the till and the books share.
 *
 * Drawer cash, Z-out, Bolt, and a split all have to agree with the same
 * answers. The routes call these functions; the tests lock them.
 */
import { roundMoney, toMoney } from "./money";

export type MovementKind = "IN" | "SPEND" | "DEPOSIT" | "WAGES";
export type DepositDestination = "MOMO" | "BANK" | "SAFE";

export function saleBooks(method: string): {
  paymentStatus: "PENDING" | "PAID";
  orderStatus: "PREPARING" | "COMPLETED";
  /** Pay-later can be raised before the drawer is counted in. Bolt cannot. */
  needsOpenShift: boolean;
} {
  if (method === "UNPAID") {
    return { paymentStatus: "PENDING", orderStatus: "PREPARING", needsOpenShift: false };
  }
  // Bolt: the customer has paid Bolt, so it is a paid sale. It is not cash in
  // the drawer; Bolt's commission is recorded as the order's platform fee.
  return { paymentStatus: "PAID", orderStatus: "COMPLETED", needsOpenShift: true };
}

/** Bolt's cut of a sale, at the commission rate in force (a fraction, 0.2 = 20%). */
export function platformFee(method: string, total: number, rate: number): number | null {
  if (method !== "BOLT_FOOD") return null;
  const safe = Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : 0;
  return roundMoney(toMoney(total) * safe);
}

/** The commission rate from settings, as a fraction. */
export function boltRate(settings: { bolt_commission_rate?: string }): number {
  const rate = Number(settings.bolt_commission_rate);
  return Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : 0;
}

/** Takings and the drawer only count money that has actually been received. */
export function countsInDrawer(paymentStatus: string): boolean {
  return paymentStatus === "PAID";
}

/**
 * A Bolt ticket is owed by Bolt, not by the guest at the counter. It must not
 * stop the Z-out the way a real unpaid ticket does.
 */
export function blocksShiftClose(order: {
  paymentStatus: string;
  paymentMethod: string;
  status: string;
}): boolean {
  return (
    order.paymentStatus === "PENDING" &&
    order.status !== "CANCELLED" &&
    order.paymentMethod !== "BOLT_FOOD"
  );
}

/** A pay-later ticket. Cashiers may void these; a paid sale stays a manager action. */
export function isUnpaidTicket(order: {
  paymentStatus: string;
  paymentMethod: string;
  status: string;
}): boolean {
  return (
    order.paymentStatus === "PENDING" &&
    order.paymentMethod === "UNPAID" &&
    order.status !== "CANCELLED"
  );
}

export function settlementAfterCorrection(method: string): {
  paymentStatus: "PENDING" | "PAID";
  orderStatus: "PREPARING" | "COMPLETED";
} {
  if (method === "UNPAID") {
    return { paymentStatus: "PENDING", orderStatus: "PREPARING" };
  }
  return { paymentStatus: "PAID", orderStatus: "COMPLETED" };
}

export function splitAddsUp(
  total: number,
  legs: { amount: number; method?: string }[],
): { ok: true; sum: number } | { ok: false; sum: number; reason: string } {
  const sum = roundMoney(legs.reduce((running, leg) => running + toMoney(leg.amount), 0));
  if (legs.some((leg) => leg.method === "BOLT_FOOD")) {
    return { ok: false, sum, reason: "Bolt is its own tender, not part of a split." };
  }
  if (legs.length < 2) {
    return { ok: false, sum, reason: "A split payment needs at least two parts." };
  }
  if (legs.some((leg) => toMoney(leg.amount) <= 0)) {
    return { ok: false, sum, reason: "Each part of a split needs to be more than zero." };
  }
  const bill = toMoney(total);
  if (Math.abs(sum - bill) > 0.01) {
    return {
      ok: false,
      sum,
      reason: `The split adds up to GH₵${sum.toFixed(2)} but the bill is GH₵${bill.toFixed(2)}.`,
    };
  }
  return { ok: true, sum };
}

/**
 * How a non-sale movement hits the drawer and the books.
 * A spend is always an expense. A deposit is a transfer, not a cost.
 * Only a MoMo deposit raises the MoMo wallet.
 */
export function movementBooks(kind: MovementKind): {
  direction: "IN" | "OUT";
  filesExpense: boolean;
  raisesMomo: (destination: DepositDestination | null | undefined) => boolean;
} {
  if (kind === "IN") {
    return { direction: "IN", filesExpense: false, raisesMomo: () => false };
  }
  if (kind === "SPEND") {
    return { direction: "OUT", filesExpense: true, raisesMomo: () => false };
  }
  // Wages: payroll is the cost, so the drawer pays out without filing an expense.
  if (kind === "WAGES") {
    return { direction: "OUT", filesExpense: false, raisesMomo: () => false };
  }
  return {
    direction: "OUT",
    filesExpense: false,
    raisesMomo: (destination) => destination === "MOMO",
  };
}
