import { Ban, Download, Percent, ReceiptText, Scale, Tag, TrendingUp, Undo2, Wallet } from "lucide-react";
import { getLedgerWithComparison, getVatReturn, change, type Ledger, type VatReturn } from "@/lib/reports";
import { getSettings, getTaxConfig } from "@/lib/settings";
import { formatGHS } from "@/lib/money";
import { formatRange, periodQuery, previousPeriod, resolvePeriod, type Period } from "@/lib/period";
import {
  Chip,
  EmptyState,
  PageHeader,
  Panel,
  Segmented,
  ShareBar,
  Stat,
  StatementRow,
  Table,
  Term,
} from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import { ColumnChart, TrendChart } from "@/components/admin/charts";
import { PAYMENT_LABELS, VOID_REASON_LABELS } from "@/components/admin/labels";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "pl", label: "Profit & loss" },
  { value: "sales", label: "Sales" },
  { value: "adjustments", label: "Refunds & discounts" },
  { value: "vat", label: "VAT" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = resolvePeriod(params, "month");
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  const [{ current, previous }, settings] = await Promise.all([
    getLedgerWithComparison(period.from, period.to),
    getSettings(),
  ]);

  // VAT stays out of sight until Anis has to charge it. The maths does not
  // depend on this: net sales is takings minus whatever tax was actually on
  // each receipt, so switching tax on in Settings flows through every figure.
  // Tax lines also show if a period genuinely carried tax, so nothing hides.
  const showTax = getTaxConfig(settings).enabled || current.tax > 0 || previous.tax > 0;
  const tabs = TABS.filter((entry) => entry.value !== "vat" || showTax);
  const tab: Tab = tabs.some((entry) => entry.value === tabParam) ? (tabParam as Tab) : "pl";
  const vat = tab === "vat" ? await getVatReturn(period.from, period.to) : null;

  const query = periodQuery(period);
  const prior = previousPeriod(period);

  return (
    <div data-print-page>
      <PageHeader
        eyebrow={`Money · ${period.label}`}
        title="Reports"
        description={`${settings.business_name} · ${formatRange(period.from, period.to)}, compared with ${formatRange(prior.from, prior.to)}.`}
        actions={
          <div data-report-chrome className="flex items-center gap-2">
            <a
              href={`/api/admin/reports/export?${query}&format=xlsx`}
              className="s-card inline-flex min-h-12 items-center gap-2 px-4 text-sm font-bold"
            >
              <Download className="h-4 w-4" /> Excel
            </a>
            <a
              href={`/api/admin/reports/export?${query}&format=csv`}
              className="inline-flex min-h-12 items-center px-3 text-sm font-bold"
              style={{ color: "var(--s-ink-muted)" }}
            >
              CSV
            </a>
          </div>
        }
      />

      <div data-report-chrome className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Segmented
          value={tab}
          options={tabs.map((entry) => ({
            value: entry.value,
            label: entry.label,
            href: `/admin/reports?tab=${entry.value}&${query}`,
          }))}
        />
        <PeriodPicker period={period} presets={["today", "week", "last-week", "month", "last-month"]} />
      </div>

      {!current.booksReady && (
        <p className="mb-4 text-sm" style={{ color: "var(--s-warn)" }}>
          The till&apos;s books update has not finished, so deposits and unfiled till spends are not counted yet.
        </p>
      )}

      {tab === "pl" && <ProfitAndLoss ledger={current} previous={previous} showTax={showTax} />}
      {tab === "sales" && <Sales ledger={current} previous={previous} period={period} showTax={showTax} />}
      {tab === "adjustments" && <Adjustments ledger={current} previous={previous} query={query} />}
      {tab === "vat" && vat && <VatTab vat={vat} ledger={current} />}
    </div>
  );
}

const money = (value: number) => formatGHS(value);
const minus = (value: number) => (value === 0 ? formatGHS(0) : `(${formatGHS(value)})`);

// ---------------------------------------------------------------------------
// Profit & loss
// ---------------------------------------------------------------------------

