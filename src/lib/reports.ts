import "server-only";
import { prisma } from "@/lib/db";
import { toMoney, roundMoney } from "@/lib/money";
import { businessDay, businessDayRange } from "@/lib/session-utils";
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  PayrollStatus,
} from "@/generated/prisma";

/**
 * The numbers behind the back office.
 *
 * Every figure here is derived from the same order and session rows the till
 * writes, through the same money helpers the register uses — so the reports and
 * the drawer can never tell two different stories. Demo orders and voided orders
 * are excluded from revenue everywhere; that rule lives in the `where` clauses
 * below and nowhere else.
 */

/** Orders that count as real revenue: completed, paid, not a void, not a demo. */
const REVENUE_WHERE = {
  isDemo: false,
  paymentStatus: PaymentStatus.PAID,
  status: { not: OrderStatus.CANCELLED },
} as const;

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

// ---------------------------------------------------------------------------
// Dashboard — "how is today going?"
// ---------------------------------------------------------------------------

export interface DashboardData {
  today: { revenue: number; orders: number; averageTicket: number };
  /** Same weekday last week — restaurants are weekly-cyclical, so this is the
   *  honest comparison, not yesterday. */
  lastWeek: { revenue: number; orders: number };
  revenueDelta: number | null;
  paymentMix: { method: string; amount: number }[];
  openTickets: { count: number; value: number; oldestMinutes: number | null };
  openShift: { openedBy: string; expectedCash: number; since: string } | null;
  last14Days: { day: string; revenue: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
}

export async function getDashboard(now = new Date()): Promise<DashboardData> {
  const todayKey = businessDay(now);
  const today = businessDayRange(todayKey);

  const lastWeekDate = new Date(now);
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = businessDayRange(businessDay(lastWeekDate));

  const fortnightAgo = new Date(now);
  fortnightAgo.setDate(fortnightAgo.getDate() - 13);

  const [todayOrders, lastWeekOrders, openTickets, openShift, trendOrders, todayItems] =
    await Promise.all([
      prisma.order.findMany({
        where: { ...REVENUE_WHERE, createdAt: { gte: today.start, lt: today.end } },
        select: { paymentMethod: true, total: true, splitPayments: true },
      }),
      prisma.order.findMany({
        where: { ...REVENUE_WHERE, createdAt: { gte: lastWeek.start, lt: lastWeek.end } },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { paymentStatus: PaymentStatus.PENDING, status: { not: OrderStatus.CANCELLED } },
        select: { total: true, createdAt: true },
      }),
      prisma.posSession.findFirst({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
        include: { openedBy: { select: { name: true } } },
      }),
      prisma.order.findMany({
        where: { ...REVENUE_WHERE, createdAt: { gte: businessDayRange(businessDay(fortnightAgo)).start } },
        select: { total: true, createdAt: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { ...REVENUE_WHERE, createdAt: { gte: today.start, lt: today.end } },
        },
        select: { name: true, quantity: true, lineTotal: true },
      }),
    ]);

  const todayRevenue = roundMoney(
    todayOrders.reduce((sum, order) => sum + toMoney(order.total), 0),
  );
  const lastWeekRevenue = roundMoney(
    lastWeekOrders.reduce((sum, order) => sum + toMoney(order.total), 0),
  );

  const paymentMix = Object.entries(splitByMethod(todayOrders))
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);

  const oldestTicket = openTickets.reduce<Date | null>(
    (oldest, ticket) => (!oldest || ticket.createdAt < oldest ? ticket.createdAt : oldest),
    null,
  );

  // Bucket the 14-day trend by business day.
  const trendByDay = new Map<string, number>();
  for (const order of trendOrders) {
    const day = businessDay(order.createdAt);
    trendByDay.set(day, roundMoney((trendByDay.get(day) ?? 0) + toMoney(order.total)));
  }
  const last14Days: { day: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = businessDay(date);
    last14Days.push({ day: key, revenue: trendByDay.get(key) ?? 0 });
  }

