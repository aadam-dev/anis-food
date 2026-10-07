import "server-only";
import { prisma } from "@/lib/db";
import { roundMoney, toMoney } from "@/lib/money";
import { businessDay, BUSINESS_TIMEZONE } from "@/lib/session-utils";
import { currentSession } from "@/lib/pos-session";
import { addDays, daysIn } from "@/lib/period";
import { getLedger, periodBounds, type Ledger } from "@/lib/reports";
import { OrderSource, KitchenStatus, OrderStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma";

/**
 * The owner's dashboard: one period at a time — today, this week or this
 * month — set against the one before it. Today is compared with all of
 * yesterday; week and month with the same days so far of the last one, so a
 * Wednesday is never set against a full seven days.
 */

export type DashboardPeriod = "today" | "week" | "month";

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string; versus: string }[] = [
  { value: "today", label: "Today", versus: "yesterday" },
  { value: "week", label: "This week", versus: "last week" },
  { value: "month", label: "This month", versus: "last month" },
];

const REVENUE_WHERE = {
  isDemo: false,
  paymentStatus: PaymentStatus.PAID,
  status: { not: OrderStatus.CANCELLED },
} as const;

/** Minutes after which an unpaid ticket is flagged. */
const STALE_TICKET_MINUTES = 30;

const weekdayHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  weekday: "short",
  hour: "2-digit",
  hourCycle: "h23",
});
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface DashboardView {
  period: DashboardPeriod;
  current: Ledger;
  previous: Ledger;
  /** Today only: the same weekday last week, as a small secondary line. */
  sameDayLastWeek: number | null;
  /** The hero chart: this period against the last, bucketed by hour or day. */
  series: { label: string; current: number | null; previous: number }[];
  /** Fourteen days of sales and orders, for the small cards' sparklines. */
  daily14: { day: string; revenue: number; orders: number; average: number }[];
  /** Last four weeks of sales by weekday × hour, for the busy-hours map. */
  heatmap: { weekday: number; hour: number; revenue: number; orders: number }[];
  openTickets: { count: number; value: number; stale: number };
  kitchenQueue: number;
  /** Website orders no cashier has accepted yet. */
  onlineWaiting: { count: number; oldestMinutes: number };
  lowStock: { id: string; name: string }[];
  lastClosedShift: { day: string; difference: number | null; closedBy: string | null } | null;
  openShift: {
    openedBy: string;
    expectedCash: number;
    expectedMomo: number | null;
    isStale: boolean;
    businessDay: string;
  } | null;
  costing: CostingProgress;
}

export interface CostingProgress {
  dishes: number;
  costed: number;
  /** Share of the last 30 days' item sales that has a cost behind it (0–100). */
  salesCovered: number;
  /** Best-selling dishes with no cost yet: cost these first. */
  priorities: { id: string; name: string; revenue: number; share: number }[];
}

function bounds(period: DashboardPeriod, today: string) {
  if (period === "today") {
    const yesterday = addDays(today, -1);
    return { from: today, to: today, prevFrom: yesterday, prevTo: yesterday };
  }
  if (period === "week") {
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    const monday = addDays(today, -weekday);
    return { from: monday, to: today, prevFrom: addDays(monday, -7), prevTo: addDays(today, -7) };
  }
  const first = `${today.slice(0, 7)}-01`;
  const lastOfPrior = addDays(first, -1);
  const priorFirst = `${lastOfPrior.slice(0, 7)}-01`;
  // Same day of last month, capped at its last day (31 Mar → 28/29 Feb).
  const sameDay = `${lastOfPrior.slice(0, 7)}-${today.slice(8, 10)}`;
  return { from: first, to: today, prevFrom: priorFirst, prevTo: sameDay <= lastOfPrior ? sameDay : lastOfPrior };
}

