import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ChefHat,
  ChevronRight,
  CircleCheck,
  Clock,
  Coins,
  Percent,
  ReceiptText,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { change } from "@/lib/reports";
import { DASHBOARD_PERIODS, getDashboardView, type DashboardPeriod } from "@/lib/dashboard";
import { formatGHS, toMoney } from "@/lib/money";
import { BUSINESS_TIMEZONE, businessDay, callNumber } from "@/lib/session-utils";
import { formatRange } from "@/lib/period";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { menuImage } from "@/lib/menu-image";
import { Chip, Delta, PageHeader, Panel, PanelLink, Segmented, ShareBar } from "@/components/admin/ui";
import { ComparisonChart, DonutChart, SERIES } from "@/components/admin/charts";
import { BusyHeatmap, MoneyFlow, Sparkline } from "@/components/admin/visuals";
import { ORDER_SOURCE_LABELS, ORDER_STATUS_LABELS, PAYMENT_LABELS } from "@/components/admin/labels";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(now),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

interface Attention {
  key: string;
  tone: "bad" | "warn" | "neutral";
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const period: DashboardPeriod =
    params.view === "week" || params.view === "month" ? params.view : "today";
  const meta = DASHBOARD_PERIODS.find((entry) => entry.value === period)!;
  const now = new Date();

  const [data, user, recent] = await Promise.all([
    getDashboardView(period, now),
    getCurrentUser(),
    prisma.order.findMany({
      where: { isDemo: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        table: { select: { label: true } },
        items: { take: 1, include: { menuItem: { select: { imageUrl: true, categoryId: true } } } },
        _count: { select: { items: true } },
      },
    }),
  ]);
  const { current, previous, costing } = data;
  const shift = data.openShift;
  const todayKey = businessDay(now);
  const firstName = user?.name.split(" ")[0];

