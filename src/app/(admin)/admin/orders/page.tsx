import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { PageHeader } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import OrdersClient, { type AdminOrder, type OrderFilter } from "./OrdersClient";

/** The most orders one screen loads; the list says so when it is cut short. */
const ORDER_LIMIT = 500;

/** Links from the dashboard and reports preselect a filter with `?status=`. */
const STATUS_FILTERS: Record<string, OrderFilter> = {
  open: "unpaid",
  unpaid: "unpaid",
  paid: "paid",
  voided: "voided",
  online: "online",
};

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = resolvePeriod(params, "today");
  const { start, end } = periodBounds(period.from, period.to);
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const settings = await getSettings();

  const [orders, cashiers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      include: {
        items: { select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true, notes: true } },
        staff: { select: { id: true, name: true } },
      },
      take: ORDER_LIMIT,
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
      <PageHeader
        eyebrow={`Sales · ${period.label}`}
        title="Orders"
        description="Till sales and online orders. Tap one for its items, receipt and void."
        actions={<PeriodPicker period={period} presets={["today", "yesterday", "week", "month"]} />}
      />
      <OrdersClient
        key={`${period.from}-${period.to}-${status ?? ""}`}
        orders={serialized}
        cashiers={cashiers}
        multiDay={period.from !== period.to}
        truncated={orders.length === ORDER_LIMIT}
        initialFilter={(status && STATUS_FILTERS[status]) || "all"}
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
