import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Clock, ReceiptText, Wallet } from "lucide-react";
import { getDashboard } from "@/lib/reports";
import { currentSession } from "@/lib/pos-session";
import { formatGHS } from "@/lib/money";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import TrendBars from "@/components/admin/TrendBars";
import { PAYMENT_LABELS } from "@/components/admin/labels";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [data, shift] = await Promise.all([getDashboard(), currentSession()]);

  return (
    <>
      <PageHeader
        title="Today"
        description="How the day is going, next to the same weekday last week."
      />

      <div className="mb-4">
        <InstallPrompt />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenue today"
          value={formatGHS(data.today.revenue)}
          icon={<Wallet className="w-4 h-4" />}
          detail={
            data.revenueDelta !== null ? (
              <span
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: data.revenueDelta >= 0 ? "var(--s-good)" : "var(--s-bad)" }}
              >
                {data.revenueDelta >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {Math.abs(data.revenueDelta)}% vs same day last week
              </span>
            ) : (
              "No sales this day last week to compare"
            )
          }
        />
        <Stat
          label="Orders today"
          value={data.today.orders}
          icon={<ReceiptText className="w-4 h-4" />}
          detail={`${formatGHS(data.today.averageTicket)} average`}
        />
        <Stat
          label="Open tickets"
          value={data.openTickets.count}
          icon={<Clock className="w-4 h-4" />}
          detail={
            data.openTickets.count > 0
              ? `${formatGHS(data.openTickets.value)} unpaid${
                  data.openTickets.oldestMinutes !== null
                    ? ` · oldest ${data.openTickets.oldestMinutes}m`
                    : ""
                }`
              : "All settled"
          }
        />
        <Stat
          label="Till"
          value={shift ? formatGHS(shift.expectedCash) : "Closed"}
          icon={<Wallet className="w-4 h-4" />}
          detail={shift ? `Expected cash · ${shift.openedBy.name}` : "No shift open right now"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Last 14 days" className="lg:col-span-2 p-5">
          <TrendBars data={data.last14Days} />
        </Panel>

        <Panel title="How they paid today" className="p-5">
          {data.paymentMix.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
              No sales yet today.
            </p>
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
      </div>

      <div className="mt-4">
        <Panel title="Best sellers today" className="p-5">
          {data.topItems.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
              Nothing sold yet today.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.topItems.map((item) => (
                <li key={item.name} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate">
                    <span className="money" style={{ color: "var(--s-ink-faint)" }}>
                      {item.quantity}×
                    </span>{" "}
                    {item.name}
                  </span>
                  <span className="money font-medium whitespace-nowrap">
                    {formatGHS(item.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {(data.openTickets.count > 0 || !shift) && (
        <p className="mt-6 text-sm" style={{ color: "var(--s-ink-faint)" }}>
          <Clock className="inline w-3.5 h-3.5 mr-1" />
          Full month figures and shift history live under{" "}
          <Link href="/admin/reports" style={{ color: "var(--s-brand)" }}>
            Reports
          </Link>
          .
        </p>
      )}
    </>
  );
}