  // Top sellers today.
  const itemTotals = new Map<string, { quantity: number; revenue: number }>();
  for (const item of todayItems) {
    const existing = itemTotals.get(item.name) ?? { quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue = roundMoney(existing.revenue + toMoney(item.lineTotal));
    itemTotals.set(item.name, existing);
  }
  const topItems = [...itemTotals.entries()]
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    today: {
      revenue: todayRevenue,
      orders: todayOrders.length,
      averageTicket: todayOrders.length
        ? roundMoney(todayRevenue / todayOrders.length)
        : 0,
    },
    lastWeek: { revenue: lastWeekRevenue, orders: lastWeekOrders.length },
    revenueDelta:
      lastWeekRevenue > 0
        ? roundMoney(((todayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
        : null,
    paymentMix,
    openTickets: {
      count: openTickets.length,
      value: roundMoney(openTickets.reduce((sum, t) => sum + toMoney(t.total), 0)),
      oldestMinutes: oldestTicket
        ? Math.floor((now.getTime() - oldestTicket.getTime()) / 60000)
        : null,
    },
    openShift: openShift
      ? {
          openedBy: openShift.openedBy.name,
          expectedCash: 0, // filled by the caller if needed; kept light here
          since: openShift.openedAt.toISOString(),
        }
      : null,
    last14Days,
    topItems,
  };
}

// ---------------------------------------------------------------------------
// Monthly report — P&L, daily sales, payment breakdown, top items
// ---------------------------------------------------------------------------

export interface MonthlyReport {
  month: string; // YYYY-MM
  revenue: number;
  cogs: number;
  cogsCoverage: number; // % of revenue whose items carry a cost price
  grossProfit: number;
  grossMargin: number | null;
  expenses: number;
  payroll: number;
  netProfit: number;
  orderCount: number;
  dailySales: { day: string; revenue: number; orders: number }[];
  paymentBreakdown: { method: string; amount: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  expensesByCategory: { category: string; amount: number }[];
}

function monthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  const firstDay = `${month}-01`;
  const start = businessDayRange(firstDay).start;
  const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;
  const end = businessDayRange(nextMonth).start;
  return { start, end };
}

export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const { start, end } = monthRange(month);

  const [orders, items, expenses, payroll] = await Promise.all([
    prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: { gte: start, lt: end } },
      select: { paymentMethod: true, total: true, splitPayments: true, createdAt: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { ...REVENUE_WHERE, createdAt: { gte: start, lt: end } } },
      select: { name: true, quantity: true, lineTotal: true, unitCost: true },
    }),
    prisma.expense.findMany({
      where: { incurredOn: { gte: start, lt: end } },
      select: { amount: true, category: { select: { name: true } } },
    }),
    prisma.payrollRecord.findMany({
      where: { status: PayrollStatus.PAID, periodStart: { gte: start, lt: end } },
      select: { netAmount: true },
    }),
  ]);

  const revenue = roundMoney(orders.reduce((sum, o) => sum + toMoney(o.total), 0));

  // COGS from the cost snapshot on each line. Coverage tells the reader how much
  // of the revenue actually has a cost behind it, so a partial figure is never
  // mistaken for the whole picture.
  let cogs = 0;
  let coveredRevenue = 0;
  for (const item of items) {
    if (item.unitCost !== null) {
      cogs = roundMoney(cogs + toMoney(item.unitCost) * item.quantity);
      coveredRevenue = roundMoney(coveredRevenue + toMoney(item.lineTotal));
    }
  }
  const totalItemRevenue = roundMoney(items.reduce((s, i) => s + toMoney(i.lineTotal), 0));
  const cogsCoverage = totalItemRevenue > 0
    ? roundMoney((coveredRevenue / totalItemRevenue) * 100)
    : 0;

  const grossProfit = roundMoney(revenue - cogs);
  const totalExpenses = roundMoney(expenses.reduce((s, e) => s + toMoney(e.amount), 0));
  const totalPayroll = roundMoney(payroll.reduce((s, p) => s + toMoney(p.netAmount), 0));
  const netProfit = roundMoney(grossProfit - totalExpenses - totalPayroll);

  // Daily buckets across the whole month.
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const day = businessDay(order.createdAt);
    const existing = dailyMap.get(day) ?? { revenue: 0, orders: 0 };
    existing.revenue = roundMoney(existing.revenue + toMoney(order.total));
    existing.orders += 1;
    dailyMap.set(day, existing);
  }
  const dailySales = [...dailyMap.entries()]
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const itemTotals = new Map<string, { quantity: number; revenue: number }>();
  for (const item of items) {
    const existing = itemTotals.get(item.name) ?? { quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue = roundMoney(existing.revenue + toMoney(item.lineTotal));
    itemTotals.set(item.name, existing);
  }

  const expenseTotals = new Map<string, number>();
  for (const expense of expenses) {
    const name = expense.category.name;
    expenseTotals.set(name, roundMoney((expenseTotals.get(name) ?? 0) + toMoney(expense.amount)));
  }

  return {
    month,
    revenue,
    cogs,
    cogsCoverage,
    grossProfit,
    grossMargin: revenue > 0 ? roundMoney((grossProfit / revenue) * 100) : null,
    expenses: totalExpenses,
    payroll: totalPayroll,
    netProfit,
    orderCount: orders.length,
    dailySales,
    paymentBreakdown: Object.entries(splitByMethod(orders))
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount),
    topItems: [...itemTotals.entries()]
      .map(([name, totals]) => ({ name, ...totals }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15),
    expensesByCategory: [...expenseTotals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/** The months that actually have orders, newest first, for the report picker. */
export async function getReportableMonths(): Promise<string[]> {
  const first = await prisma.order.findFirst({
    where: REVENUE_WHERE,
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const months = new Set<string>();
  months.add(businessDay(new Date()).slice(0, 7));
  if (first) {
    const cursor = new Date(first.createdAt);
    const now = new Date();
    while (cursor <= now) {
      months.add(businessDay(cursor).slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return [...months].sort().reverse();
}
