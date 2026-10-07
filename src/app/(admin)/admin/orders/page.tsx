import { prisma } from "@/lib/db";
import { SELLABLE_DISH } from "@/lib/menu-sizes";
import { formatGHS, toMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { canEditPaidOrders } from "@/lib/permissions";
import { resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { serialiseOrder } from "@/lib/serialise-order";
import { menuImage } from "@/lib/menu-image";
import { PageHeader } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import { PAYMENT_LABELS, VOID_REASON_LABELS } from "@/components/admin/labels";
import type { OrderView, PosCategory, PosMenuItem } from "@/components/pos/types";
import OrdersClient, { type AdminOrder, type OrderFilter } from "./OrdersClient";

/** The most orders one screen loads; the list says so when it is cut short. */
const ORDER_LIMIT = 500;

/** Links from the dashboard, reports and customers preselect a filter with `?status=`. */
const STATUS_FILTERS: Record<string, OrderFilter> = {
  open: "unpaid",
  unpaid: "unpaid",
  paid: "paid",
  voided: "voided",
  edited: "edited",
};

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

type LineSummary = { name: string; size?: string | null; quantity: number };

function lineList(lines: LineSummary[] | undefined): string {
  return (lines ?? []).map((line) => `${line.quantity}× ${line.name}${line.size ? ` (${line.size})` : ""}`).join(", ");
}

/** One plain sentence per event, for the order's history. */
function describeEvent(type: string, detail: Record<string, unknown> | null): string | null {
  const d = detail ?? {};
  const method = (value: unknown) => PAYMENT_LABELS[String(value)] ?? String(value);
  switch (type) {
    case "CREATED":
      return `Rung up${d.total !== undefined ? ` for ${formatGHS(Number(d.total))}` : ""}${
        d.paymentMethod ? `, ${d.paymentMethod === "UNPAID" ? "pay later" : method(d.paymentMethod)}` : ""
      }${d.source === "ONLINE" ? " (online)" : ""}`;
    case "SETTLED":
      return `Paid${d.paymentMethod ? ` by ${method(d.paymentMethod)}` : ""}`;
    case "VOIDED":
      return `Voided${d.reason ? `: ${VOID_REASON_LABELS[String(d.reason)] ?? String(d.reason)}` : ""}`;
    case "REFUNDED":
      return "Refunded";
    case "EDITED": {
      const parts: string[] = [];
      if (d.change === "payment") {
        const payment = d.payment as { from?: string; to?: string } | undefined;
        parts.push(`Payment changed from ${method(payment?.from)} to ${method(payment?.to)}`);
      } else {
        const added = lineList(d.added as LineSummary[]);
        const removed = lineList(d.removed as LineSummary[]);
        if (added) parts.push(`added ${added}`);
        if (removed) parts.push(`removed ${removed}`);
        const before = d.before as { total?: number; payment?: string } | undefined;
        const after = d.after as { total?: number; payment?: string } | undefined;
        if (before?.total !== undefined && after?.total !== undefined && before.total !== after.total) {
          parts.push(`total ${formatGHS(before.total)} → ${formatGHS(after.total)}`);
        }
        if (before?.payment && after?.payment && before.payment !== after.payment) {
          parts.push(`payment ${method(before.payment)} → ${method(after.payment)}`);
        }
        if (parts.length === 0) parts.push("quantities changed");
        parts[0] = `Edited: ${parts[0]}`;
      }
      if (d.reason) parts.push(`because "${String(d.reason)}"`);
      return parts.join("; ");
    }
    case "STATUS_CHANGED":
      // Older edits were recorded as status changes; kitchen moves are noise here.
      if (d.action === "payment_corrected") return `Payment changed from ${method(d.from)} to ${method(d.to)}`;
      if (d.action === "lines_edited") return "Edited: quantities changed";
      return null;
    default:
      return null;
  }
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = resolvePeriod(params, "today");
  const { start, end } = periodBounds(period.from, period.to);
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;

  const [orders, cashiers, settings, user, categories, items] = await Promise.all([
    prisma.order.findMany({
      where: { isDemo: false, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        staff: { select: { id: true, name: true } },
        session: { select: { status: true } },
        events: {
          orderBy: { createdAt: "asc" },
          select: { type: true, detail: true, createdAt: true, actor: { select: { name: true } } },
        },
      },
      take: ORDER_LIMIT,
    }),
    prisma.user.findMany({
      where: { OR: [{ role: "CASHIER" }, { orders: { some: { createdAt: { gte: start, lt: end } } } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSettings(),
    getCurrentUser(),
    prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true },
    }),
    prisma.menuItem.findMany({
      where: SELLABLE_DISH,
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        categoryId: true,
        imageUrl: true,
        isPopular: true,
        sizes: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, price: true } },
      },
    }),
  ]);

  const serialized: AdminOrder[] = orders.map((order) => {
    const history = order.events
      .map((event) => ({
        at: event.createdAt.toISOString(),
        by: event.actor?.name ?? (event.type === "CREATED" && order.source === "ONLINE" ? "Website" : null),
        text: describeEvent(event.type, event.detail as Record<string, unknown> | null),
      }))
      .filter((entry): entry is { at: string; by: string | null; text: string } => entry.text !== null);
    const legacyEdit = order.events.some(
      (event) =>
        event.type === "STATUS_CHANGED" &&
        ["payment_corrected", "lines_edited"].includes(String((event.detail as { action?: string } | null)?.action)),
    );
    return {
      ...(serialiseOrder(order) as OrderView),
      staff: order.staff?.name ?? null,
      voidReason: order.voidReason,
      voidNote: order.voidNote,
      shiftStatus: order.session ? (order.session.status as "OPEN" | "CLOSED") : null,
      edited: order.editCount > 0 || legacyEdit,
      history,
    };
  });

  const menu: { categories: PosCategory[]; items: PosMenuItem[] } = {
    categories,
    items: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      price: item.sizes.length ? Math.min(...item.sizes.map((size) => toMoney(size.price))) : toMoney(item.price),
      sizes: item.sizes.map((size) => ({ id: size.id, label: size.label, price: toMoney(size.price) })),
      categoryId: item.categoryId,
      imageUrl: menuImage(item.imageUrl, item.categoryId, item.name),
      isPopular: item.isPopular,
    })),
  };

  return (
    <>
      <PageHeader
        eyebrow={`Sales · ${period.label}`}
        title="Orders"
        description="Till sales and online orders. Open one for its details, history, receipt, edit and void."
        actions={<PeriodPicker period={period} presets={["today", "yesterday", "week", "month"]} />}
      />
      <OrdersClient
        key={`${period.from}-${period.to}-${status ?? ""}-${q ?? ""}`}
        orders={serialized}
        cashiers={cashiers}
        menu={menu}
        canEditPaid={canEditPaidOrders(user?.role)}
        multiDay={period.from !== period.to}
        truncated={orders.length === ORDER_LIMIT}
        initialFilter={(status && STATUS_FILTERS[status]) || "all"}
        initialQuery={q ?? ""}
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
