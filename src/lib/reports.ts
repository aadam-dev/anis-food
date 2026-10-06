import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { toMoney, roundMoney } from "@/lib/money";
import { businessDay, businessDayRange, BUSINESS_TIMEZONE } from "@/lib/session-utils";
import { currentSession } from "@/lib/pos-session";
import { tillBooksReady } from "@/lib/till-books";
import { addDays, daysIn, previousPeriod } from "@/lib/period";
import { isBoltAwaiting, isRefund, isVoid, type MoneyCount } from "@/lib/x-report";
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  PayrollStatus,
  CashMovementKind,
  KitchenStatus,
} from "@/generated/prisma";

/**
 * The numbers behind the back office.
 *
 * Every figure here is derived from the same order and session rows the till
 * writes, through the same money helpers the register uses — so the reports and
 * the drawer can never tell two different stories. Demo orders and voided orders
 * are excluded from revenue everywhere; that rule lives in the `where` clauses
 * below and nowhere else.
 *
 * Revenue means NET sales: what customers paid minus the VAT and levies inside
 * it. Tax is held for GRA, not income, so it sits on its own line and never
 * inflates profit once the tax engine is switched on.
 */

/** Orders that count as real revenue: completed, paid, not a void, not a demo. */
const REVENUE_WHERE = {
  isDemo: false,
  paymentStatus: PaymentStatus.PAID,
  status: { not: OrderStatus.CANCELLED },
} as const;

/** Instants spanning inclusive business days `from`..`to`. */
export function periodBounds(from: string, to: string): { start: Date; end: Date } {
  return { start: businessDayRange(from).start, end: businessDayRange(to).end };
}

function range(from: string, to: string) {
  const { start, end } = periodBounds(from, to);
  return { gte: start, lt: end };
}

/** Net of tax: the revenue a sale actually earned the business. */
function netOf(order: { total: unknown; taxAmount: unknown }): number {
  return toMoney(order.total) - toMoney(order.taxAmount);
}

function sumNet(orders: { total: unknown; taxAmount: unknown }[]): number {
  return roundMoney(orders.reduce((sum, order) => sum + netOf(order), 0));
}

function splitByMethod(
  orders: { paymentMethod: PaymentMethod; total: unknown; splitPayments: unknown }[],
): Record<string, number> {
  const byMethod: Record<string, number> = {};
  for (const order of orders) {
    if (order.paymentMethod === PaymentMethod.SPLIT && Array.isArray(order.splitPayments)) {
      // Each leg to its own method, so "cash" means cash — a split bill is not a
      // payment method of its own.
      for (const leg of order.splitPayments as { method: string; amount: number }[]) {
        byMethod[leg.method] = roundMoney((byMethod[leg.method] ?? 0) + toMoney(leg.amount));
      }
    } else {
      byMethod[order.paymentMethod] = roundMoney(
        (byMethod[order.paymentMethod] ?? 0) + toMoney(order.total),
      );
    }
  }
  return byMethod;
}

function countOrders(orders: { total: unknown }[]): MoneyCount {
  return {
    count: orders.length,
    amount: roundMoney(orders.reduce((sum, order) => sum + toMoney(order.total), 0)),
  };
}

/** Relative change as a fraction (0.12 = +12%). Null when there is no base. */
export function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

function pct(part: number, whole: number): number | null {
  return whole > 0 ? roundMoney((part / whole) * 100) : null;
}

/** One books check per request, however many ledgers a page asks for — the
 *  check can spawn the migrator, which is far too slow to repeat. */
const booksReady = cache(tillBooksReady);

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

// ---------------------------------------------------------------------------
// The ledger — one period's money, every way the back office slices it
// ---------------------------------------------------------------------------