export async function getDashboardView(period: DashboardPeriod, now = new Date()): Promise<DashboardView> {
  const today = businessDay(now);
  const span = bounds(period, today);
  const daily14From = addDays(today, -13);
  const heatFrom = addDays(today, -27);

  const [current, previous, recent, openTickets, kitchenQueue, inventory, lastShift, costing, onlineWaiting] = await Promise.all([
    getLedger(span.from, span.to),
    getLedger(span.prevFrom, span.prevTo),
    prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: rangeOf(heatFrom, today) },
      select: { total: true, taxAmount: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: {
        isDemo: false,
        paymentStatus: PaymentStatus.PENDING,
        status: { not: OrderStatus.CANCELLED },
        paymentMethod: { not: PaymentMethod.BOLT_FOOD },
      },
      select: { total: true, createdAt: true },
    }),
    prisma.order.count({
      where: {
        isDemo: false,
        status: { not: OrderStatus.CANCELLED },
        kitchenStatus: { in: [KitchenStatus.QUEUED, KitchenStatus.COOKING] },
        createdAt: rangeOf(today, today),
      },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, stock: true, lowStock: true },
    }),
    prisma.posSession.findFirst({
      where: { status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      select: { openedAt: true, expectedCash: true, closingCash: true, closedBy: { select: { name: true } } },
    }),
    getCostingProgress(today),
    prisma.order.findMany({
      where: { isDemo: false, source: OrderSource.ONLINE, acceptedAt: null, status: { not: OrderStatus.CANCELLED } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const shift = current.booksReady ? await currentSession() : null;

  // ---- 28 days of orders, sliced three ways --------------------------------
  const byDay = new Map<string, { revenue: number; orders: number }>();
  const heat = new Map<string, { revenue: number; orders: number }>();
  for (const order of recent) {
    const net = toMoney(order.total) - toMoney(order.taxAmount);
    const day = businessDay(order.createdAt);
    const bucket = byDay.get(day) ?? { revenue: 0, orders: 0 };
    bucket.revenue = roundMoney(bucket.revenue + net);
    bucket.orders += 1;
    byDay.set(day, bucket);

    const parts = weekdayHour.formatToParts(order.createdAt);
    const weekday = WEEKDAYS.indexOf(parts.find((part) => part.type === "weekday")?.value ?? "");
    const hour = Number(parts.find((part) => part.type === "hour")?.value) % 24;
    const key = `${weekday}:${hour}`;
    const cell = heat.get(key) ?? { revenue: 0, orders: 0 };
    cell.revenue = roundMoney(cell.revenue + net);
    cell.orders += 1;
    heat.set(key, cell);
  }

  const sameDayLastWeek =
    period === "today" ? (byDay.get(addDays(today, -7))?.revenue ?? 0) : null;

  return {
    period,
    current,
    previous,
    sameDayLastWeek,
    series: heroSeries(period, current, previous),
    daily14: daysIn(daily14From, today).map((day) => {
      const bucket = byDay.get(day) ?? { revenue: 0, orders: 0 };
      return { day, ...bucket, average: bucket.orders ? roundMoney(bucket.revenue / bucket.orders) : 0 };
    }),
    heatmap: [...heat.entries()].map(([key, cell]) => {
      const [weekday, hour] = key.split(":").map(Number);
      return { weekday, hour, ...cell };
    }),
    openTickets: {
      count: openTickets.length,
      value: roundMoney(openTickets.reduce((sum, ticket) => sum + toMoney(ticket.total), 0)),
      stale: openTickets.filter(
        (ticket) => ticket.createdAt.getTime() < now.getTime() - STALE_TICKET_MINUTES * 60_000,
      ).length,
    },
    kitchenQueue,
    onlineWaiting: {
      count: onlineWaiting.length,
      oldestMinutes: onlineWaiting.length
        ? Math.floor((Date.now() - onlineWaiting[0].createdAt.getTime()) / 60_000)
        : 0,
    },
    lowStock: inventory
      .filter((item) => Number(item.lowStock) > 0 && Number(item.stock) <= Number(item.lowStock))
      .map((item) => ({ id: item.id, name: item.name })),
    lastClosedShift: lastShift
      ? {
          day: businessDay(lastShift.openedAt),
          difference:
            lastShift.expectedCash === null || lastShift.closingCash === null
              ? null
              : roundMoney(toMoney(lastShift.closingCash) - toMoney(lastShift.expectedCash)),
          closedBy: lastShift.closedBy?.name ?? null,
        }
      : null,
    openShift: shift
      ? {
          openedBy: shift.openedBy.name,
          expectedCash: shift.expectedCash,
          expectedMomo: shift.expectedMomo,
          isStale: shift.isStale,
          businessDay: shift.businessDay,
        }
      : null,
    costing,
  };
}

function rangeOf(from: string, to: string) {
  const { start, end } = periodBounds(from, to);
  return { gte: start, lt: end };
}

/** Today: by hour. Week: by weekday. Month: by day of the month. */
function heroSeries(period: DashboardPeriod, current: Ledger, previous: Ledger) {
  if (period === "today") {
    const busy = [...current.hourly, ...previous.hourly].filter((hour) => hour.orders > 0).map((hour) => hour.hour);
    const first = Math.min(7, ...busy);
    const last = Math.max(22, ...busy);
    const nowHour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(new Date()),
    );
    return current.hourly
      .filter((hour) => hour.hour >= first && hour.hour <= last)
      .map((hour) => ({
        label: `${String(hour.hour).padStart(2, "0")}:00`,
        // Hours still ahead are blank, not zero, so the line stops at "now".
        current: hour.hour > nowHour ? null : hour.revenue,
        previous: previous.hourly[hour.hour].revenue,
      }));
  }
  const length = period === "week" ? 7 : 31;
  return Array.from({ length }, (_, index) => ({
    label: period === "week" ? WEEKDAYS[index] : String(index + 1),
    current: current.daily[index]?.revenue ?? null,
    previous: previous.daily[index]?.revenue ?? 0,
  })).filter((point, index) => period === "week" || index < Math.max(current.daily.length, previous.daily.length));
}

/** How much of the menu has a cost, and which dishes to cost first. */
export async function getCostingProgress(today = businessDay()): Promise<CostingProgress> {
  const from = addDays(today, -29);
  const [dishes, lines] = await Promise.all([
    prisma.menuItem.findMany({
      select: {
        id: true,
        name: true,
        costPrice: true,
        sizes: { where: { isAvailable: true }, select: { id: true, costPrice: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId", "sizeId"],
      where: { order: { ...REVENUE_WHERE, createdAt: rangeOf(from, today) } },
      _sum: { lineTotal: true },
    }),
  ]);
  // A dish with sizes is costed once every size it sells has a cost.
  const costedDish = (dish: (typeof dishes)[number]) =>
    dish.sizes.length > 0 ? dish.sizes.every((size) => size.costPrice !== null) : dish.costPrice !== null;
  const costedSize = new Set(dishes.flatMap((dish) => dish.sizes.filter((size) => size.costPrice !== null).map((size) => size.id)));
  const byId = new Map(dishes.map((dish) => [dish.id, dish]));

  let total = 0;
  let covered = 0;
  const uncosted = new Map<string, { id: string; name: string; revenue: number }>();
  for (const line of lines) {
    const revenue = toMoney(line._sum.lineTotal ?? 0);
    total += revenue;
    const dish = line.menuItemId ? byId.get(line.menuItemId) : undefined;
    if (!dish) continue;
    const lineCosted = line.sizeId ? costedSize.has(line.sizeId) : dish.costPrice !== null;
    if (lineCosted) {
      covered += revenue;
    } else {
      const entry = uncosted.get(dish.id) ?? { id: dish.id, name: dish.name, revenue: 0 };
      entry.revenue += revenue;
      uncosted.set(dish.id, entry);
    }
  }

  return {
    dishes: dishes.length,
    costed: dishes.filter(costedDish).length,
    salesCovered: total > 0 ? Math.round((covered / total) * 100) : 0,
    priorities: [...uncosted.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((dish) => ({ ...dish, revenue: roundMoney(dish.revenue), share: total > 0 ? dish.revenue / total : 0 })),
  };
}
