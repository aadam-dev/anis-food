import "server-only";
import { prisma } from "@/lib/db";
import { toMoney, roundMoney } from "@/lib/money";
import { drawerDifference, differenceLabel } from "@/lib/cash";
import { businessDay } from "@/lib/session-utils";
import { summariseSession } from "@/lib/pos-session";
import { periodBounds } from "@/lib/reports";
import { buildXReport, type XReport, type XReportOrder } from "@/lib/x-report";

/** Shifts opened in a period with their reconciliation — the light version, for exports. */
export async function getShifts(from: string, to: string) {
  const { start, end } = periodBounds(from, to);
  const sessions = await prisma.posSession.findMany({
    where: { openedAt: { gte: start, lt: end } },
    orderBy: { openedAt: "desc" },
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });

  return sessions.map((session) => {
    const expected = session.expectedCash === null ? null : toMoney(session.expectedCash);
    const counted = session.closingCash === null ? null : toMoney(session.closingCash);
    const difference = drawerDifference(expected, counted);
    const expectedMomo = session.expectedMomo === null ? null : toMoney(session.expectedMomo);
    const closingMomo = session.closingMomo === null ? null : toMoney(session.closingMomo);
    return {
      id: session.id,
      businessDay: businessDay(session.openedAt),
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      openedBy: session.openedBy.name,
      closedBy: session.closedBy?.name ?? null,
      status: session.status,
      openingFloat: toMoney(session.openingFloat),
      expectedCash: expected,
      closingCash: counted,
      difference,
      differenceLabel: differenceLabel(difference),
      expectedMomo,
      closingMomo,
      momoDifference: drawerDifference(expectedMomo, closingMomo),
    };
  });
}

export type ShiftSummary = NonNullable<Awaited<ReturnType<typeof summariseSession>>>;

export interface CashUpShift {
  summary: ShiftSummary;
  /** The same slip the till prints as an X report, for reprinting as a Z. */
  report: XReport;
  momoDifference: number | null;
}

export interface CashUp {
  shifts: CashUpShift[];
  totals: {
    takings: number;
    orders: number;
    byMethod: Record<string, number>;
    expectedCash: number;
    countedCash: number | null;
    cashDifference: number | null;
    momoTaken: number;
    momoDifference: number | null;
    spends: number;
    deposits: number;
    openShifts: number;
  };
}

/** The most shifts one cash-up screen will load in full. */
const MAX_SHIFTS = 62;

/** Every shift in a period, in full, rolled up — the back-office cash-up. */
export async function getCashUp(from: string, to: string): Promise<CashUp> {
  const { start, end } = periodBounds(from, to);
  const rows = await prisma.posSession.findMany({
    where: { openedAt: { gte: start, lt: end } },
    orderBy: { openedAt: "desc" },
    select: { id: true },
    take: MAX_SHIFTS,
  });
  const ids = rows.map((row) => row.id);

  const [summaries, orders] = await Promise.all([
    Promise.all(ids.map((id) => summariseSession(id))),
    prisma.order.findMany({
      where: { sessionId: { in: ids }, isDemo: false },
      select: {
        sessionId: true,
        paymentMethod: true,
        paymentStatus: true,
        status: true,
        total: true,
        splitPayments: true,
      },
    }),
  ]);

  const ordersBySession = new Map<string, XReportOrder[]>();
  for (const order of orders) {
    if (!order.sessionId) continue;
    const list = ordersBySession.get(order.sessionId) ?? [];
    list.push({
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      total: order.total,
      splitPayments: Array.isArray(order.splitPayments)
        ? (order.splitPayments as { method: string; amount: number }[])
        : null,
    });
    ordersBySession.set(order.sessionId, list);
  }

  const shifts: CashUpShift[] = summaries
    .filter((summary): summary is ShiftSummary => summary !== null)
    .map((summary) => ({
      summary,
      report: buildXReport({
        openingFloat: summary.openingFloat,
        openingMomo: summary.openingMomo,
        orders: ordersBySession.get(summary.id) ?? [],
        movements: summary.movements.map((movement) => ({
          direction: movement.direction as "IN" | "OUT",
          amount: movement.amount,
          reason: movement.reason,
          kind: movement.kind,
          destination: movement.destination,
        })),
      }),
      momoDifference:
        summary.expectedMomo !== null && summary.closingMomo !== null
          ? roundMoney(summary.closingMomo - summary.expectedMomo)
          : null,
    }));

  const byMethod: Record<string, number> = {};
  let takings = 0;
  let orderCount = 0;
  let expectedCash = 0;
  let countedCash = 0;
  let allCounted = shifts.length > 0;
  let momoTaken = 0;
  let momoDifference = 0;
  let anyMomo = false;
  let spends = 0;
  let deposits = 0;
  let openShifts = 0;

  for (const { summary, report, momoDifference: momo } of shifts) {
    takings += summary.takings.gross;
    orderCount += summary.takings.orderCount;
    for (const [method, amount] of Object.entries(summary.takings.byMethod)) {
      byMethod[method] = roundMoney((byMethod[method] ?? 0) + amount);
    }
    expectedCash += summary.expectedCash;
    if (summary.closingCash === null) allCounted = false;
    else countedCash += summary.closingCash;
    momoTaken += summary.takings.momo;
    if (momo !== null) {
      anyMomo = true;
      momoDifference += momo;
    }
    spends += report.spends.amount;
    deposits += report.deposits.momo + report.deposits.bank;
    if (summary.status === "OPEN") openShifts += 1;
  }

  return {
    shifts,
    totals: {
      takings: roundMoney(takings),
      orders: orderCount,
      byMethod,
      expectedCash: roundMoney(expectedCash),
      countedCash: allCounted ? roundMoney(countedCash) : null,
      cashDifference: allCounted ? roundMoney(countedCash - expectedCash) : null,
      momoTaken: roundMoney(momoTaken),
      momoDifference: anyMomo ? roundMoney(momoDifference) : null,
      spends: roundMoney(spends),
      deposits: roundMoney(deposits),
      openShifts,
    },
  };
}