export interface Ledger {
  from: string;
  to: string;
  booksReady: boolean;
  orderCount: number;
  /** What customers handed over for paid sales: Σ order totals, tax included. */
  takings: number;
  /** VAT + levies inside those takings. Owed to GRA, not income. */
  tax: number;
  /** Takings minus tax — the revenue line of the P&L. */
  netSales: number;
  /** Discounts given at the till (already off takings). */
  discounts: number;
  discountedOrders: number;
  averageTicket: number;
  cogs: number;
  /** % of item sales that carry a cost price. Below 100 means COGS is partial. */
  cogsCoverage: number;
  grossProfit: number;
  grossMargin: number | null;
  expenses: {
    total: number;
    fixed: number;
    variable: number;
    count: number;
    byCategory: { category: string; amount: number; isFixed: boolean }[];
  };
  /** Cash spent from the drawer with no expense behind it (from before spends
   *  had to be filed). Counted as a cost so it cannot fall out of the books. */
  tillSpends: MoneyCount;
  payroll: number;
  /** Expenses + unfiled till spends + payroll. */
  overheads: number;
  netProfit: number;
  netMargin: number | null;
  voids: MoneyCount;
  refunds: MoneyCount & { byReason: { reason: string; count: number; amount: number }[] };
  deposits: { momo: number; bank: number };
  boltAwaiting: MoneyCount;
  paymentMix: { method: string; amount: number }[];
  daily: { day: string; revenue: number; orders: number }[];
  hourly: { hour: number; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
}

export async function getLedger(from: string, to: string): Promise<Ledger> {
  const window = range(from, to);
  const books = await booksReady();

  const [orders, items, expenses, payroll, adjustments, boltOrders, movements] = await Promise.all([
    prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: window },
      select: {
        paymentMethod: true,
        total: true,
        taxAmount: true,
        discountAmount: true,
        splitPayments: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { ...REVENUE_WHERE, createdAt: window } },
      select: { name: true, quantity: true, lineTotal: true, unitCost: true },
    }),
    prisma.expense.findMany({
      // incurredOn is a DATE column: compare against UTC midnights.
      where: {
        incurredOn: {
          gte: new Date(`${from}T00:00:00Z`),
          lt: new Date(`${addDays(to, 1)}T00:00:00Z`),
        },
      },
      select: { amount: true, category: { select: { name: true, isFixed: true } } },
    }),
    prisma.payrollRecord.findMany({
      // Counted when the money left, not by the period it was for — otherwise
      // August's wages paid on 2 September land in the wrong month's cash.
      where: { status: PayrollStatus.PAID, paidAt: window },
      select: { netAmount: true },
    }),
    prisma.order.findMany({
      where: {
        isDemo: false,
        updatedAt: window,
        OR: [{ status: OrderStatus.CANCELLED }, { paymentStatus: PaymentStatus.REFUNDED }],
      },
      select: { total: true, paymentMethod: true, paymentStatus: true, status: true, voidReason: true },
    }),
    prisma.order.findMany({
      where: {
        isDemo: false,
        paymentMethod: PaymentMethod.BOLT_FOOD,
        paymentStatus: PaymentStatus.PENDING,
        status: { not: OrderStatus.CANCELLED },
        createdAt: window,
      },
      select: { total: true, paymentMethod: true, paymentStatus: true, status: true },
    }),
    books.ok
      ? prisma.cashMovement.findMany({
          where: {
            createdAt: window,
            OR: [
              { kind: CashMovementKind.DEPOSIT },
              { kind: CashMovementKind.SPEND, expenseId: null },
            ],
          },
          select: { amount: true, kind: true, destination: true },
        })
      : Promise.resolve([]),
  ]);

  // ---- Sales --------------------------------------------------------------
  let takings = 0;
  let tax = 0;
  let discounts = 0;
  let discountedOrders = 0;
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, orders: 0 }));

  for (const order of orders) {
    takings += toMoney(order.total);
    tax += toMoney(order.taxAmount);
    const discount = toMoney(order.discountAmount);
    if (discount > 0) {
      discounts += discount;
      discountedOrders += 1;
    }
    const net = netOf(order);
    const day = businessDay(order.createdAt);
    const bucket = dailyMap.get(day) ?? { revenue: 0, orders: 0 };
    bucket.revenue = roundMoney(bucket.revenue + net);
    bucket.orders += 1;
    dailyMap.set(day, bucket);

    const hour = Number(hourFormatter.format(order.createdAt)) % 24;
    hourly[hour].revenue = roundMoney(hourly[hour].revenue + net);
    hourly[hour].orders += 1;
  }
  takings = roundMoney(takings);
  tax = roundMoney(tax);
  discounts = roundMoney(discounts);
  const netSales = roundMoney(takings - tax);

  // ---- Cost of items ------------------------------------------------------
  // From the cost snapshot on each line. Coverage tells the reader how much of
  // the sales actually has a cost behind it, so a partial figure is never
  // mistaken for the whole picture.
  let cogs = 0;
  let coveredRevenue = 0;
  let itemRevenue = 0;
  const itemTotals = new Map<string, { quantity: number; revenue: number }>();
  for (const item of items) {
    const lineTotal = toMoney(item.lineTotal);
    itemRevenue += lineTotal;
    if (item.unitCost !== null) {
      cogs += toMoney(item.unitCost) * item.quantity;
      coveredRevenue += lineTotal;
    }
    const existing = itemTotals.get(item.name) ?? { quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue = roundMoney(existing.revenue + lineTotal);
    itemTotals.set(item.name, existing);
  }
  cogs = roundMoney(cogs);
  const cogsCoverage = itemRevenue > 0 ? roundMoney((coveredRevenue / itemRevenue) * 100) : 0;
  const grossProfit = roundMoney(netSales - cogs);

  // ---- Overheads ----------------------------------------------------------
  const categoryTotals = new Map<string, { amount: number; isFixed: boolean }>();
  let fixed = 0;
  let variable = 0;
  for (const expense of expenses) {
    const amount = toMoney(expense.amount);
    if (expense.category.isFixed) fixed += amount;
    else variable += amount;
    const existing = categoryTotals.get(expense.category.name) ?? {
      amount: 0,
      isFixed: expense.category.isFixed,
    };
    existing.amount = roundMoney(existing.amount + amount);
    categoryTotals.set(expense.category.name, existing);
  }
  fixed = roundMoney(fixed);
  variable = roundMoney(variable);
  const expenseTotal = roundMoney(fixed + variable);

  const spendRows = movements.filter((row) => row.kind === CashMovementKind.SPEND);
  const depositRows = movements.filter((row) => row.kind === CashMovementKind.DEPOSIT);
  const tillSpends = countOrders(spendRows.map((row) => ({ total: row.amount })));
  const payrollTotal = roundMoney(payroll.reduce((sum, row) => sum + toMoney(row.netAmount), 0));
  const overheads = roundMoney(expenseTotal + tillSpends.amount + payrollTotal);
  const netProfit = roundMoney(grossProfit - overheads);

  // ---- Voids, refunds, transfers -------------------------------------------
  const refunded = adjustments.filter(isRefund);
  const reasonTotals = new Map<string, { count: number; amount: number }>();
  for (const row of refunded) {
    const reason = row.voidReason ?? "OTHER";
    const existing = reasonTotals.get(reason) ?? { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount = roundMoney(existing.amount + toMoney(row.total));
    reasonTotals.set(reason, existing);
  }
  const depositTo = (destination: string) =>
    roundMoney(
      depositRows
        .filter((row) => row.destination === destination)
        .reduce((sum, row) => sum + toMoney(row.amount), 0),
    );

  return {
    from,
    to,
    booksReady: books.ok,
    orderCount: orders.length,
    takings,
    tax,
    netSales,
    discounts,
    discountedOrders,
    averageTicket: orders.length ? roundMoney(netSales / orders.length) : 0,
    cogs,
    cogsCoverage,
    grossProfit,
    grossMargin: pct(grossProfit, netSales),
    expenses: {
      total: expenseTotal,
      fixed,
      variable,
      count: expenses.length,
      byCategory: [...categoryTotals.entries()]
        .map(([category, totals]) => ({ category, ...totals }))
        .sort((a, b) => b.amount - a.amount),
    },
    tillSpends,
    payroll: payrollTotal,
    overheads,
    netProfit,
    netMargin: pct(netProfit, netSales),
    voids: countOrders(adjustments.filter(isVoid)),
    refunds: {
      ...countOrders(refunded),
      byReason: [...reasonTotals.entries()]
        .map(([reason, totals]) => ({ reason, ...totals }))
        .sort((a, b) => b.amount - a.amount),
    },
    deposits: { momo: depositTo("MOMO"), bank: depositTo("BANK") },
    boltAwaiting: countOrders(boltOrders.filter(isBoltAwaiting)),
    paymentMix: Object.entries(splitByMethod(orders))
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount),
    daily: daysIn(from, to).map((day) => ({ day, ...(dailyMap.get(day) ?? { revenue: 0, orders: 0 }) })),
    hourly,
    topItems: [...itemTotals.entries()]
      .map(([name, totals]) => ({ name, ...totals }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15),
  };
}

/** A period's ledger next to the same-length period immediately before it. */
export async function getLedgerWithComparison(from: string, to: string) {
  const prior = previousPeriod({ from, to });
  const [current, previous] = await Promise.all([getLedger(from, to), getLedger(prior.from, prior.to)]);
  return { current, previous };
}

// ---------------------------------------------------------------------------
// Dashboard — "how is today going, and what needs me?"
// ---------------------------------------------------------------------------

export interface PeriodRevenue {
  revenue: number;
  orders: number;
  /** Change against the same span of the prior week/month, as a fraction. */
  delta: number | null;
}

export interface DashboardData {
  booksReady: boolean;
  /** Today's money, every way: net sales, margin, voids, deposits… */
  today: Ledger;
  /** Same weekday last week — restaurants are weekly-cyclical, so this is the
   *  honest comparison, not yesterday. */
  lastWeek: { revenue: number; orders: number };
  weekToDate: PeriodRevenue;
  monthToDate: PeriodRevenue;
  openTickets: { count: number; value: number; oldestMinutes: number | null; stale: number };
  kitchenQueue: number;
  lowStock: { id: string; name: string; stock: number; unit: string }[];
  lastClosedShift: { day: string; difference: number | null; closedBy: string | null } | null;
  openShift: {
    openedBy: string;
    expectedCash: number;
    expectedMomo: number | null;
    since: string;
    isStale: boolean;
    businessDay: string;
  } | null;
  /** 14 days of net sales, each beside the same day two weeks earlier. */
  trend: { day: string; revenue: number; previous: number; orders: number }[];
}

/** Minutes after which an unpaid ticket is flagged on the dashboard. */
const STALE_TICKET_MINUTES = 30;

export async function getDashboard(now = new Date()): Promise<DashboardData> {
  const todayKey = businessDay(now);
  const lastWeekKey = addDays(todayKey, -7);

  // Week: Monday → today, against the same Monday → weekday span last week.
  const weekday = (new Date(`${todayKey}T12:00:00Z`).getUTCDay() + 6) % 7;
  const weekStart = addDays(todayKey, -weekday);
  // Month: 1st → today, against the prior month through the same day (capped).
  const monthStart = `${todayKey.slice(0, 7)}-01`;
  const priorMonthEnd = addDays(monthStart, -1);
  const priorMonthStart = `${priorMonthEnd.slice(0, 7)}-01`;
  const priorMtdTo =
    Number(todayKey.slice(8, 10)) <= Number(priorMonthEnd.slice(8, 10))
      ? `${priorMonthEnd.slice(0, 7)}-${todayKey.slice(8, 10)}`
      : priorMonthEnd;

  const trendFrom = addDays(todayKey, -13);
  const sales = { total: true, taxAmount: true } as const;

  const [
    today,
    lastWeek,
    week,
    priorWeek,
    month,
    priorMonth,
    trendOrders,
    openTickets,
    kitchenQueue,
    inventory,
    lastShift,
  ] = await Promise.all([
    getLedger(todayKey, todayKey),
    prisma.order.findMany({ where: { ...REVENUE_WHERE, createdAt: range(lastWeekKey, lastWeekKey) }, select: sales }),
    prisma.order.findMany({ where: { ...REVENUE_WHERE, createdAt: range(weekStart, todayKey) }, select: sales }),
    prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: range(addDays(weekStart, -7), lastWeekKey) },
      select: sales,
    }),
    prisma.order.findMany({ where: { ...REVENUE_WHERE, createdAt: range(monthStart, todayKey) }, select: sales }),
    prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: range(priorMonthStart, priorMtdTo) },
      select: sales,
    }),
    prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: range(addDays(trendFrom, -14), todayKey) },
      select: { ...sales, createdAt: true },
    }),
    prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        status: { not: OrderStatus.CANCELLED },
        paymentMethod: { not: PaymentMethod.BOLT_FOOD },
        isDemo: false,
      },
      select: { total: true, createdAt: true },
    }),
    prisma.order.count({
      where: {
        isDemo: false,
        status: { not: OrderStatus.CANCELLED },
        kitchenStatus: { in: [KitchenStatus.QUEUED, KitchenStatus.COOKING] },
        createdAt: range(todayKey, todayKey),
      },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, stock: true, unit: true, lowStock: true },
    }),
    prisma.posSession.findFirst({
      where: { status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      select: {
        openedAt: true,
        expectedCash: true,
        closingCash: true,
        closedBy: { select: { name: true } },
      },
    }),
  ]);

  const shift = today.booksReady ? await currentSession() : null;

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const order of trendOrders) {
    const day = businessDay(order.createdAt);
    const bucket = byDay.get(day) ?? { revenue: 0, orders: 0 };
    bucket.revenue = roundMoney(bucket.revenue + netOf(order));
    bucket.orders += 1;
    byDay.set(day, bucket);
  }

  const oldest = openTickets.reduce<Date | null>(
    (min, ticket) => (!min || ticket.createdAt < min ? ticket.createdAt : min),
    null,
  );
  const staleCutoff = now.getTime() - STALE_TICKET_MINUTES * 60_000;

  const expected = lastShift?.expectedCash == null ? null : toMoney(lastShift.expectedCash);
  const counted = lastShift?.closingCash == null ? null : toMoney(lastShift.closingCash);

  const weekRevenue = sumNet(week);
  const monthRevenue = sumNet(month);

  return {
    booksReady: today.booksReady,
    today,
    lastWeek: { revenue: sumNet(lastWeek), orders: lastWeek.length },
    weekToDate: { revenue: weekRevenue, orders: week.length, delta: change(weekRevenue, sumNet(priorWeek)) },
    monthToDate: { revenue: monthRevenue, orders: month.length, delta: change(monthRevenue, sumNet(priorMonth)) },
    openTickets: {
      count: openTickets.length,
      value: roundMoney(openTickets.reduce((sum, ticket) => sum + toMoney(ticket.total), 0)),
      oldestMinutes: oldest ? Math.floor((now.getTime() - oldest.getTime()) / 60_000) : null,
      stale: openTickets.filter((ticket) => ticket.createdAt.getTime() < staleCutoff).length,
    },
    kitchenQueue,
    lowStock: inventory
      .filter((item) => Number(item.lowStock) > 0 && Number(item.stock) <= Number(item.lowStock))
      .map((item) => ({ id: item.id, name: item.name, stock: Number(item.stock), unit: item.unit })),
    lastClosedShift: lastShift
      ? {
          day: businessDay(lastShift.openedAt),
          difference: expected === null || counted === null ? null : roundMoney(counted - expected),
          closedBy: lastShift.closedBy?.name ?? null,
        }
      : null,
    openShift: shift
      ? {
          openedBy: shift.openedBy.name,
          expectedCash: shift.expectedCash,
          expectedMomo: shift.expectedMomo,
          since: shift.openedAt,
          isStale: shift.isStale,
          businessDay: shift.businessDay,
        }
      : null,
    trend: daysIn(trendFrom, todayKey).map((day) => ({
      day,
      revenue: byDay.get(day)?.revenue ?? 0,
      orders: byDay.get(day)?.orders ?? 0,
      previous: byDay.get(addDays(day, -14))?.revenue ?? 0,
    })),
  };
}

