import "server-only";
import { prisma } from "@/lib/db";
import { toMoney, roundMoney } from "@/lib/money";
import {
  expectedCash,
  walletTotals,
  drawerDifference,
  differenceLabel,
  splitMovements,
  type DenominationCount,
} from "@/lib/cash";
import { isStaleSession, businessDay } from "@/lib/session-utils";
import { PaymentMethod, PaymentStatus, OrderStatus, SessionStatus } from "@/generated/prisma";

/**
 * Shift figures, in one place.
 *
 * Shared by the API and by the server-rendered till page, so the numbers the
 * cashier sees on first paint are produced by exactly the same code as the ones
 * that arrive on refresh.
 */

/** Sums takings for a shift, splitting SPLIT orders into their legs. */
export async function takingsFor(sessionId: string) {
  const orders = await prisma.order.findMany({
    where: {
      sessionId,
      isDemo: false,
      paymentStatus: PaymentStatus.PAID,
      status: { not: OrderStatus.CANCELLED },
    },
    select: { paymentMethod: true, total: true, splitPayments: true },
  });

  const byMethod: Record<string, number> = {};
  let gross = 0;

  for (const order of orders) {
    const total = toMoney(order.total);
    gross += total;

    if (order.paymentMethod === PaymentMethod.SPLIT && Array.isArray(order.splitPayments)) {
      // A split bill is not "SPLIT revenue" — it is cash revenue *and* MoMo
      // revenue. Lumping it under one label makes the drawer impossible to
      // reconcile, so each leg is credited to the method that actually took it.
      for (const leg of order.splitPayments as { method: string; amount: number }[]) {
        byMethod[leg.method] = roundMoney((byMethod[leg.method] ?? 0) + toMoney(leg.amount));
      }
    } else {
      byMethod[order.paymentMethod] = roundMoney((byMethod[order.paymentMethod] ?? 0) + total);
    }
  }

  return {
    gross: roundMoney(gross),
    byMethod,
    cash: byMethod[PaymentMethod.CASH] ?? 0,
    momo: byMethod[PaymentMethod.MOMO] ?? 0,
    orderCount: orders.length,
  };
}

export async function summariseSession(sessionId: string) {
  const session = await prisma.posSession.findUnique({
    where: { id: sessionId },
    include: {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
      cashMovements: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true } } },
      },
    },
  });
  if (!session) return null;

  const takings = await takingsFor(session.id);
  const { cashIn, cashOut } = splitMovements(
    session.cashMovements.map((movement) => ({
      direction: movement.direction,
      amount: toMoney(movement.amount),
    })),
  );

  const expected = expectedCash({
    openingFloat: toMoney(session.openingFloat),
    cashRevenue: takings.cash,
    cashIn,
    cashOut,
  });

  const wallet = walletTotals({
    openingMomo: session.openingMomo === null ? null : toMoney(session.openingMomo),
    momoRevenue: takings.momo,
  });

  const counted =
    session.closingCash === null || session.closingCash === undefined
      ? null
      : toMoney(session.closingCash);
  const difference = drawerDifference(expected, counted);

  return {
    id: session.id,
    status: session.status,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openedBy: session.openedBy,
    closedBy: session.closedBy,
    businessDay: businessDay(session.openedAt),
    isStale: session.status === SessionStatus.OPEN && isStaleSession(session.openedAt),
    openingFloat: toMoney(session.openingFloat),
    openingMomo: session.openingMomo === null ? null : toMoney(session.openingMomo),
    takings,
    cashIn,
    cashOut,
    expectedCash: expected,
    expectedMomo: wallet.expected,
    closingCash: counted,
    closingMomo:
      session.closingMomo === null || session.closingMomo === undefined
        ? null
        : toMoney(session.closingMomo),
    cashCount: session.cashCount as DenominationCount | null,
    difference,
    differenceLabel: differenceLabel(difference),
    movements: session.cashMovements.map((movement) => ({
      id: movement.id,
      direction: movement.direction,
      amount: toMoney(movement.amount),
      reason: movement.reason,
      by: movement.createdBy.name,
      at: movement.createdAt.toISOString(),
    })),
    notes: session.notes,
  };
}

/** The shift the till should be working against, if any. */
export async function currentSession() {
  const open = await prisma.posSession.findFirst({
    where: { status: SessionStatus.OPEN },
    orderBy: { openedAt: "desc" },
    select: { id: true },
  });
  return open ? summariseSession(open.id) : null;
}
