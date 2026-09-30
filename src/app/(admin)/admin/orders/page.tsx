import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { businessDay, businessDayRange } from "@/lib/session-utils";
import { getSettings } from "@/lib/settings";
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
  const settings = await getSettings();

  const [orders, cashiers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      include: {
        items: { select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true, notes: true } },
        staff: { select: { id: true, name: true } },
      },
      take: 300,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { role: "CASHIER" },
          { orders: { some: { createdAt: { gte: start, lt: end } } } },
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serialized: AdminOrder[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    source: order.source,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: toMoney(order.total),
    staffId: order.staff?.id ?? null,
    staff: order.staff?.name ?? null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    voidReason: order.voidReason,
    clientRef: order.clientRef,
    deliveryType: order.deliveryType,
    tableLabel: order.tableLabel,
    subtotal: toMoney(order.subtotal),
    discountAmount: toMoney(order.discountAmount),
    taxAmount: toMoney(order.taxAmount),
    tax: (order.transactionSnapshot as { tax?: AdminOrder["tax"] } | null)?.tax ?? null,
    splitPayments: order.splitPayments as AdminOrder["splitPayments"],
    tenderedAmount: order.tenderedAmount === null ? null : toMoney(order.tenderedAmount),
    changeAmount: order.changeAmount === null ? null : toMoney(order.changeAmount),
    notes: order.notes,
    paymentReference: order.paymentReference,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: toMoney(item.unitPrice),
      lineTotal: toMoney(item.lineTotal),
      notes: item.notes,
    })),
  }));

  return (
    <>
      <PageHeader title="Orders" description="Till sales and online orders for the chosen day." />
      <OrdersClient
        orders={serialized}
        cashiers={cashiers}
        day={day}
        business={{
          header: settings.receipt_header,
          address: settings.business_address,
          phone: settings.business_phone,
          footer: settings.receipt_footer,
          taxLabel: settings.tax_label,
          whatsapp: settings.business_whatsapp || settings.business_phone,
        }}
      />
    </>
  );
}