function ProfitAndLoss({ ledger, previous, showTax }: { ledger: Ledger; previous: Ledger; showTax: boolean }) {
  const prevExpense = new Map(previous.expenses.byCategory.map((row) => [row.category, row.amount]));
  const hasOverheads =
    ledger.expenses.byCategory.length > 0 || ledger.tillSpends.amount > 0 || ledger.payroll > 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label={showTax ? "Net sales" : "Sales"}
          value={money(ledger.netSales)}
          icon={<TrendingUp />}
          tint="good"
          delta={change(ledger.netSales, previous.netSales)}
          detail={`${ledger.orderCount} paid orders`}
        />
        <Stat
          label="Gross margin"
          value={ledger.grossMargin === null || ledger.cogsCoverage === 0 ? "—" : `${Math.round(ledger.grossMargin)}%`}
          icon={<Percent />}
          tint="accent"
          detail={
            ledger.netSales > 0 && ledger.cogsCoverage === 0
              ? "Add cost prices in Menu to see this"
              : `${money(ledger.grossProfit)} after ingredients`
          }
        />
        <Stat
          label="Overheads"
          value={money(ledger.overheads)}
          icon={<Wallet />}
          tint="warn"
          delta={change(ledger.overheads, previous.overheads)}
          invertDelta
          detail="Expenses and payroll"
        />
        <Stat
          label="Net profit"
          value={money(ledger.netProfit)}
          icon={<Scale />}
          tint={ledger.netProfit < 0 ? "bad" : "brand"}
          detail={ledger.netMargin === null ? "No sales yet" : `${Math.round(ledger.netMargin)}% of net sales`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Profit & loss" explainer="Tap the (i) beside a line for what it means.">
          <div
            className="flex justify-end gap-4 border-y px-4 py-2 text-[0.68rem] font-bold uppercase tracking-wider sm:px-5"
            style={{ borderColor: "var(--s-border)", color: "var(--s-ink-faint)", background: "var(--s-panel-alt)" }}
          >
            <span className="hidden w-28 text-right sm:inline">Previous</span>
            <span className="w-28 text-right">This period</span>
          </div>

          {showTax ? (
            <>
              <StatementRow label={<Term name="takings">Takings</Term>} value={money(ledger.takings)} compare={money(previous.takings)} />
              <StatementRow
                indent
                label={<Term name="tax">Less VAT &amp; levies</Term>}
                value={minus(ledger.tax)}
                compare={minus(previous.tax)}
              />
              <StatementRow
                strong
                border
                label={<Term name="netSales">Net sales</Term>}
                value={money(ledger.netSales)}
                compare={money(previous.netSales)}
              />
            </>
          ) : (
            <StatementRow strong label={<Term name="sales">Sales</Term>} value={money(ledger.netSales)} compare={money(previous.netSales)} />
          )}
          <StatementRow
            indent
            label={
              <Term name="cogs">
                Cost of items sold
                {ledger.netSales > 0 && ledger.cogsCoverage < 100 && (
                  <span className="ml-1.5">
                    <Chip tone="warn">{Math.round(ledger.cogsCoverage)}% costed</Chip>
                  </span>
                )}
              </Term>
            }
            value={minus(ledger.cogs)}
            compare={minus(previous.cogs)}
          />
          <StatementRow
            strong
            border
            label={<Term name="grossProfit">Gross profit</Term>}
            value={money(ledger.grossProfit)}
            compare={money(previous.grossProfit)}
          />

          <p
            className="border-t px-4 pt-3 pb-1 text-[0.68rem] font-bold uppercase tracking-wider sm:px-5"
            style={{ borderColor: "var(--s-border)", color: "var(--s-ink-faint)" }}
          >
            Overheads
          </p>
          {ledger.expenses.byCategory.map((row) => (
            <StatementRow
              key={row.category}
              indent
              label={
                <>
                  {row.category}
                  {row.isFixed && (
                    <span className="ml-1.5 text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      fixed
                    </span>
                  )}
                </>
              }
              value={minus(row.amount)}
              compare={minus(prevExpense.get(row.category) ?? 0)}
            />
          ))}
          {(ledger.tillSpends.amount > 0 || previous.tillSpends.amount > 0) && (
            <StatementRow
              indent
              label={<Term name="tillSpends">Till spends with no category</Term>}
              value={minus(ledger.tillSpends.amount)}
              compare={minus(previous.tillSpends.amount)}
              tone={ledger.tillSpends.amount > 0 ? "warn" : undefined}
            />
          )}
          <StatementRow
            indent
            label={<Term name="payroll">Payroll paid</Term>}
            value={minus(ledger.payroll)}
            compare={minus(previous.payroll)}
          />
          {!hasOverheads && (
            <p className="px-4 pb-2 pl-8 text-sm sm:px-5 sm:pl-9" style={{ color: "var(--s-ink-faint)" }}>
              No expenses or payroll paid in this period.
            </p>
          )}
          <StatementRow border label="Total overheads" value={minus(ledger.overheads)} compare={minus(previous.overheads)} />

          <div className="border-t-2" style={{ borderColor: "var(--s-border-strong)" }}>
            <StatementRow
              strong
              label={<Term name="netProfit">Net profit</Term>}
              value={money(ledger.netProfit)}
              compare={money(previous.netProfit)}
              tone={ledger.netProfit < 0 ? "bad" : "good"}
            />
          </div>
          <p className="border-t px-4 py-3 text-xs sm:px-5" style={{ borderColor: "var(--s-border)", color: "var(--s-ink-faint)" }}>
            Payroll counts on the day it was paid. Voids, refunds and discounts are already out of takings, so they are
            not deducted again.
          </p>
        </Panel>

        <div className="space-y-4">
          <Panel title="Outside the profit figure" explainer="Money that moved but is not sales or cost">
            <dl className="space-y-2.5 px-4 pb-5 text-sm sm:px-5">
              <Memo label={<Term name="voids">Voids</Term>} count={ledger.voids.count} amount={ledger.voids.amount} />
              <Memo label={<Term name="refunds">Refunds</Term>} count={ledger.refunds.count} amount={ledger.refunds.amount} />
              <Memo label={<Term name="discounts">Discounts</Term>} count={ledger.discountedOrders} amount={ledger.discounts} />
              <Memo label={<Term name="deposits">Deposited to MoMo</Term>} amount={ledger.deposits.momo} />
              <Memo label="Deposited to bank" amount={ledger.deposits.bank} />
              <Memo label="Bolt awaiting payout" count={ledger.boltAwaiting.count} amount={ledger.boltAwaiting.amount} />
            </dl>
          </Panel>

          <Panel title="Where the money went" explainer="Expenses by category">
            {ledger.expenses.byCategory.length === 0 ? (
              <p className="px-5 pb-5 text-sm" style={{ color: "var(--s-ink-faint)" }}>
                No expenses in this period.
              </p>
            ) : (
              <div className="space-y-3 px-4 pb-4 sm:px-5">
                {ledger.expenses.byCategory.map((row) => (
                  <ShareBar
                    key={row.category}
                    label={row.category}
                    value={formatGHS(row.amount)}
                    share={row.amount / (ledger.expenses.total || 1)}
                    tone={row.isFixed ? "neutral" : "accent"}
                  />
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 border-t text-sm" style={{ borderColor: "var(--s-border)" }}>
              <div className="px-4 py-3 sm:px-5">
                <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>Fixed</p>
                <p className="money font-bold">{formatGHS(ledger.expenses.fixed)}</p>
              </div>
              <div className="border-l px-4 py-3 sm:px-5" style={{ borderColor: "var(--s-border)" }}>
                <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>Variable</p>
                <p className="money font-bold">{formatGHS(ledger.expenses.variable)}</p>
              </div>
            </div>
          </Panel>

          <PaymentMix ledger={ledger} />
        </div>
      </div>
    </>
  );
}

function Memo({ label, count, amount }: { label: React.ReactNode; count?: number; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: "var(--s-ink-muted)" }}>
        {label}
        {count !== undefined && <span className="money text-xs"> · {count}</span>}
      </dt>
      <dd className="money font-semibold">{formatGHS(amount)}</dd>
    </div>
  );
}

function PaymentMix({ ledger }: { ledger: Ledger }) {
  const total = ledger.paymentMix.reduce((sum, row) => sum + row.amount, 0);
  return (
    <Panel title="How they paid" explainer={<Term name="paymentMethod">Takings by payment method</Term>}>
      {ledger.paymentMix.length === 0 ? (
        <p className="px-5 pb-5 text-sm" style={{ color: "var(--s-ink-faint)" }}>
          No paid sales in this period.
        </p>
      ) : (
        <div className="space-y-3 px-4 pb-5 sm:px-5">
          {ledger.paymentMix.map((row) => (
            <ShareBar
              key={row.method}
              label={PAYMENT_LABELS[row.method] ?? row.method}
              sub={`${Math.round((row.amount / (total || 1)) * 100)}%`}
              value={formatGHS(row.amount)}
              share={row.amount / (total || 1)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

function dayLabel(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function Sales({
  ledger,
  previous,
  period,
  showTax,
}: {
  ledger: Ledger;
  previous: Ledger;
  period: Period;
  showTax: boolean;
}) {
  const multiDay = period.from !== period.to;
  const trend = ledger.daily.map((day, index) => ({
    day: day.day,
    revenue: day.revenue,
    orders: day.orders,
    previous: previous.daily[index]?.revenue ?? 0,
  }));
  const busy = ledger.hourly.filter((hour) => hour.orders > 0).map((hour) => hour.hour);
  const firstHour = Math.min(...busy, 7);
  const lastHour = Math.max(...busy, 21);
  const hours = ledger.hourly
    .filter((hour) => hour.hour >= firstHour && hour.hour <= lastHour)
    .map((hour) => ({ label: `${String(hour.hour).padStart(2, "0")}:00`, value: hour.revenue }));
  const bestDay = [...ledger.daily].sort((a, b) => b.revenue - a.revenue)[0];
  const bestHour = hours.reduce<{ label: string; value: number } | null>(
    (best, hour) => (hour.value > (best?.value ?? 0) ? hour : best),
    null,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label={showTax ? "Net sales" : "Sales"}
          value={money(ledger.netSales)}
          icon={<TrendingUp />}
          tint="good"
          delta={change(ledger.netSales, previous.netSales)}
          detail={`${money(previous.netSales)} previous period`}
        />
        <Stat
          label="Paid orders"
          value={ledger.orderCount}
          icon={<ReceiptText />}
          tint="accent"
          delta={change(ledger.orderCount, previous.orderCount)}
        />
        <Stat
          label="Average bill"
          value={money(ledger.averageTicket)}
          icon={<Tag />}
          tint="brand"
          delta={change(ledger.averageTicket, previous.averageTicket)}
          detail={showTax ? "After VAT" : undefined}
        />
        <Stat
          label={multiDay ? "Best day" : "Busiest hour"}
          value={multiDay ? (bestDay && bestDay.revenue > 0 ? dayLabel(bestDay.day) : "—") : (bestHour?.label ?? "—")}
          icon={<TrendingUp />}
          tint="neutral"
          detail={
            multiDay
              ? bestDay && bestDay.revenue > 0
                ? money(bestDay.revenue)
                : undefined
              : bestHour
                ? money(bestHour.value)
                : undefined
          }
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {multiDay ? (
          <Panel title="Sales by day" explainer="Sales each day. Dashed: the same day in the previous period.">
            <div className="px-2 pb-4 sm:px-3">
              <TrendChart data={trend} height={250} />
            </div>
          </Panel>
        ) : (
          <Panel title="Sales by hour" explainer="When the money comes in, Accra time.">
            <div className="px-2 pb-4 sm:px-3">
              <ColumnChart data={hours} height={250} />
            </div>
          </Panel>
        )}
        <PaymentMix ledger={ledger} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Items sold" explainer="Top 15 by sales value.">
          {ledger.topItems.length === 0 ? (
            <EmptyState title="Nothing sold in this period" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Sold</th>
                  <th className="num">Sales</th>
                </tr>
              </thead>
              <tbody>
                {ledger.topItems.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td className="num muted">{item.quantity}</td>
                    <td className="num">{formatGHS(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        {multiDay ? (
          <Panel title="Day by day">
            <div className="max-h-[34rem] overflow-y-auto">
              <Table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th className="num">Orders</th>
                    <th className="num">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {[...ledger.daily].reverse().map((day) => (
                    <tr key={day.day}>
                      <td>
                        <a href={`/admin/orders?day=${day.day}`} className="hover:underline">
                          {dayLabel(day.day)}
                        </a>
                      </td>
                      <td className="num muted">{day.orders}</td>
                      <td className="num">{day.revenue > 0 ? formatGHS(day.revenue) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="num">{ledger.orderCount}</td>
                    <td className="num">{formatGHS(ledger.netSales)}</td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Panel>
        ) : (
          <Panel title="Hour by hour">
            {ledger.orderCount === 0 ? (
              <EmptyState title="No sales on this day" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Hour</th>
                    <th className="num">Orders</th>
                    <th className="num">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.hourly
                    .filter((hour) => hour.orders > 0)
                    .map((hour) => (
                      <tr key={hour.hour}>
                        <td>{String(hour.hour).padStart(2, "0")}:00</td>
                        <td className="num muted">{hour.orders}</td>
                        <td className="num">{formatGHS(hour.revenue)}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Refunds, voids & discounts
// ---------------------------------------------------------------------------

function Adjustments({ ledger, previous, query }: { ledger: Ledger; previous: Ledger; query: string }) {
  const lost = ledger.discounts + ledger.refunds.amount;
  const base = ledger.takings + lost;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label={<Term name="refunds">Refunds</Term>}
          value={money(ledger.refunds.amount)}
          icon={<Undo2 />}
          tint="bad"
          delta={change(ledger.refunds.amount, previous.refunds.amount)}
          invertDelta
          detail={`${ledger.refunds.count} paid sale${ledger.refunds.count === 1 ? "" : "s"} given back`}
        />
        <Stat
          label={<Term name="voids">Voids</Term>}
          value={money(ledger.voids.amount)}
          icon={<Ban />}
          tint="warn"
          detail={`${ledger.voids.count} ticket${ledger.voids.count === 1 ? "" : "s"} cancelled`}
        />
        <Stat
          label={<Term name="discounts">Discounts</Term>}
          value={money(ledger.discounts)}
          icon={<Tag />}
          tint="accent"
          delta={change(ledger.discounts, previous.discounts)}
          invertDelta
          detail={`On ${ledger.discountedOrders} order${ledger.discountedOrders === 1 ? "" : "s"}`}
        />
        <Stat
          label="Lost to discounts & refunds"
          value={base > 0 ? `${((lost / base) * 100).toFixed(1)}%` : "—"}
          icon={<Percent />}
          tint="neutral"
          detail="Share of what would have been taken"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title="Refunds by reason"
          action={
            <a href={`/admin/orders?status=voided&${query}`} className="font-semibold hover:underline" style={{ color: "var(--s-brand)" }}>
              See the orders
            </a>
          }
        >
          {ledger.refunds.byReason.length === 0 ? (
            <EmptyState icon={<Undo2 />} title="No refunds in this period" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th className="num">Orders</th>
                  <th className="num">Value</th>
                </tr>
              </thead>
              <tbody>
                {ledger.refunds.byReason.map((row) => (
                  <tr key={row.reason}>
                    <td>{VOID_REASON_LABELS[row.reason] ?? row.reason}</td>
                    <td className="num muted">{row.count}</td>
                    <td className="num">{formatGHS(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="What to look for" padded>
          <ul className="space-y-3 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            <li>
              <strong style={{ color: "var(--s-ink)" }}>Refunds bunched on one cashier or shift</strong> are worth a
              conversation. The Orders screen shows who rang each one.
            </li>
            <li>
              <strong style={{ color: "var(--s-ink)" }}>Lots of &ldquo;rung by mistake&rdquo; voids</strong> usually
              mean the till is slowing people down, not dishonesty.
            </li>
            <li>
              <strong style={{ color: "var(--s-ink)" }}>Discounts above 3–5% of takings</strong> are eating margin.
              Check who is giving them and why.
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// VAT
// ---------------------------------------------------------------------------

function VatTab({ vat, ledger }: { vat: VatReturn; ledger: Ledger }) {
  if (!vat.active) {
    return (
      <Panel>
        <EmptyState
          icon={<Scale />}
          title="No VAT charged in this period"
          hint="VAT and the GRA levies are built and ready but switched off. Turn them on in Settings → Tax once Anis's VAT registration is confirmed, and this return fills in automatically."
          action={
            <a href="/admin/settings" className="text-sm font-bold" style={{ color: "var(--s-brand)" }}>
              Open Settings
            </a>
          }
        />
      </Panel>
    );
  }
  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Panel
        title="Output tax collected"
        explainer="Straight from what each receipt charged. Confirm with your accountant or the GRA before filing."
      >
        <StatementRow label="Taxable sales (excluding tax)" value={formatGHS(vat.taxable)} />
        {vat.byLevy.map((levy) => (
          <StatementRow key={levy.code} indent label={levy.label} value={formatGHS(levy.amount)} />
        ))}
        <StatementRow strong border label="Total tax collected" value={formatGHS(vat.taxTotal)} tone="brand" />
      </Panel>
      <div className="space-y-3">
        <Stat label="Taxed sales" value={vat.taxedOrders} icon={<ReceiptText />} tint="accent" detail={`of ${ledger.orderCount} paid orders`} />
        <Stat
          label="Tax as share of takings"
          value={ledger.takings > 0 ? `${((vat.taxTotal / ledger.takings) * 100).toFixed(1)}%` : "—"}
          icon={<Percent />}
        />
      </div>
    </div>
  );
}
