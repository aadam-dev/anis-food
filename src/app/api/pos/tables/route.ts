import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, handlePrismaError } from "@/lib/api-utils";
import { toMoney } from "@/lib/money";
import { PaymentStatus, OrderStatus } from "@/generated/prisma";

/**
 * The floor, as the till needs it: every active table and whichever order is
 * currently open against it. A table is "occupied" when it has an unpaid order
 * (its tab); settling or voiding that order frees the table on the next read.
 */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const [tables, openOrders] = await Promise.all([
      prisma.restaurantTable.findMany({
        where: { isActive: true },
        orderBy: [{ zone: "asc" }, { sortOrder: "asc" }],
        select: { id: true, label: true, zone: true, seats: true },
      }),
      prisma.order.findMany({
        where: {
          tableId: { not: null },
          paymentStatus: PaymentStatus.PENDING,
          status: { not: OrderStatus.CANCELLED },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          orderNumber: true,
          tableId: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

    // One open tab per table — if two exist (shouldn't), the oldest wins.
    const tabByTable = new Map<string, (typeof openOrders)[number]>();
    for (const order of openOrders) {
      if (order.tableId && !tabByTable.has(order.tableId)) {
        tabByTable.set(order.tableId, order);
      }
    }

    return ok({
      tables: tables.map((table) => {
        const tab = tabByTable.get(table.id);
        return {
          id: table.id,
          label: table.label,
          zone: table.zone,
          seats: table.seats,
          openOrder: tab
            ? {
                id: tab.id,
                orderNumber: tab.orderNumber,
                total: toMoney(tab.total),
                items: tab._count.items,
                openedAt: tab.createdAt.toISOString(),
              }
            : null,
        };
      }),
    });
  } catch (error) {
    return handlePrismaError(error, "pos/tables GET");
  }
}
