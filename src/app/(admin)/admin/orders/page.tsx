import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { businessDay, businessDayRange } from "@/lib/session-utils";
import { PageHeader } from "@/components/admin/ui";
import OrdersClient, { type AdminOrder } from "./OrdersClient";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const params = await searchParams;
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : businessDay();
  const { start, end } = businessDayRange(day);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { id: true, name: true, quantity: true, lineTotal: true } },
      staff: { select: { name: true } },
    },
    take: 300,
  });

  const serialized: AdminOrder[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    source: order.source,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: toMoney(order.total),
    staff: order.staff?.name ?? null,
    customerName: order.customerName,
    voidReason: order.voidReason,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      lineTotal: toMoney(item.lineTotal),
    })),
  }));

  return (
    <>
      <PageHeader title="Orders" description="Every sale rung on the chosen day." />
      <OrdersClient orders={serialized} day={day} />
    </>
  );
}
