import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  CalendarRange,
  ChefHat,
  ChevronRight,
  CircleCheck,
  Clock,
  Coins,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { getDashboard, change } from "@/lib/reports";
import { formatGHS, toMoney } from "@/lib/money";
import { callNumber, businessDay } from "@/lib/session-utils";
import { formatRange } from "@/lib/period";
import { prisma } from "@/lib/db";
import { menuImage } from "@/lib/menu-image";
import { PageHeader, Panel, PanelLink, Chip, Stat, ShareBar } from "@/components/admin/ui";
import { DonutChart, SERIES, TrendChart } from "@/components/admin/charts";
import { ORDER_SOURCE_LABELS, ORDER_STATUS_LABELS, PAYMENT_LABELS } from "@/components/admin/labels";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

interface Attention {
  key: string;
  tone: "bad" | "warn" | "neutral";
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
}

export default async function AdminOverviewPage() {
  const now = new Date();
  const [data, tableTotal, occupied, recent] = await Promise.all([
    getDashboard(now),
    prisma.restaurantTable.count({ where: { isActive: true } }),
    prisma.order.count({
      where: {
        tableId: { not: null },
        isDemo: false,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    }),
    prisma.order.findMany({
      where: { isDemo: false },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        table: { select: { label: true } },
        items: {
          take: 1,
          include: { menuItem: { select: { imageUrl: true, categoryId: true } } },
        },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const { today } = data;
  const todayKey = businessDay(now);
  const weekdayName = new Date().toLocaleDateString("en-GB", { weekday: "long", timeZone: "Africa/Accra" });
  const shift = data.openShift;

  // ---- What needs a person, most urgent first ------------------------------
  const attention: Attention[] = [];
  if (shift?.isStale) {
    attention.push({
      key: "stale-shift",
      tone: "bad",
      icon: <AlertTriangle />,
      title: "An old shift was never closed",
      detail: `Opened by ${shift.openedBy} on ${shift.businessDay}. Close it at the till.`,
      href: "/pos",
    });
  }
  if (data.openTickets.stale > 0) {
    attention.push({
      key: "tickets",
      tone: "warn",
      icon: <Clock />,
      title: `${data.openTickets.stale} unpaid ticket${data.openTickets.stale === 1 ? "" : "s"} over 30 min`,
      detail: `${formatGHS(data.openTickets.value)} waiting across ${data.openTickets.count} open ticket${data.openTickets.count === 1 ? "" : "s"}.`,
      href: "/admin/orders?status=open&period=today",
    });
  }
  const lastDiff = data.lastClosedShift?.difference;
  if (data.lastClosedShift && lastDiff !== null && lastDiff !== undefined && lastDiff !== 0) {
    attention.push({
      key: "variance",
      tone: lastDiff < 0 ? "bad" : "warn",
      icon: <Coins />,
      title: `Last shift was ${lastDiff < 0 ? "short" : "over"} by ${formatGHS(Math.abs(lastDiff))}`,
      detail: `${formatRange(data.lastClosedShift.day, data.lastClosedShift.day)}${
        data.lastClosedShift.closedBy ? ` · closed by ${data.lastClosedShift.closedBy}` : ""
      }`,
      href: `/admin/cash-up?day=${data.lastClosedShift.day}`,
    });
  }
  if (data.lowStock.length > 0) {
    attention.push({
      key: "stock",
      tone: "warn",
      icon: <Boxes />,
      title: `${data.lowStock.length} stock item${data.lowStock.length === 1 ? "" : "s"} running low`,
      detail: data.lowStock
        .slice(0, 3)
        .map((item) => item.name)
        .join(", "),
      href: "/admin/inventory",
    });
  }
  if (today.boltAwaiting.count > 0) {
    attention.push({
      key: "bolt",
      tone: "neutral",
      icon: <ReceiptText />,
      title: `${today.boltAwaiting.count} Bolt order${today.boltAwaiting.count === 1 ? "" : "s"} awaiting payout`,
      detail: `${formatGHS(today.boltAwaiting.amount)} not in the drawer until Bolt pays.`,
      href: "/admin/orders?period=today",
    });
  }

  const paymentTotal = today.paymentMix.reduce((sum, row) => sum + row.amount, 0);
  const availableTables = Math.max(0, tableTotal - occupied);

  return (
    <>
      <PageHeader
        eyebrow={formatRange(todayKey, todayKey)}
        title="Today"
        description={`Paid sales against last ${weekdayName}, and anything that needs you.`}
      />

      {!data.booksReady && (
        <p className="mb-4 text-sm" style={{ color: "var(--s-warn)" }}>
          The till&apos;s books update has not finished, so drawer and deposit figures are hidden until it does.
        </p>
      )}

      {/* ---- Headline numbers -------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Sales today"
          value={formatGHS(today.netSales)}
          delta={change(today.netSales, data.lastWeek.revenue)}
          detail={`${formatGHS(data.lastWeek.revenue)} last ${weekdayName}`}
          tint="good"
          icon={<TrendingUp />}
          href="/admin/reports?tab=sales&period=today"
        />
        <Stat
          label="Paid orders"
          value={today.orderCount}
          delta={change(today.orderCount, data.lastWeek.orders)}
          detail={today.orderCount ? `Avg ${formatGHS(today.averageTicket)}` : "None yet today"}
          tint="accent"
          icon={<ReceiptText />}
          href="/admin/orders?period=today"
        />
        <Stat
          label="This week"
          value={formatGHS(data.weekToDate.revenue)}
          delta={data.weekToDate.delta}
          detail="Mon to today, vs the same days last week"
          tint="brand"
          icon={<CalendarDays />}
          href="/admin/reports?tab=sales&period=week"
        />
        <Stat
          label="This month"
          value={formatGHS(data.monthToDate.revenue)}
          delta={data.monthToDate.delta}
          detail="To date, vs the same days last month"
          tint="neutral"
          icon={<CalendarRange />}
          href="/admin/reports?period=month"
        />
      </div>

      {/* ---- Trend + attention ------------------------------------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Last 14 days"
          explainer="Sales each day. Dashed: the fortnight before."
          action={<PanelLink href="/admin/reports?tab=sales&period=month">Sales report</PanelLink>}
        >
          <div className="px-2 pb-4 sm:px-3">
            <TrendChart data={data.trend} currentLabel="Sales" previousLabel="2 weeks earlier" />
          </div>
        </Panel>

        <Panel
          title="Needs attention"
          action={attention.length > 0 ? <Chip tone="warn">{attention.length}</Chip> : undefined}
        >
          {attention.length === 0 ? (
            <div className="flex flex-col items-center px-5 pb-8 pt-2 text-center">
              <span
                className="mb-2 grid h-11 w-11 place-items-center rounded-2xl"
                style={{ background: "var(--s-good-soft)", color: "var(--s-good)" }}
              >
                <CircleCheck className="h-5 w-5" />
              </span>
              <p className="font-bold">All clear</p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                No stale tickets, cash differences or low stock.
              </p>
            </div>
          ) : (
            <ul className="px-2 pb-2">
              {attention.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-[var(--s-hover)]"
                  >
                    <span
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4"
                      style={{
                        background:
                          item.tone === "bad" ? "var(--s-bad-soft)" : item.tone === "warn" ? "var(--s-warn-soft)" : "var(--s-sunk)",
                        color:
                          item.tone === "bad" ? "var(--s-bad)" : item.tone === "warn" ? "var(--s-warn)" : "var(--s-ink-muted)",
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{item.title}</span>
                      <span className="block truncate text-xs" style={{ color: "var(--s-ink-muted)" }}>
                        {item.detail}
                      </span>
                    </span>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0" style={{ color: "var(--s-ink-faint)" }} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ---- The till right now, payments, best sellers ------------------ */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="The till right now" action={<PanelLink href="/admin/cash-up?period=today">Cash-up</PanelLink>}>
          <dl className="space-y-2.5 px-4 pb-5 text-sm sm:px-5">
            <Line
              label="Drawer should hold"
              value={shift && !shift.isStale ? formatGHS(shift.expectedCash) : "—"}
              hint={shift && !shift.isStale ? `Opened by ${shift.openedBy}` : "No shift open"}
              strong
            />
            <Line
              label="MoMo should be"
              value={
                !shift || shift.isStale
                  ? "—"
                  : shift.expectedMomo === null
                    ? "—"
                    : formatGHS(shift.expectedMomo)
              }
              hint={shift && !shift.isStale && shift.expectedMomo === null ? "Opening MoMo not recorded" : undefined}
            />
            <Line label="Spent today" value={formatGHS(today.expenses.total + today.tillSpends.amount)} />
            <Line
              label="Deposited today"
              value={formatGHS(today.deposits.momo + today.deposits.bank)}
              hint="A transfer, not a cost"
            />
            <div className="grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: "var(--s-border)" }}>
              <MiniFigure label="Unpaid" value={String(data.openTickets.count)} href="/admin/orders?status=open&period=today" />
              <MiniFigure label="In kitchen" value={String(data.kitchenQueue)} href="/pos/kitchen" icon={<ChefHat className="h-3.5 w-3.5" />} />
              <MiniFigure label="Tables free" value={`${availableTables}/${tableTotal}`} href="/admin/tables" />
            </div>
          </dl>
        </Panel>

        <Panel title="How they paid" explainer="Paid sales today, by method">
          <div className="flex flex-col items-center gap-4 px-4 pb-5 sm:flex-row sm:px-5">
            <DonutChart
              size={132}
              data={today.paymentMix.map((row) => ({ label: PAYMENT_LABELS[row.method] ?? row.method, value: row.amount }))}
              centerLabel="Taken"
              centerValue={formatGHS(paymentTotal)}
            />
            {today.paymentMix.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--s-ink-faint)" }}>
                No paid sales yet today.
              </p>
            ) : (
              <ul className="w-full space-y-2 text-sm">
                {today.paymentMix.map((row, index) => (
                  <li key={row.method} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2" style={{ color: "var(--s-ink-muted)" }}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES[index % SERIES.length] }} />
                      {PAYMENT_LABELS[row.method] ?? row.method}
                    </span>
                    <span className="money font-semibold">{formatGHS(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel
          className="md:col-span-2 xl:col-span-1"
          title="Best sellers today"
          action={<PanelLink href="/admin/reports?tab=sales&period=today">All items</PanelLink>}
        >
          {today.topItems.length === 0 ? (
            <p className="px-5 pb-5 text-sm" style={{ color: "var(--s-ink-faint)" }}>
              Dishes appear here once they sell.
            </p>
          ) : (
            <div className="space-y-3 px-4 pb-5 sm:px-5">
              {today.topItems.slice(0, 5).map((item) => (
                <ShareBar
                  key={item.name}
                  label={item.name}
                  sub={`× ${item.quantity}`}
                  value={formatGHS(item.revenue)}
                  share={item.revenue / (today.topItems[0]?.revenue || 1)}
                  tone="accent"
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ---- Recent orders + what is not in takings ---------------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Recent orders"
          explainer="Latest tickets across the store"
          action={<PanelLink href="/admin/orders?period=today">All orders</PanelLink>}
          className="overflow-hidden"
        >
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
              The latest orders will appear here.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
              {recent.map((order) => {
                const first = order.items[0];
                const more = Math.max(0, order._count.items - 1);
                const when = new Date(order.createdAt).toLocaleTimeString("en-GB", {
                  timeZone: "Africa/Accra",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const place =
                  order.table?.label ||
                  (order.source === "ONLINE"
                    ? ORDER_SOURCE_LABELS.ONLINE
                    : order.source === "WALK_IN"
                      ? ORDER_SOURCE_LABELS.WALK_IN
                      : "Counter");
                return (
                  <li key={order.id} style={{ borderColor: "var(--s-border)" }}>
                    <Link
                      href="/admin/orders?period=today"
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--s-hover)]"
                    >
                      <Image
                        src={menuImage(first?.menuItem?.imageUrl, first?.menuItem?.categoryId, first?.name)}
                        alt=""
                        width={48}
                        height={40}
                        className="h-10 w-12 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{first?.name || "Order"}</p>
                        <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                          #{callNumber(order.orderNumber)} · {place} · {when}
                          {more > 0 ? ` · +${more} more` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="money font-semibold">{formatGHS(toMoney(order.total))}</p>
                        <div className="mt-1 flex justify-end gap-1">
                          {order.paymentStatus === "PENDING" && order.status !== "CANCELLED" ? (
                            <Chip tone="warn">Unpaid</Chip>
                          ) : order.paymentStatus === "REFUNDED" ? (
                            <Chip tone="bad">Refunded</Chip>
                          ) : (
                            <Chip tone={order.status === "COMPLETED" ? "good" : order.status === "CANCELLED" ? "bad" : "neutral"}>
                              {ORDER_STATUS_LABELS[order.status] ?? order.status.toLowerCase()}
                            </Chip>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Not in today's sales"
          explainer="Money that moved but is not revenue"
          action={<PanelLink href="/admin/reports?tab=adjustments&period=today">Details</PanelLink>}
        >
          <dl className="space-y-2.5 px-4 pb-5 text-sm sm:px-5">
            <Line label={`Voids · ${today.voids.count}`} value={formatGHS(today.voids.amount)} />
            <Line label={`Refunds · ${today.refunds.count}`} value={formatGHS(today.refunds.amount)} />
            <Line label={`Discounts · ${today.discountedOrders}`} value={formatGHS(today.discounts)} />
            <Line label={`Bolt awaiting · ${today.boltAwaiting.count}`} value={formatGHS(today.boltAwaiting.amount)} />
            {today.tax > 0 && <Line label="VAT & levies collected" value={formatGHS(today.tax)} hint="Held for GRA" />}
          </dl>
        </Panel>
      </div>
    </>
  );
}

function Line({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: strong ? "var(--s-ink)" : "var(--s-ink-muted)" }} className={strong ? "font-bold" : undefined}>
        {label}
        {hint && (
          <span className="block text-xs" style={{ color: "var(--s-ink-faint)" }}>
            {hint}
          </span>
        )}
      </dt>
      <dd className={`money whitespace-nowrap ${strong ? "text-base font-extrabold" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}

function MiniFigure({ label, value, href, icon }: { label: string; value: string; href: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-xl px-2 py-2 text-center hover:bg-[var(--s-hover)]">
      <p className="money text-lg font-extrabold">{value}</p>
      <p className="flex items-center justify-center gap-1 text-[11px]" style={{ color: "var(--s-ink-faint)" }}>
        {icon}
        {label}
      </p>
    </Link>
  );
}
