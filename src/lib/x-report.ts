import { roundMoney, toMoney } from "./money";
import { expectedCash, momoDeposits, splitMovements, walletTotals } from "./cash";

/**
 * Mid-shift X report. Read-only: it describes the open shift and does not
 * close it. The same sale and movement rules as the drawer, so a cashier
 * reconciling before Z-out sees the numbers the close will use.
 */

export interface XReportOrder {
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  total: unknown;
  splitPayments?: { method: string; amount: number }[] | null;
}

export interface XReportMovement {
  direction: "IN" | "OUT";
  amount: number;
  reason: string;
  kind?: "IN" | "SPEND" | "DEPOSIT" | null;
  destination?: "MOMO" | "BANK" | null;
}

export interface MoneyCount {
  count: number;
  amount: number;
}

export interface XReport {
  openingFloat: number;
  openingMomo: number | null;
  salesCount: number;
  gross: number;
  byTender: { method: string; amount: number }[];
  cashSales: number;
  voids: MoneyCount;
  refunds: MoneyCount;
  cashIn: { amount: number; lines: { reason: string; amount: number }[] };
  spends: { amount: number; lines: { reason: string; amount: number }[] };
  deposits: {
    momo: number;
    bank: number;
    lines: { destination: "MOMO" | "BANK"; reason: string; amount: number }[];
  };
  expectedCash: number;
  expectedMomo: number | null;
  unpaid: MoneyCount;
  boltAwaiting: MoneyCount;
}

export function isPaidSale(order: XReportOrder): boolean {
  return order.paymentStatus === "PAID" && order.status !== "CANCELLED";
}

/** Cancelled before the money was kept. A refund is recorded on its own line. */
export function isVoid(order: XReportOrder): boolean {
  return order.status === "CANCELLED" && order.paymentStatus !== "REFUNDED";
}

export function isRefund(order: XReportOrder): boolean {
  return order.paymentStatus === "REFUNDED";
}

export function isUnpaidGuest(order: XReportOrder): boolean {
  return (
    order.paymentStatus === "PENDING" &&
    order.status !== "CANCELLED" &&
    order.paymentMethod !== "BOLT_FOOD"
  );
}

export function isBoltAwaiting(order: XReportOrder): boolean {
  return (
    order.paymentMethod === "BOLT_FOOD" &&
    order.paymentStatus === "PENDING" &&
    order.status !== "CANCELLED"
  );
}

function tally(orders: XReportOrder[]): MoneyCount {
  return {
    count: orders.length,
    amount: roundMoney(orders.reduce((sum, order) => sum + toMoney(order.total), 0)),
  };
}

function tenderOf(orders: XReportOrder[]): Record<string, number> {
  const byMethod: Record<string, number> = {};
  for (const order of orders) {
    const total = toMoney(order.total);
    if (order.paymentMethod === "SPLIT" && Array.isArray(order.splitPayments)) {
      for (const leg of order.splitPayments) {
        byMethod[leg.method] = roundMoney((byMethod[leg.method] ?? 0) + toMoney(leg.amount));
      }
    } else {
      byMethod[order.paymentMethod] = roundMoney((byMethod[order.paymentMethod] ?? 0) + total);
    }
  }
  return byMethod;
}

export function buildXReport(input: {
  openingFloat: number;
  openingMomo: number | null;
  orders: XReportOrder[];
  movements: XReportMovement[];
}): XReport {
  const sales = input.orders.filter(isPaidSale);
  const byMethod = tenderOf(sales);
  const byTender = Object.entries(byMethod)
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);

  const cashInLines = input.movements
    .filter((movement) => movement.kind === "IN" || (movement.direction === "IN" && movement.kind !== "DEPOSIT" && movement.kind !== "SPEND"))
    .map((movement) => ({ reason: movement.reason, amount: toMoney(movement.amount) }));
  const spendLines = input.movements
    .filter((movement) => movement.kind === "SPEND" || (movement.direction === "OUT" && movement.kind !== "DEPOSIT" && movement.kind !== "IN"))
    .map((movement) => ({ reason: movement.reason, amount: toMoney(movement.amount) }));
  const depositLines = input.movements
    .filter((movement) => movement.kind === "DEPOSIT" && (movement.destination === "MOMO" || movement.destination === "BANK"))
    .map((movement) => ({
      destination: movement.destination as "MOMO" | "BANK",
      reason: movement.reason,
      amount: toMoney(movement.amount),
    }));

  const { cashIn, cashOut } = splitMovements(
    input.movements.map((movement) => ({
      ...movement,
      kind: movement.kind ?? undefined,
      destination: movement.destination ?? undefined,
    })),
  );
  const cashSales = byMethod.CASH ?? 0;
  const wallet = walletTotals({
    openingMomo: input.openingMomo,
    momoRevenue: byMethod.MOMO ?? 0,
    momoDeposits: momoDeposits(
      input.movements.map((movement) => ({
        ...movement,
        kind: movement.kind ?? undefined,
        destination: movement.destination ?? undefined,
      })),
    ),
  });

  return {
    openingFloat: toMoney(input.openingFloat),
    openingMomo: input.openingMomo === null ? null : toMoney(input.openingMomo),
    salesCount: sales.length,
    gross: roundMoney(sales.reduce((sum, order) => sum + toMoney(order.total), 0)),
    byTender,
    cashSales,
    voids: tally(input.orders.filter(isVoid)),
    refunds: tally(input.orders.filter(isRefund)),
    cashIn: {
      amount: roundMoney(cashInLines.reduce((sum, line) => sum + line.amount, 0)),
      lines: cashInLines,
    },
    spends: {
      amount: roundMoney(spendLines.reduce((sum, line) => sum + line.amount, 0)),
      lines: spendLines,
    },
    deposits: {
      momo: roundMoney(depositLines.filter((line) => line.destination === "MOMO").reduce((sum, line) => sum + line.amount, 0)),
      bank: roundMoney(depositLines.filter((line) => line.destination === "BANK").reduce((sum, line) => sum + line.amount, 0)),
      lines: depositLines,
    },
    expectedCash: expectedCash({
      openingFloat: input.openingFloat,
      cashRevenue: cashSales,
      cashIn,
      cashOut,
    }),
    expectedMomo: wallet.expected,
    unpaid: tally(input.orders.filter(isUnpaidGuest)),
    boltAwaiting: tally(input.orders.filter(isBoltAwaiting)),
  };
}
