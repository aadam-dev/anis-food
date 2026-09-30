import Image from "next/image";
import Link from "next/link";
import { Clock, ReceiptText, Table2, TrendingUp, CalendarDays, CalendarRange, Wallet } from "lucide-react";
import { getDashboard } from "@/lib/reports";
import { formatGHS, roundMoney, toMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { PageHeader, Panel, Chip, Stat } from "@/components/admin/ui";
import { ORDER_SOURCE_LABELS, ORDER_STATUS_LABELS, PAYMENT_LABELS } from "@/components/admin/labels";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import TrendBars from "@/components/admin/TrendBars";
import { prisma } from "@/lib/db";
import { menuImage } from "@/lib/menu-image";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [data, customers, tableTotal, occupied, recent] = await Promise.all([
    getDashboard(),
    prisma.customer.count(),
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

  const availableTables = Math.max(0, tableTotal - occupied);
  const depositTotal = data.depositsToday.momo + data.depositsToday.bank;
  const leftAfterCosts = roundMoney(data.today.revenue - data.expensesToday);
  const weekdayName = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "Africa/Accra",
  });
  const todayDetail =
    data.revenueDelta === null
      ? "No paid sales this weekday last week"
      : `${data.revenueDelta > 0 ? "+" : ""}${data.revenueDelta}% vs last ${weekdayName}`;
  const settledToday = data.today.orders;
  const openWork = data.openTickets.count;
  const settledDenom = settledToday + openWork;
  const settledPct = settledDenom > 0 ? Math.round((settledToday / settledDenom) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Today's books"
        description="What came in, what it cost, and what is only a transfer. Deposits into MoMo or the bank are not expenses."
      />

      <div className="mb-4 max-w-xl">
        <InstallPrompt />
      </div>

      {!data.booksReady && (
        <p className="mb-4 text-sm" style={{ color: "var(--s-warn)" }}>
          The till&apos;s books update has not finished, so drawer and deposit figures are hidden until it does.
        </p>
      )}

      {/* Row A — revenue strip */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue today"
          value={formatGHS(data.today.revenue)}
          detail={todayDetail}
          tint="good"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <Stat
          label="Left after costs"
          value={formatGHS(leftAfterCosts)}
          detail={`Expenses ${formatGHS(data.expensesToday)}. Deposits are not subtracted.`}
          tint={leftAfterCosts >= 0 ? "brand" : "warn"}
          icon={<Wallet className="h-5 w-5" />}
        />
        <Stat
          label="This week"
          value={formatGHS(data.weekToDate.revenue)}
          detail={deltaLabel(data.weekToDate.delta, "prior week")}
          tint="brand"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <Stat
          label="This month"
          value={formatGHS(data.monthToDate.revenue)}
          detail={deltaLabel(data.monthToDate.delta, "prior month")}
          tint="accent"
          icon={<CalendarRange className="h-5 w-5" />}
        />
      </div>

      {/* Row B — operations, reference asymmetric */}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_2.2fr]">
        <MetricTile
          icon={<Clock className="h-5 w-5" />}
          tone="yellow"
          label="Unpaid tickets"
          value={data.openTickets.count}
          detail={formatGHS(data.openTickets.value)}
        />
        <MetricTile
          icon={<ReceiptText className="h-5 w-5" />}
          tone="green"
          label="Paid orders today"
          value={data.today.orders}
          detail={`Avg ${formatGHS(data.today.averageTicket)}`}
        />
        <MetricTile
          icon={<Table2 className="h-5 w-5" />}
          tone="orange"
          label="Tables free"
          value={`${availableTables}/${tableTotal}`}
          detail={`${customers} customers on file`}
        />
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">Settled today</p>
              <p className="mt-1 text-xs" style={{ color: "var(--s-ink-faint)" }}>
                Paid orders against unpaid tickets still open
              </p>
            </div>
            <p className="money text-3xl font-extrabold">
              {settledToday}
              <span className="text-base font-medium" style={{ color: "var(--s-ink-faint)" }}>
                /{settledDenom}
              </span>
            </p>
          </div>
          <div className="mt-5 flex justify-between text-[10px] font-bold" style={{ color: "var(--s-ink-faint)" }}>
            <span>{settledPct}%</span>
            <span>100%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full" style={{ background: "var(--s-panel-alt)" }}>
            <span
              className="block h-full rounded-full"
              style={{
                width: `${settledPct}%`,
                background: "linear-gradient(90deg, color-mix(in srgb, var(--s-warn) 70%, white), var(--s-brand))",
              }}
            />
          </div>
        </Panel>
      </div>

      {/* Row C — books + mix */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Drawer should hold"
          value={data.openShift ? formatGHS(data.openShift.expectedCash) : "—"}
          detail={data.openShift ? `Opened by ${data.openShift.openedBy}` : "No shift open"}
          tint="brand"
        />
        <Stat
          label="MoMo should be"
          value={
            !data.openShift || data.openShift.expectedMomo === null
              ? "—"
              : formatGHS(data.openShift.expectedMomo)
          }
          detail={
            !data.openShift
              ? "No shift open"
              : data.openShift.expectedMomo === null
                ? "Opening MoMo was not recorded"
                : "Includes cash deposited into MoMo"
          }
        />
        <Stat
          label="Expenses today"
          value={formatGHS(data.expensesToday)}
          detail="Real costs only"
          tint="warn"
        />
        <Stat
          label="Deposits today"
          value={formatGHS(depositTotal)}
          detail={`MoMo ${formatGHS(data.depositsToday.momo)} · Bank ${formatGHS(data.depositsToday.bank)}. Not a cost.`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Last 14 days" explainer="Paid sales by business day" className="p-5">
          <TrendBars data={data.last14Days} />
        </Panel>
        <div className="space-y-4">
          <Panel title="How they paid" explainer="Paid sales today" className="p-5">
            {data.paymentMix.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--s-ink-faint)" }}>No paid sales yet today.</p>
            ) : (
              <ul className="space-y-2">
                {data.paymentMix.map((entry) => (
                  <li key={entry.method} className="flex justify-between text-sm">
                    <span style={{ color: "var(--s-ink-muted)" }}>
                      {PAYMENT_LABELS[entry.method] ?? entry.method}
                    </span>
                    <span className="money font-medium">{formatGHS(entry.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Not in today's takings" className="p-5">
            <dl className="space-y-2.5 text-sm">
              <Memo label="Voids" count={data.voids.count} amount={data.voids.amount} />
              <Memo label="Refunds" count={data.refunds.count} amount={data.refunds.amount} />
              <Memo
                label="Bolt awaiting payout"
                count={data.boltAwaiting.count}
                amount={data.boltAwaiting.amount}
              />
            </dl>
          </Panel>
          <Panel title="Best sellers today" className="p-5">
            {data.topItems.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--s-ink-faint)" }}>Dishes appear here once they sell.</p>
            ) : (
              <ul className="space-y-2">
                {data.topItems.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="money" style={{ color: "var(--s-ink-faint)" }}>
                        {item.quantity}×
                      </span>{" "}
                      {item.name}
                    </span>
                    <span className="money font-medium">{formatGHS(item.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Row D — recent orders */}
      <div className="mt-4">
        <Panel title="Recent orders" explainer="Latest tickets across the store" className="overflow-hidden">
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
                  <li key={order.id}>
                    <Link
                      href="/admin/orders"
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
                          {more > 0 ? ` · +${more} more` : order._count.items === 1 ? " · 1 line" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="money font-semibold">{formatGHS(toMoney(order.total))}</p>
                        <div className="mt-1 flex justify-end gap-1">
                          {order.paymentStatus === "PENDING" && order.status !== "CANCELLED" ? (
                            <Chip tone="warn">Unpaid</Chip>
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
      </div>
    </>
  );
}

function deltaLabel(delta: number | null, prior: string) {
  if (delta === null) return `No paid sales in the ${prior}`;
  return `${delta > 0 ? "+" : ""}${delta}% vs ${prior}`;
}

function Memo({ label, count, amount }: { label: string; count: number; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: "var(--s-ink-muted)" }}>
        {label}
        <span className="money"> · {count}</span>
      </dt>
      <dd className="money font-medium">{formatGHS(amount)}</dd>
    </div>
  );
}

function MetricTile({
  icon,
  tone,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  tone: "yellow" | "green" | "orange";
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  const colors = {
    yellow: "color-mix(in srgb, var(--s-warn) 35%, white)",
    green: "color-mix(in srgb, var(--s-good) 28%, white)",
    orange: "color-mix(in srgb, var(--s-brand) 22%, white)",
  };
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 place-items-center rounded-full [&>svg]:h-5 [&>svg]:w-5"
          style={{ background: colors[tone], color: "var(--s-ink)" }}
        >
          {icon}
        </span>
        <p className="money text-3xl font-extrabold">{value}</p>
      </div>
      <p className="mt-4 text-xs font-medium" style={{ color: "var(--s-ink-muted)" }}>
        {label}
      </p>
      {detail && (
        <p className="mt-1 text-xs" style={{ color: "var(--s-ink-faint)" }}>
          {detail}
        </p>
      )}
    </Panel>
  );
}
