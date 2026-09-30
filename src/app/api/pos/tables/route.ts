import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, handlePrismaError } from "@/lib/api-utils";

/** Free and occupied tables for the till's table picker. */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const [tables, openOrders] = await Promise.all([
      prisma.diningTable.findMany({
        where: { isActive: true, area: { isActive: true } },
        orderBy: [{ area: { sortOrder: "asc" } }, { label: "asc" }],
        include: { area: { select: { name: true } } },
      }),
      prisma.order.findMany({
        where: {
          tableId: { not: null },
          isDemo: false,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
        select: { tableId: true },
      }),
    ]);
    const taken = new Set(openOrders.map((order) => order.tableId));
    return ok({
      tables: tables.map((table) => ({
        id: table.id,
        label: table.label,
        seats: table.seats,
        area: table.area.name,
        occupied: taken.has(table.id),
      })),
    });
  } catch (error) {
    return handlePrismaError(error, "pos/tables GET");
  }
}
