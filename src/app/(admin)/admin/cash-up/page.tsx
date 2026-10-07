import { Banknote, Coins, Smartphone, TrendingUp } from "lucide-react";
import { getCashUp } from "@/lib/report-sessions";
import { getSettings } from "@/lib/settings";
import { formatGHS } from "@/lib/money";
import { differenceLabel } from "@/lib/cash";
import { resolvePeriod } from "@/lib/period";
import { EmptyState, PageHeader, Panel, ShareBar, Stat } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import ExportMenu from "@/components/admin/ExportMenu";
import { PAYMENT_LABELS } from "@/components/admin/labels";
import ShiftList from "./ShiftList";

export const metadata = { title: "Cash-up" };
export const dynamic = "force-dynamic";

function differenceTint(value: number | null) {
  if (value === null) return "neutral" as const;
  if (value === 0) return "good" as const;
  return value < 0 ? ("bad" as const) : ("warn" as const);
}

export default async function CashUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const period = resolvePeriod(await searchParams, "today");
  const [cashUp, settings] = await Promise.all([getCashUp(period.from, period.to), getSettings()]);
  const { totals } = cashUp;
  const methods = Object.entries(totals.byMethod)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        eyebrow={`Money · ${period.label}`}
        title="Cash-up"
        description="Every shift's drawer and MoMo, counted against what the till says should be there."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker period={period} presets={["today", "yesterday", "week", "month", "last-month"]} />
            <ExportMenu endpoint="/api/admin/cash-up/export" from={period.from} to={period.to} title="Export cash-up" />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Taken across shifts"
          value={formatGHS(totals.takings)}
          icon={<TrendingUp />}
          tint="good"
          detail={`${totals.orders} paid order${totals.orders === 1 ? "" : "s"} · ${cashUp.shifts.length} shift${cashUp.shifts.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Cash should be"
          value={formatGHS(totals.expectedCash)}
          icon={<Banknote />}
          tint="accent"
          detail={totals.countedCash === null ? "Not every shift is counted yet" : `${formatGHS(totals.countedCash)} counted`}
        />
        <Stat
          label="Cash difference"
          value={totals.cashDifference === null ? "—" : totals.cashDifference === 0 ? "Balanced" : formatGHS(totals.cashDifference)}
          icon={<Coins />}
          tint={differenceTint(totals.cashDifference)}
          detail={
            totals.openShifts > 0
              ? `${totals.openShifts} shift${totals.openShifts === 1 ? "" : "s"} still open`
              : totals.cashDifference === null
                ? differenceLabel(null)
                : "Counted against what the till expected"
          }
        />
        <Stat
          label="MoMo difference"
          value={totals.momoDifference === null ? "—" : totals.momoDifference === 0 ? "Balanced" : formatGHS(totals.momoDifference)}
          icon={<Smartphone />}
          tint={differenceTint(totals.momoDifference)}
          detail={
            totals.momoDifference === null
              ? `${formatGHS(totals.momoTaken)} taken · balance not checked`
              : `${formatGHS(totals.momoTaken)} taken`
          }
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {cashUp.shifts.length === 0 ? (
            <Panel>
              <EmptyState icon={<Coins />} title="No shifts in this period" hint="A shift appears here as soon as someone opens the till." />
            </Panel>
          ) : (
            <ShiftList shifts={cashUp.shifts} businessName={settings.business_name} />
          )}
        </div>

        <div className="space-y-4">
          <Panel title="By payment method" explainer="Split bills are credited to each method that took them.">
            {methods.length === 0 ? (
              <p className="px-5 pb-5 text-sm" style={{ color: "var(--s-ink-faint)" }}>
                Nothing taken yet.
              </p>
            ) : (
              <div className="space-y-3 px-4 pb-5 sm:px-5">
                {methods.map(([method, amount]) => (
                  <ShareBar
                    key={method}
                    label={PAYMENT_LABELS[method] ?? method}
                    value={formatGHS(amount)}
                    share={amount / (totals.takings || 1)}
                  />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Money out of the drawer">
            <dl className="space-y-2.5 px-4 pb-5 text-sm sm:px-5">
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--s-ink-muted)" }}>Spent (filed as expenses)</dt>
                <dd className="money font-semibold">{formatGHS(totals.spends)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--s-ink-muted)" }}>
                  Deposited to MoMo or bank
                  <span className="block text-xs" style={{ color: "var(--s-ink-faint)" }}>A transfer, not a cost</span>
                </dt>
                <dd className="money font-semibold">{formatGHS(totals.deposits)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
