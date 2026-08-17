import { getMonthlyReport, getReportableMonths } from "@/lib/reports";
import { getSessionsForMonth } from "@/lib/report-sessions";
import { formatGHS } from "@/lib/money";
import { PageHeader, Panel } from "@/components/admin/ui";
import { PAYMENT_LABELS } from "@/components/admin/labels";
import ReportControls from "./ReportControls";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type Search = { month?: string; tab?: string };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const months = await getReportableMonths();
  const month = params.month && months.includes(params.month) ? params.month : months[0];
  const tab = params.tab === "sales" || params.tab === "sessions" ? params.tab : "pl";

  const [report, sessions] = await Promise.all([
    getMonthlyReport(month),
    tab === "sessions" ? getSessionsForMonth(month) : Promise.resolve([]),
  ]);

  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Accra",
  });

  return (
    <>
      <PageHeader
        title="Reports"
        description={monthLabel}
        actions={
          <a
            href={`/api/admin/reports/export?month=${month}&format=xlsx`}
            className="inline-flex items-center rounded-lg border px-3.5 py-2 text-sm font-semibold min-h-11"
            style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border-strong)", color: "var(--s-ink)" }}
          >
            Export
          </a>
        }
      />

      <ReportControls months={months} month={month} tab={tab} />

      {tab === "pl" && <ProfitAndLoss report={report} />}
      {tab === "sales" && <DailySales report={report} />}
      {tab === "sessions" && <Sessions sessions={sessions} />}
    </>
  );
}

function ProfitAndLoss({ report }: { report: Awaited<ReturnType<typeof getMonthlyReport>> }) {
  const lines: { label: string; value: number; strong?: boolean; sign?: "minus" }[] = [
    { label: "Revenue", value: report.revenue, strong: true },
    { label: "Cost of items sold", value: report.cogs, sign: "minus" },
    { label: "Gross profit", value: report.grossProfit, strong: true },
    { label: "Expenses", value: report.expenses, sign: "minus" },
    { label: "Payroll paid", value: report.payroll, sign: "minus" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Profit & loss" className="p-5">
        <dl className="space-y-2.5">
          {lines.map((line) => (
            <div
              key={line.label}
              className="flex justify-between items-baseline"
              style={line.strong ? { fontWeight: 600 } : undefined}
            >
              <dt style={{ color: line.strong ? "var(--s-ink)" : "var(--s-ink-muted)" }}>
                {line.label}
              </dt>
              <dd className="money">
                {line.sign === "minus" && report[keyFor(line.label)] > 0 ? "−" : ""}
                {formatGHS(line.value)}
              </dd>
            </div>
          ))}
          <div
            className="flex justify-between items-baseline pt-3 mt-2 border-t text-lg font-bold"
            style={{ borderColor: "var(--s-border)" }}
          >
            <dt>Net profit</dt>
            <dd
              className="money"
              style={{ color: report.netProfit >= 0 ? "var(--s-good)" : "var(--s-bad)" }}
            >
              {formatGHS(report.netProfit)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs" style={{ color: "var(--s-ink-faint)" }}>
          {report.grossMargin !== null
            ? `Gross margin ${report.grossMargin}%. `
            : ""}
          Cost of items covers {report.cogsCoverage}% of sales — the rest have no cost
          price set yet, so the real cost is at least this, not exactly it.
        </p>
      </Panel>

      <div className="space-y-4">
        <Panel title="How they paid" className="p-5">
          {report.paymentBreakdown.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2">
              {report.paymentBreakdown.map((entry) => (
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

        {report.expensesByCategory.length > 0 && (
          <Panel title="Where the money went" className="p-5">
            <ul className="space-y-2">
              {report.expensesByCategory.map((entry) => (
                <li key={entry.category} className="flex justify-between text-sm">
                  <span style={{ color: "var(--s-ink-muted)" }}>{entry.category}</span>
                  <span className="money font-medium">{formatGHS(entry.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}

function keyFor(label: string): "cogs" | "expenses" | "payroll" | "revenue" {
  if (label === "Cost of items sold") return "cogs";
  if (label === "Expenses") return "expenses";
  if (label === "Payroll paid") return "payroll";
  return "revenue";
}

function DailySales({ report }: { report: Awaited<ReturnType<typeof getMonthlyReport>> }) {
  return (
    <div className="space-y-4">
      <Panel title="Day by day" className="overflow-hidden">
        {report.dailySales.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--s-ink-faint)" }}>
                  <th className="text-left font-medium px-5 py-2.5">Day</th>
                  <th className="text-right font-medium px-5 py-2.5">Orders</th>
                  <th className="text-right font-medium px-5 py-2.5">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {report.dailySales.map((day) => (
                  <tr key={day.day} className="border-t" style={{ borderColor: "var(--s-border)" }}>
                    <td className="px-5 py-2.5">
                      {new Date(`${day.day}T12:00:00Z`).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "Africa/Accra",
                      })}
                    </td>
                    <td className="money text-right px-5 py-2.5">{day.orders}</td>
                    <td className="money text-right px-5 py-2.5 font-medium">
                      {formatGHS(day.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Best sellers this month" className="p-5">
        {report.topItems.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {report.topItems.map((item) => (
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
  );
}

function Sessions({ sessions }: { sessions: Awaited<ReturnType<typeof getSessionsForMonth>> }) {
  return (
    <Panel title="Shift reconciliation" className="overflow-hidden">
      {sessions.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--s-ink-faint)" }}>
                <th className="text-left font-medium px-5 py-2.5">Day</th>
                <th className="text-left font-medium px-5 py-2.5">Cashier</th>
                <th className="text-right font-medium px-5 py-2.5">Expected</th>
                <th className="text-right font-medium px-5 py-2.5">Counted</th>
                <th className="text-right font-medium px-5 py-2.5">Difference</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t" style={{ borderColor: "var(--s-border)" }}>
                  <td className="px-5 py-2.5">
                    {new Date(`${session.businessDay}T12:00:00Z`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "Africa/Accra",
                    })}
                    {session.status === "OPEN" && (
                      <span className="ml-1.5 text-xs" style={{ color: "var(--s-warn)" }}>
                        (open)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5" style={{ color: "var(--s-ink-muted)" }}>
                    {session.openedBy}
                  </td>
                  <td className="money text-right px-5 py-2.5">
                    {session.expectedCash === null ? "—" : formatGHS(session.expectedCash)}
                  </td>
                  <td className="money text-right px-5 py-2.5">
                    {session.closingCash === null ? "—" : formatGHS(session.closingCash)}
                  </td>
                  <td
                    className="text-right px-5 py-2.5 font-medium"
                    style={{
                      color:
                        session.difference === null
                          ? "var(--s-ink-faint)"
                          : session.difference === 0
                            ? "var(--s-good)"
                            : "var(--s-warn)",
                    }}
                  >
                    {session.differenceLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Empty() {
  return (
    <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--s-ink-muted)" }}>
      Nothing here for this month yet.
    </p>
  );
}
