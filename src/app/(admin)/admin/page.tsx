import Image from "next/image";
import { getDashboard } from "@/lib/reports";
import { formatGHS } from "@/lib/money";
import { PageHeader, Panel, Chip, Stat } from "@/components/admin/ui";
import { PAYMENT_LABELS } from "@/components/admin/labels";
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
      },
    }),
  ]);
  const availableTables = Math.max(0, tableTotal - occupied);
  const depositTotal = data.depositsToday.momo + data.depositsToday.bank;
  const weekDetail =
    data.revenueDelta === null
      ? "No paid sales this weekday last week"
      : `${data.revenueDelta > 0 ? "+" : ""}${data.revenueDelta}% vs last ${new Date().toLocaleDateString("en-GB", { weekday: "long", timeZone: "Africa/Accra" })}`;

  return (
    <>
      <PageHeader
        title="Today"
        description="Paid takings, the open drawer, and what is still outstanding."
      />

      <div className="mb-4 max-w-xl">
        <InstallPrompt />
      </div>

      {!data.booksReady && (
        <p className="mb-4 text-sm" style={{ color: "var(--s-warn)" }}>
          The till&apos;s books update has not finished, so drawer and deposit figures are hidden until it does.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Paid takings"
          value={formatGHS(data.today.revenue)}
          detail={weekDetail}
          tint="good"
        />
        <Stat
          label="Paid orders"
          value={String(data.today.orders)}
          detail={`Average ${formatGHS(data.today.averageTicket)}`}
        />
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
        <Stat
          label="Unpaid tickets"
          value={String(data.openTickets.count)}
          detail={`${formatGHS(data.openTickets.value)} still to collect`}
          tint="accent"
        />
        <Stat
          label="Tables free"
          value={`${availableTables}/${tableTotal}`}
          detail={`${customers} customers on file`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="How they paid" explainer="Paid sales today, splits broken into each tender" className="p-5">
          {data.paymentMix.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--s-ink-faint)" }}>No paid sales yet today.</p>
          ) : (
            <ul className="space-y-2">
              {data.paymentMix.map((entry) => (
                <li key={entry.method} className="flex justify-between text-sm">
                  <span style={{ color: "var(--s-ink-muted)" }}>{PAYMENT_LABELS[entry.method] ?? entry.method}</span>
                  <span className="money font-medium">{formatGHS(entry.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Not in today's takings" explainer="Shown so they are not mistaken for sales or costs" className="p-5">
          <dl className="space-y-2.5 text-sm">
            <Memo label="Voids" count={data.voids.count} amount={data.voids.amount} />
            <Memo label="Refunds" count={data.refunds.count} amount={data.refunds.amount} />
            <Memo label="Bolt awaiting payout" count={data.boltAwaiting.count} amount={data.boltAwaiting.amount} />
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
                    <span className="money" style={{ color: "var(--s-ink-faint)" }}>{item.quantity}×</span> {item.name}
                  </span>
                  <span className="money font-medium">{formatGHS(item.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Last 14 days" explainer="Paid sales by business day" className="p-5">
          <TrendBars data={data.last14Days} />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Recent Activities" explainer="Latest orders across the store" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead style={{ color: "var(--s-ink-muted)" }}>
                <tr className="border-b" style={{ borderColor: "var(--s-border)" }}>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">Table</th>
                  <th className="px-3 py-3 font-semibold">Price</th>
                  <th className="px-3 py-3 font-semibold">Items code</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => {
                  const first = order.items[0];
                  return (
                    <tr key={order.id} className="border-b last:border-0" style={{ borderColor: "var(--s-border)" }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Image
                            src={menuImage(first?.menuItem?.imageUrl, first?.menuItem?.categoryId, first?.name)}
                            alt=""
                            width={48}
                            height={40}
                            className="h-10 w-12 rounded-xl object-cover"
                          />
                          <div>
                            <p className="max-w-64 truncate font-bold">{first?.name || "Order"}</p>
                            <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>{order.items.length} line(s)</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{order.table?.label || "—"}</td>
                      <td className="money px-3 py-3">{formatGHS(Number(order.total))}</td>
                      <td className="money px-3 py-3">{order.orderNumber.slice(-8)}</td>
                      <td className="px-3 py-3">
                        <Chip tone={order.status === "COMPLETED" ? "good" : order.status === "CANCELLED" ? "bad" : "warn"}>
                          {order.status.toLowerCase().replace("_", " ")}
                        </Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recent.length === 0 && (
              <p className="px-5 py-10 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
                The latest orders will appear here.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
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
