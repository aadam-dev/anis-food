import "server-only";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { drawerDifference, differenceLabel } from "@/lib/cash";
import { businessDay, businessDayRange } from "@/lib/session-utils";

/** Closed shifts in a month, with their reconciliation, for the report. */
export async function getSessionsForMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = businessDayRange(`${month}-01`).start;
  const nextMonth =
    m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;
  const end = businessDayRange(nextMonth).start;

  const sessions = await prisma.posSession.findMany({
    where: { openedAt: { gte: start, lt: end } },
    orderBy: { openedAt: "desc" },
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });

  return sessions.map((session) => {
    const expected =
      session.expectedCash === null ? null : toMoney(session.expectedCash);
    const counted = session.closingCash === null ? null : toMoney(session.closingCash);
    const difference = drawerDifference(expected, counted);
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
    };
  });
}
