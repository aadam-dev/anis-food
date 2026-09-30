import { prisma } from "@/lib/db";

/** Areas, tables, and which tables currently hold an open ticket. */
export async function loadFloor() {
  const [areas, openOrders] = await Promise.all([
    prisma.diningArea.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        tables: { where: { isActive: true }, orderBy: { label: "asc" } },
      },
    }),
    prisma.order.findMany({
      where: {
        tableId: { not: null },
        isDemo: false,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      select: { id: true, tableId: true, customerName: true, orderNumber: true },
    }),
  ]);

  const byTable = new Map(openOrders.map((order) => [order.tableId, order]));

  return {
    areas: areas.map((area) => ({
      id: area.id,
      name: area.name,
      tables: area.tables.map((table) => {
        const open = byTable.get(table.id);
        return {
          id: table.id,
          label: table.label,
          seats: table.seats,
          x: table.x,
          y: table.y,
          occupied: open
            ? { orderId: open.id, name: open.customerName, orderNumber: open.orderNumber }
            : null,
        };
      }),
    })),
  };
}

export type FloorPayload = Awaited<ReturnType<typeof loadFloor>>;