// ---------------------------------------------------------------------------
// VAT return — "what tax did we collect?"
// ---------------------------------------------------------------------------

export interface VatReturn {
  /** Whether the tax engine was on for any sale in the period. */
  active: boolean;
  /** Number of sales that carried tax. */
  taxedOrders: number;
  /** Tax-exclusive (net) value of taxed sales. */
  taxable: number;
  /** Total tax collected across all levies + VAT. */
  taxTotal: number;
  /** Per-charge breakdown (NHIL, GETFund, COVID, VAT…), in the order sold. */
  byLevy: { code: string; label: string; amount: number }[];
}

interface TaxSnapshotShape {
  tax?: {
    net: number;
    lines: { code: string; label: string; amount: number }[];
  } | null;
}

/**
 * Aggregates the VAT + levies actually charged over a period, straight from the
 * receipt snapshots — so the return reflects what customers were charged, not a
 * rate re-applied after the fact. Empty (active:false) whenever tax was off,
 * which is the default until Anis's VAT status is confirmed.
 */
export async function getVatReturn(from: string, to: string): Promise<VatReturn> {
  const orders = await prisma.order.findMany({
    where: {
      ...REVENUE_WHERE,
      createdAt: range(from, to),
      taxAmount: { gt: 0 },
    },
    select: { taxAmount: true, transactionSnapshot: true },
  });

  let taxTotal = 0;
  let taxable = 0;
  const levies = new Map<string, { label: string; amount: number }>();
  const order: string[] = [];

  for (const row of orders) {
    taxTotal = roundMoney(taxTotal + toMoney(row.taxAmount));
    const snapshot = row.transactionSnapshot as TaxSnapshotShape | null;
    const tax = snapshot?.tax;
    if (!tax) continue;
    taxable = roundMoney(taxable + toMoney(tax.net));
    for (const line of tax.lines) {
      if (!levies.has(line.code)) order.push(line.code);
      const existing = levies.get(line.code) ?? { label: line.label, amount: 0 };
      existing.amount = roundMoney(existing.amount + toMoney(line.amount));
      levies.set(line.code, existing);
    }
  }

  return {
    active: orders.length > 0,
    taxedOrders: orders.length,
    taxable,
    taxTotal,
    byLevy: order.map((code) => ({ code, label: levies.get(code)!.label, amount: levies.get(code)!.amount })),
  };
}
