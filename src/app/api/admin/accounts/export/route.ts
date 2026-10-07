import { NextResponse } from "next/server";
import { requireResource } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { ACCOUNT_LABELS, statementOf, type MoneyAccountKey } from "@/lib/accounts";
import { getFlows } from "@/lib/accounts.server";
import { Report, periodText } from "@/lib/excel";

/** Statements for the safe, MoMo and the bank over a period, one sheet each. */
export async function GET(request: Request) {
  const auth = await requireResource("accounts");
  if (auth instanceof NextResponse) return auth;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const period = resolvePeriod(params, "month");
  const { start, end } = periodBounds(period.from, period.to);
  const [flows, settings, me] = await Promise.all([
    getFlows(),
    getSettings(),
    prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } }),
  ]);
  const report = new Report({
    business: settings.business_name,
    period: periodText(period.from, period.to),
    generatedBy: me?.name,
  });

  const keys: MoneyAccountKey[] = ["SAFE", "MOMO", "BANK"];
  const statements = keys.map((key) => statementOf(key, flows, start, end));

  report.summary("Summary", {
    title: "Money accounts",
    rows: statements.flatMap((statement) => [
      ACCOUNT_LABELS[statement.account],
      { label: "Opening balance", value: statement.opening },
      { label: "Money in", value: statement.moneyIn },
      { label: "Money out", value: -statement.moneyOut },
      { label: "Closing balance", value: statement.closing, strong: true },
    ]),
  });

  for (const statement of statements) {
    report.table(ACCOUNT_LABELS[statement.account], {
      title: `${ACCOUNT_LABELS[statement.account]} statement`,
      note: `Opening balance GH₵${statement.opening.toFixed(2)} · closing GH₵${statement.closing.toFixed(2)}`,
      totals: true,
      columns: [
        { header: "Date", value: (line) => line.at, type: "datetime" },
        { header: "What", value: (line) => line.label },
        { header: "Type", value: (line) => line.kind.replace(/_/g, " ").toLowerCase() },
        { header: "In", value: (line) => (line.direction === "IN" && !line.opening ? line.amount : null), type: "money", total: true },
        { header: "Out", value: (line) => (line.direction === "OUT" ? line.amount : null), type: "money", total: true },
        { header: "Balance", value: (line) => line.balance, type: "money" },
      ],
      rows: statement.lines,
    });
  }

  return report.response(`anis-accounts-${period.from}-to-${period.to}`);
}
