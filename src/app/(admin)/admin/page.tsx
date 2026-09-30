import { Clock, ReceiptText, Table2 } from "lucide-react";
import Image from "next/image";
import { getDashboard } from "@/lib/reports";
import { formatGHS } from "@/lib/money";
import { PageHeader, Panel, Chip } from "@/components/admin/ui";
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
    prisma.diningTable.count({ where: { isActive: true, area: { isActive: true } } }),
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
  const progress = data.today.orders > 0
    ? Math.round(((data.today.orders - data.openTickets.count) / data.today.orders) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Today's Data"
        description="A live view of service, sales, and the dining floor."
      />

      <div className="mb-4 max-w-xl">
        <InstallPrompt />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_2.2fr]">
        <MetricTile icon={<Clock />} tone="yellow" label="Total pending orders" value={data.openTickets.count} />
        <MetricTile icon={<ReceiptText />} tone="green" label="Orders in progress" value={data.today.orders} />
        <MetricTile icon={<Table2 />} tone="orange" label="Available tables" value={`${availableTables}/${tableTotal}`} />
        <Panel className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">Order Management</p>
              <p className="mt-1 text-xs" style={{ color: "var(--s-ink-faint)" }}>Settled today</p>
            </div>
            <p className="money text-3xl font-extrabold">
              {Math.max(0, data.today.orders - data.openTickets.count)}
              <span className="text-base font-medium" style={{ color: "var(--s-ink-faint)" }}>/{data.today.orders}</span>
            </p>
          </div>
          <div className="mt-5 flex justify-between text-[10px] font-bold" style={{ color: "var(--s-ink-faint)" }}>
            <span>{progress}%</span><span>100%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full" style={{ background: "var(--s-panel-alt)" }}>
            <span className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400" style={{ width: `${progress}%` }} />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Most popular dishes" explainer="Top dishes and the last 14 days of sales" className="p-5">
          <TrendBars data={data.last14Days} />
        </Panel>
        <Panel title="Business Data" explainer="Business activities circle" className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <BusinessTile tone="#fb923c" label="Total revenue" value={formatGHS(data.today.revenue)} />
            <BusinessTile tone="#86efac" label="Total orders" value={String(data.today.orders)} />
            <BusinessTile tone="#fca5a5" label="Average order value" value={formatGHS(data.today.averageTicket)} />
            <BusinessTile tone="#fde768" label="Number of customers" value={String(customers)} />
          </div>
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
                            src={menuImage(first?.menuItem?.imageUrl, first?.menuItem?.categoryId)}
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

function MetricTile({ icon, tone, label, value }: { icon: React.ReactNode; tone: "yellow" | "green" | "orange"; label: string; value: React.ReactNode }) {
  const colors = { yellow: "#fef08a", green: "#86efac", orange: "#fdba74" };
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full [&>svg]:h-5 [&>svg]:w-5" style={{ background: colors[tone] }}>{icon}</span>
        <p className="money text-3xl font-extrabold">{value}</p>
      </div>
      <p className="mt-4 text-xs font-medium" style={{ color: "var(--s-ink-muted)" }}>{label}</p>
    </Panel>
  );
}

function BusinessTile({ tone, label, value }: { tone: string; label: string; value: string }) {
  return (
    <div className="min-h-28 rounded-[1.25rem] p-4" style={{ background: tone }}>
      <p className="text-xs font-bold">{label}</p>
      <p className="money mt-4 truncate text-2xl font-extrabold">{value}</p>
    </div>
  );
}