  // ---- One plain sentence about the period --------------------------------
  const gap = current.netSales - previous.netSales;
  const leader = current.topItems[0];
  const story =
    current.orderCount === 0
      ? `Nothing sold yet ${period === "today" ? "today" : `this ${period}`}. ${
          previous.netSales > 0 ? `${meta.versus[0].toUpperCase()}${meta.versus.slice(1)} took ${formatGHS(previous.netSales)}.` : ""
        }`
      : `${formatGHS(Math.abs(gap))} ${gap >= 0 ? "ahead of" : "behind"} ${meta.versus}${
          period === "today" ? "'s full day" : " at this point"
        }${leader ? `. ${leader.name} is leading with ${formatGHS(leader.revenue)}.` : "."}`;

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
      detail: `${formatGHS(data.openTickets.value)} waiting to be settled.`,
      href: "/admin/orders?status=open&period=today",
    });
  }
  const diff = data.lastClosedShift?.difference;
  if (data.lastClosedShift && diff !== null && diff !== undefined && diff !== 0) {
    attention.push({
      key: "variance",
      tone: diff < 0 ? "bad" : "warn",
      icon: <Coins />,
      title: `Last shift was ${diff < 0 ? "short" : "over"} by ${formatGHS(Math.abs(diff))}`,
      detail: `${formatRange(data.lastClosedShift.day, data.lastClosedShift.day)}${
        data.lastClosedShift.closedBy ? ` · closed by ${data.lastClosedShift.closedBy}` : ""
      }`,
      href: `/admin/cash-up?day=${data.lastClosedShift.day}`,
    });
  }
  if (costing.costed < costing.dishes) {
    attention.push({
      key: "costing",
      tone: costing.costed === 0 ? "warn" : "neutral",
      icon: <UtensilsCrossed />,
      title: costing.costed === 0 ? "No dish has a cost yet" : `${costing.dishes - costing.costed} dishes still need a cost`,
      detail: "Profit stays unknown until it does.",
      href: "/admin/menu?view=costing",
    });
  }
  if (data.lowStock.length > 0) {
    attention.push({
      key: "stock",
      tone: "warn",
      icon: <Boxes />,
      title: `${data.lowStock.length} stock item${data.lowStock.length === 1 ? "" : "s"} running low`,
      detail: data.lowStock.slice(0, 3).map((item) => item.name).join(", "),
      href: "/admin/inventory",
    });
  }

  const periodQuery = period === "today" ? "period=today" : `period=${period}`;
  const paymentTotal = current.paymentMix.reduce((sum, row) => sum + row.amount, 0);
  const spend = current.expenses.total + current.tillSpends.amount;
  const margin = current.profitKnown ? current.grossMargin : null;

  return (
    <>
      <PageHeader
        eyebrow={formatRange(todayKey, todayKey)}
        title={`${greeting(now)}${firstName ? `, ${firstName}` : ""}`}
        description="How the business is doing, against the period before."
        actions={
          <Segmented
            value={period}
            options={DASHBOARD_PERIODS.map((entry) => ({
              value: entry.value,
              label: entry.label,
              href: entry.value === "today" ? "/admin" : `/admin?view=${entry.value}`,
            }))}
          />
        }
      />

      {!data.current.booksReady && (
        <p className="mb-4 text-sm" style={{ color: "var(--s-warn)" }}>
          The till&apos;s books update has not finished, so drawer and deposit figures are hidden until it does.
        </p>
      )}

      {/* ---- Bento: hero + four signals ----------------------------------- */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <section
          className="s-card relative overflow-hidden p-5 md:col-span-2 xl:row-span-2 sm:p-6"
          style={{
            background:
              "radial-gradient(120% 90% at 100% 0%, var(--s-brand-soft) 0%, transparent 55%), var(--s-panel)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--s-ink-muted)" }}>
                Sales {period === "today" ? "today" : `this ${period}`}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <p className="money text-[2.6rem] font-extrabold leading-none tracking-tight sm:text-5xl">
                  {formatGHS(current.netSales)}
                </p>
                <Delta value={change(current.netSales, previous.netSales)} />
              </div>
            </div>
            <Link
              href={`/admin/reports?tab=sales&${periodQuery}`}
              className="text-sm font-bold hover:underline"
              style={{ color: "var(--s-brand)" }}
            >
              Sales report
            </Link>
          </div>

          <p className="mt-3 max-w-xl text-[0.95rem] font-medium leading-snug">{story}</p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "var(--s-ink-muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--s-brand)" }} />
              {meta.label}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--s-border)" }} />
              {meta.versus[0].toUpperCase() + meta.versus.slice(1)} · <span className="money">{formatGHS(previous.netSales)}</span>
            </span>
            {data.sameDayLastWeek !== null && (
              <span>
                Last {now.toLocaleDateString("en-GB", { weekday: "long", timeZone: BUSINESS_TIMEZONE })} ·{" "}
                <span className="money">{formatGHS(data.sameDayLastWeek)}</span>
              </span>
            )}
          </div>

          <div className="-mx-2 mt-2">
            <ComparisonChart
              data={data.series}
              height={240}
              currentLabel={meta.label}
              previousLabel={meta.versus[0].toUpperCase() + meta.versus.slice(1)}
            />
          </div>
        </section>

        <Signal
          label="Paid orders"
          value={String(current.orderCount)}
          delta={change(current.orderCount, previous.orderCount)}
          detail={`${previous.orderCount} ${meta.versus}`}
          icon={<ReceiptText className="h-4 w-4" />}
          tint="var(--s-accent)"
          spark={data.daily14.map((day) => day.orders)}
          href={`/admin/orders?${periodQuery}`}
        />
        <Signal
          label="Average bill"
          value={formatGHS(current.averageTicket)}
          delta={change(current.averageTicket, previous.averageTicket)}
          detail={`${formatGHS(previous.averageTicket)} ${meta.versus}`}
          icon={<Tag className="h-4 w-4" />}
          tint="#7C3AED"
          spark={data.daily14.map((day) => day.average)}
          href={`/admin/reports?tab=sales&${periodQuery}`}
        />
        <Signal
          label="Gross margin"
          value={margin === null ? "—" : `${Math.round(margin)}%`}
          detail={
            current.profitKnown
              ? current.cogsCoverage < 100
                ? `Only ${Math.round(current.cogsCoverage)}% of sales costed`
                : `${formatGHS(current.grossProfit)} after food cost`
              : "Cost your dishes to see this"
          }
          icon={<Percent className="h-4 w-4" />}
          tint="var(--s-good)"
          meter={costing.dishes > 0 ? costing.costed / costing.dishes : 0}
          meterLabel={`${costing.costed}/${costing.dishes} dishes costed`}
          href={current.profitKnown ? `/admin/reports?tab=pl&${periodQuery}` : "/admin/menu?view=costing"}
        />
        <Signal
          label="Cash in the drawer"
          value={shift && !shift.isStale ? formatGHS(shift.expectedCash) : "—"}
          detail={
            shift && !shift.isStale
              ? `Should be there · ${shift.openedBy}'s shift`
              : "No shift open"
          }
          icon={<Coins className="h-4 w-4" />}
          tint="var(--s-ink-muted)"
          footer={
            shift && !shift.isStale && shift.expectedMomo !== null
              ? `MoMo should be ${formatGHS(shift.expectedMomo)}`
              : undefined
          }
          href="/admin/cash-up?period=today"
        />
      </div>

      {/* ---- Where the money went + attention ---------------------------- */}
      <div className="mt-3 grid gap-3 xl:grid-cols-4">
        <Panel
          className="xl:col-span-2"
          title="Where the money went"
          explainer={`Every cedi of ${period === "today" ? "today's" : `this ${period}'s`} sales, split by where it went.`}
          action={<PanelLink href={`/admin/reports?tab=pl&${periodQuery}`}>Profit &amp; loss</PanelLink>}
          padded
        >
          <MoneyFlow
            sales={current.netSales}
            food={current.cogs}
            foodKnown={current.profitKnown}
            staff={current.payroll}
            expenses={spend}
          />
          {current.profitKnown && current.netSales > 0 && (
            <PrimeCost sales={current.netSales} food={current.cogs} staff={current.payroll} />
          )}
          {!current.profitKnown && current.netSales > 0 && (
            <p className="mt-4 rounded-2xl px-3 py-2 text-xs" style={{ background: "var(--s-warn-soft)", color: "var(--s-warn)" }}>
              Food cost is unknown until dishes are costed, so &ldquo;left&rdquo; is not profit yet.
            </p>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Needs attention"
          action={attention.length > 0 ? <Chip tone="warn">{attention.length}</Chip> : undefined}
        >
          {attention.length === 0 ? (
            <div className="flex flex-col items-center px-5 pb-8 pt-2 text-center">
              <span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "var(--s-good-soft)", color: "var(--s-good)" }}>
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
                  <Link href={item.href} className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-[var(--s-hover)]">
                    <span
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4"
                      style={{
                        background: item.tone === "bad" ? "var(--s-bad-soft)" : item.tone === "warn" ? "var(--s-warn-soft)" : "var(--s-sunk)",
                        color: item.tone === "bad" ? "var(--s-bad)" : item.tone === "warn" ? "var(--s-warn)" : "var(--s-ink-muted)",
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
          <div
            className="mx-4 mb-4 grid grid-cols-3 gap-2 border-t pt-3 text-center sm:mx-5"
            style={{ borderColor: "var(--s-border)" }}
          >
            <MiniFigure label="Unpaid tickets" value={String(data.openTickets.count)} href="/admin/orders?status=open&period=today" />
            <MiniFigure label="In the kitchen" value={String(data.kitchenQueue)} href="/pos/kitchen" icon={<ChefHat className="h-3.5 w-3.5" />} />
            <MiniFigure label="Spent" value={formatGHS(spend)} href={`/admin/expenses?${periodQuery}`} />
          </div>
        </Panel>
      </div>

      {/* ---- When, what, how --------------------------------------------- */}
      <div className="mt-3 grid gap-3 xl:grid-cols-4">
        <Panel className="xl:col-span-2" title="Busy hours" explainer="Last four weeks of sales by day and hour. Darker is busier." padded>
          <BusyHeatmap cells={data.heatmap} />
        </Panel>

        <Panel title="Best sellers" action={<PanelLink href={`/admin/reports?tab=sales&${periodQuery}`}>All items</PanelLink>}>
          {current.topItems.length === 0 ? (
            <p className="px-5 pb-5 text-sm" style={{ color: "var(--s-ink-faint)" }}>
              Dishes appear here once they sell.
            </p>
          ) : (
            <div className="space-y-3 px-4 pb-5 sm:px-5">
              {current.topItems.slice(0, 5).map((item) => (
                <ShareBar
                  key={item.name}
                  label={item.name}
                  sub={`× ${item.quantity}`}
                  value={formatGHS(item.revenue)}
                  share={item.revenue / (current.topItems[0]?.revenue || 1)}
                  tone="accent"
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="How they paid">
          <div className="flex flex-col items-center gap-4 px-4 pb-5 sm:px-5">
            <DonutChart
              size={128}
              data={current.paymentMix.map((row) => ({ label: PAYMENT_LABELS[row.method] ?? row.method, value: row.amount }))}
              centerLabel="Taken"
              centerValue={formatGHS(paymentTotal)}
            />
            {current.paymentMix.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--s-ink-faint)" }}>
                No paid sales yet.
              </p>
            ) : (
              <ul className="w-full space-y-1.5 text-sm">
                {current.paymentMix.map((row, index) => (
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
      </div>

      {/* ---- Costing + recent orders -------------------------------------- */}
      <div className="mt-3 grid gap-3 xl:grid-cols-4">
        <Panel
          className="xl:col-span-2"
          title="Dish costing"
          explainer="Profit needs to know what each dish costs to make. Start with the ones that sell most."
          action={<PanelLink href="/admin/menu?view=costing">Cost dishes</PanelLink>}
          padded
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="money text-2xl font-extrabold">
              {costing.costed}
              <span className="text-base font-semibold" style={{ color: "var(--s-ink-faint)" }}>
                {" "}/ {costing.dishes} dishes
              </span>
            </p>
            <Chip tone={costing.salesCovered >= 90 ? "good" : costing.salesCovered > 0 ? "warn" : "bad"}>
              {costing.salesCovered}% of sales costed
            </Chip>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--s-sunk)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, costing.salesCovered)}%`, background: "var(--s-good)" }}
            />
          </div>
          {costing.priorities.length > 0 && (
            <>
              <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--s-ink-faint)" }}>
                Cost these first · last 30 days
              </p>
              <ol className="space-y-2">
                {costing.priorities.map((dish, index) => (
                  <li key={dish.id} className="flex items-center gap-3 text-sm">
                    <span className="money grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--s-sunk)" }}>
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{dish.name}</span>
                    <span className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      {Math.round(dish.share * 100)}% of sales
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>

        <Panel
          className="overflow-hidden xl:col-span-2"
          title="Recent orders"
          action={<PanelLink href="/admin/orders?period=today">All orders</PanelLink>}
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
                const when = new Date(order.createdAt).toLocaleString("en-GB", {
                  timeZone: BUSINESS_TIMEZONE,
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const place =
                  order.table?.label ||
                  (order.source === "ONLINE" ? ORDER_SOURCE_LABELS.ONLINE : order.source === "WALK_IN" ? ORDER_SOURCE_LABELS.WALK_IN : "Counter");
                return (
                  <li key={order.id} style={{ borderColor: "var(--s-border)" }}>
                    <Link href="/admin/orders?period=today" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--s-hover)]">
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
                        <div className="mt-1 flex justify-end">
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
      </div>
    </>
  );
}

/**
 * Food plus staff as a share of sales: the number restaurant owners watch most.
 * Under about 60–65% leaves room for rent, bills and profit.
 */
function PrimeCost({ sales, food, staff }: { sales: number; food: number; staff: number }) {
  const share = ((food + staff) / sales) * 100;
  const tone = share <= 60 ? "var(--s-good)" : share <= 65 ? "var(--s-warn)" : "var(--s-bad)";
  return (
    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl px-3 py-2.5" style={{ background: "var(--s-sunk)" }}>
      <span className="text-sm font-bold">
        Prime cost <span className="font-medium" style={{ color: "var(--s-ink-muted)" }}>(food + staff)</span>
      </span>
      <span className="text-sm">
        <span className="money font-extrabold" style={{ color: tone }}>
          {Math.round(share)}%
        </span>{" "}
        <span style={{ color: "var(--s-ink-faint)" }}>of sales · aim for under 60–65%</span>
      </span>
    </div>
  );
}

/** A compact KPI card: number, change, and a sparkline or meter for context. */
function Signal({
  label,
  value,
  delta,
  detail,
  icon,
  tint,
  spark,
  meter,
  meterLabel,
  footer,
  href,
}: {
  label: string;
  value: string;
  delta?: number | null;
  detail: string;
  icon: React.ReactNode;
  tint: string;
  spark?: number[];
  meter?: number;
  meterLabel?: string;
  footer?: string;
  href: string;
}) {
  return (
    <Link href={href} className="s-card flex flex-col p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--s-ink-muted)" }}>
          {label}
        </p>
        <span
          className="grid h-8 w-8 place-items-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${tint} 14%, var(--s-panel))`, color: tint }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <p className="money text-[1.7rem] font-extrabold leading-tight tracking-tight">{value}</p>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--s-ink-faint)" }}>
        {detail}
      </p>
      <div className="mt-auto pt-3">
        {spark && <Sparkline values={spark} color={tint} />}
        {meter !== undefined && (
          <div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--s-sunk)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, meter * 100)}%`, background: tint }} />
            </div>
            {meterLabel && (
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--s-ink-faint)" }}>
                {meterLabel}
              </p>
            )}
          </div>
        )}
        {footer && (
          <p className="text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
            {footer}
          </p>
        )}
      </div>
    </Link>
  );
}

function MiniFigure({ label, value, href, icon }: { label: string; value: string; href: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-xl px-2 py-2 hover:bg-[var(--s-hover)]">
      <p className="money text-lg font-extrabold">{value}</p>
      <p className="flex items-center justify-center gap-1 text-[11px]" style={{ color: "var(--s-ink-faint)" }}>
        {icon}
        {label}
      </p>
    </Link>
  );
}
