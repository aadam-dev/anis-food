import { NextResponse } from "next/server";
import { requireResource } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { roundMoney, toMoney } from "@/lib/money";
import { resolvePeriod } from "@/lib/period";
import { getLedger, periodBounds } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { callNumber } from "@/lib/session-utils";
import { Report, periodText } from "@/lib/excel";
import { ORDER_SOURCE_LABELS, PAYMENT_LABELS, VOID_REASON_LABELS } from "@/components/admin/labels";

const TYPE_LABELS: Record<string, string> = { DINE_IN: "Dine-in", TAKEAWAY: "Takeaway", DELIVERY: "Delivery" };

/** What happened to the order, in one word an accountant can filter on. */
function state(order: { status: string; paymentStatus: string }): string {
  if (order.status === "CANCELLED") return "Voided";
  if (order.paymentStatus === "REFUNDED") return "Refunded";
  if (order.paymentStatus === "PAID") return "Paid";
  return "Unpaid";
}

/**
 * Every sale in a period: a summary, each order, each line sold, and the day,
 * item and hour breakdowns. `period=today|week|month|…` or `from=&to=`;
 * `format=csv` gives the orders as plain text.
 */
export async function GET(request: Request) {
  const auth = await requireResource("reports");
  if (auth instanceof NextResponse) return auth;
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const period = resolvePeriod(params, "today");
  const { start, end } = periodBounds(period.from, period.to);

  const [orders, ledger, settings, me] = await Promise.all([
    prisma.order.findMany({
      where: { isDemo: false, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      include: { items: true, staff: { select: { name: true } } },
    }),
    getLedger(period.from, period.to),
    getSettings(),
    prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } }),
  ]);

  const rows = orders.map((order) => ({
    call: Number(callNumber(order.orderNumber)) || callNumber(order.orderNumber),
    number: order.orderNumber,
    at: order.createdAt,
    source: ORDER_SOURCE_LABELS[order.source] ?? order.source,
    type: TYPE_LABELS[order.deliveryType] ?? order.deliveryType,
    table: order.tableLabel,
    customer: order.customerName,
    phone: order.customerPhone,
    cashier: order.staff?.name ?? (order.source === "ONLINE" ? "Website" : null),
    items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: toMoney(order.subtotal),
    discount: toMoney(order.discountAmount),
    total: toMoney(order.total),
    payment: order.paymentMethod === "UNPAID" ? "Pay later" : (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod),
    state: state(order),
    voidReason: order.voidReason ? (VOID_REASON_LABELS[order.voidReason] ?? order.voidReason) : null,
    edited: order.editCount > 0 ? "Yes" : "",
    boltFee: order.platformFee === null ? null : toMoney(order.platformFee),
  }));

  if (params.format === "csv") {
    const header = ["Order", "Order no.", "Date", "Source", "Type", "Customer", "Cashier", "Items", "Subtotal", "Discount", "Total", "Payment", "Status", "Edited", "Bolt fee"];
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [header.map(cell).join(",")].concat(
      rows.map((row) =>
        [row.call, row.number, row.at.toISOString(), row.source, row.type, row.customer, row.cashier, row.items, row.subtotal, row.discount, row.total, row.payment, row.state, row.edited, row.boltFee ?? ""]
          .map(cell)
          .join(","),
      ),
    );
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="anis-sales-${period.from}-to-${period.to}.csv"`,
      },
    });
  }

  const paid = orders.filter((order) => state(order) === "Paid");
  const lines = paid.flatMap((order) =>
    order.items.map((item) => ({
      at: order.createdAt,
      number: order.orderNumber,
      name: item.name,
      size: item.sizeLabel,
      quantity: item.quantity,
      unit: toMoney(item.unitPrice),
      total: toMoney(item.lineTotal),
      cashier: order.staff?.name ?? "",
    })),
  );

  const byItem = new Map<string, { name: string; quantity: number; sales: number }>();
  for (const line of lines) {
    const key = `${line.name}${line.size ? ` · ${line.size}` : ""}`;
    const entry = byItem.get(key) ?? { name: key, quantity: 0, sales: 0 };
    entry.quantity += line.quantity;
    entry.sales = roundMoney(entry.sales + line.total);
    byItem.set(key, entry);
  }
  const items = [...byItem.values()].sort((a, b) => b.sales - a.sales);
  const itemTotal = items.reduce((sum, item) => sum + item.sales, 0);

  const report = new Report({ business: settings.business_name, period: periodText(period.from, period.to), generatedBy: me?.name });
  const voided = rows.filter((row) => row.state === "Voided");
  const unpaid = rows.filter((row) => row.state === "Unpaid");

  report.summary("Summary", {
    title: "Sales summary",
    rows: [
      "Sales",
      { label: "Sales (paid orders)", value: ledger.takings, strong: true },
      { label: "Paid orders", value: ledger.orderCount, type: "number" },
      { label: "Average order", value: ledger.averageTicket },
      { label: "Discounts given", value: ledger.discounts, detail: `${ledger.discountedOrders} order(s)` },
      { label: "Bolt commission", value: ledger.platformFees.amount, detail: `${ledger.platformFees.count} Bolt order(s), ${ledger.platformFees.sales.toFixed(2)} in sales` },
      "How customers paid",
      ...ledger.paymentMix.map((entry) => ({ label: PAYMENT_LABELS[entry.method] ?? entry.method, value: entry.amount })),
      "Not in sales",
      { label: "Voided orders", value: voided.reduce((sum, row) => sum + row.total, 0), detail: `${voided.length} order(s)` },
      { label: "Still unpaid", value: unpaid.reduce((sum, row) => sum + row.total, 0), detail: `${unpaid.length} order(s)` },
    ],
  });

  report.table("Orders", {
    title: "Every order",
    note: "All orders in the period, including voided and unpaid ones. Filter the Status column.",
    totals: true,
    columns: [
      { header: "No.", value: (row) => row.call, type: "number" },
      { header: "Order no.", value: (row) => row.number },
      { header: "Date & time", value: (row) => row.at, type: "datetime" },
      { header: "Source", value: (row) => row.source },
      { header: "Type", value: (row) => row.type },
      { header: "Table", value: (row) => row.table },
      { header: "Customer", value: (row) => row.customer },
      { header: "Phone", value: (row) => row.phone },
      { header: "Cashier", value: (row) => row.cashier },
      { header: "Items", value: (row) => row.items, type: "number", total: true },
      { header: "Subtotal", value: (row) => row.subtotal, type: "money", total: true },
      { header: "Discount", value: (row) => row.discount || null, type: "money", total: true },
      { header: "Total", value: (row) => row.total, type: "money", total: true },
      { header: "Payment", value: (row) => row.payment },
      { header: "Status", value: (row) => row.state },
      { header: "Void reason", value: (row) => row.voidReason },
      { header: "Edited", value: (row) => row.edited },
      { header: "Bolt fee", value: (row) => row.boltFee, type: "money", total: true },
    ],
    rows,
  });

  report.table("Items sold", {
    title: "Every item sold",
    note: "Paid orders only.",
    totals: true,
    columns: [
      { header: "Date & time", value: (line) => line.at, type: "datetime" },
      { header: "Order no.", value: (line) => line.number },
      { header: "Item", value: (line) => line.name },
      { header: "Size", value: (line) => line.size },
      { header: "Qty", value: (line) => line.quantity, type: "number", total: true },
      { header: "Unit price", value: (line) => line.unit, type: "money" },
      { header: "Line total", value: (line) => line.total, type: "money", total: true },
      { header: "Cashier", value: (line) => line.cashier },
    ],
    rows: lines,
  });

  report.table("By day", {
    title: "Sales by day",
    totals: true,
    columns: [
      { header: "Day", value: (day) => new Date(`${day.day}T12:00:00Z`), type: "date" },
      { header: "Orders", value: (day) => day.orders, type: "number", total: true },
      { header: "Sales", value: (day) => day.revenue, type: "money", total: true },
      { header: "Average order", value: (day) => (day.orders ? day.revenue / day.orders : 0), type: "money" },
    ],
    rows: ledger.daily,
  });

  report.table("By item", {
    title: "Sales by item",
    totals: true,
    columns: [
      { header: "Item", value: (item) => item.name },
      { header: "Sold", value: (item) => item.quantity, type: "number", total: true },
      { header: "Sales", value: (item) => item.sales, type: "money", total: true },
      { header: "Share of sales", value: (item) => (itemTotal ? item.sales / itemTotal : 0), type: "percent" },
    ],
    rows: items,
  });

  report.table("By hour", {
    title: "Sales by hour of day",
    note: "Across the whole period.",
    totals: true,
    columns: [
      { header: "Hour", value: (hour) => `${String(hour.hour).padStart(2, "0")}:00 – ${String(hour.hour).padStart(2, "0")}:59` },
      { header: "Orders", value: (hour) => hour.orders, type: "number", total: true },
      { header: "Sales", value: (hour) => hour.revenue, type: "money", total: true },
    ],
    rows: ledger.hourly.filter((hour) => hour.orders > 0),
  });

  return report.response(`anis-sales-${period.from}-to-${period.to}`);
}
