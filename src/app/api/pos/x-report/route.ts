import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, handlePrismaError } from "@/lib/api-utils";
import { currentSession } from "@/lib/pos-session";
import { buildXReport, type XReportOrder } from "@/lib/x-report";

/**
 * Mid-shift X report. Read-only: nothing here closes the shift or writes a row.
 */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const session = await currentSession();
    if (!session || session.status !== "OPEN") return ok({ report: null });

    // Cashiers only see the tickets they punched. Managers and owners keep the
    // full shift reading — they need the drawer, not a personal slice.
    const mineOnly = auth.user.role === "CASHIER";
    const [orders, movementRows] = await Promise.all([
      prisma.order.findMany({
        where: {
          sessionId: session.id,
          isDemo: false,
          ...(mineOnly ? { staffId: auth.user.sub } : {}),
        },
        select: {
          paymentMethod: true,
          paymentStatus: true,
          status: true,
          total: true,
          splitPayments: true,
        },
      }),
      mineOnly
        ? prisma.cashMovement.findMany({
            where: { sessionId: session.id, createdById: auth.user.sub },
            select: {
              direction: true,
              amount: true,
              reason: true,
              kind: true,
              destination: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const movements = movementRows
      ?? session.movements.map((movement) => ({
          direction: movement.direction,
          amount: movement.amount,
          reason: movement.reason,
          kind: movement.kind,
          destination: movement.destination,
        }));

    const report = buildXReport({
      openingFloat: session.openingFloat,
      openingMomo: session.openingMomo,
      orders: orders.map(
        (order): XReportOrder => ({
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
          total: order.total,
          splitPayments: Array.isArray(order.splitPayments)
            ? (order.splitPayments as { method: string; amount: number }[])
            : null,
        }),
      ),
      movements: movements.map((movement) => ({
        direction: movement.direction as "IN" | "OUT",
        amount: typeof movement.amount === "number" ? movement.amount : Number(movement.amount),
        reason: movement.reason,
        kind: movement.kind,
        destination: movement.destination,
      })),
    });

    return ok({
      report,
      businessDay: session.businessDay,
      openedAt: session.openedAt,
      openedBy: session.openedBy.name,
      scope: mineOnly ? "mine" : "shift",
      cashierName: mineOnly ? auth.user.name : null,
    });
  } catch (error) {
    return handlePrismaError(error, "pos/x-report GET");
  }
}
