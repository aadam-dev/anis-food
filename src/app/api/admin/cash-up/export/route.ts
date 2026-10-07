import { NextResponse } from "next/server";
import { requireResource } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { getShifts } from "@/lib/report-sessions";
import { getSettings } from "@/lib/settings";
import { Report, periodText } from "@/lib/excel";

const KIND: Record<string, string> = { IN: "Put in", SPEND: "Spent", DEPOSIT: "Deposit", WAGES: "Wages" };
const INTO: Record<string, string> = { MOMO: "MoMo", BANK: "Bank", SAFE: "Cash safe" };

/** Every shift's cash-up, and every non-sale movement of drawer cash. */
export async function GET(request: Request) {
  const auth = await requireResource("reports");
  if (auth instanceof NextResponse) return auth;
  const period = resolvePeriod(Object.fromEntries(new URL(request.url).searchParams), "month");
  const { start, end } = periodBounds(period.from, period.to);
  const [shifts, movements, settings, me] = await Promise.all([
    getShifts(period.from, period.to),
    prisma.cashMovement.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { name: true } } },
    }),
    getSettings(),
    prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } }),
  ]);
  const report = new Report({ business: settings.business_name, period: periodText(period.from, period.to), generatedBy: me?.name });
  report.table("Shifts", {
    title: "Cash-up by shift",
    columns: [
      { header: "Day", value: (s) => new Date(`${s.businessDay}T12:00:00Z`), type: "date" },
      { header: "Opened by", value: (s) => s.openedBy },
      { header: "Closed by", value: (s) => s.closedBy ?? (s.status === "OPEN" ? "(still open)" : "") },
      { header: "Float", value: (s) => s.openingFloat, type: "money" },
      { header: "Expected cash", value: (s) => s.expectedCash, type: "money" },
      { header: "Counted cash", value: (s) => s.closingCash, type: "money" },
      { header: "Difference", value: (s) => s.differenceLabel },
      { header: "MoMo expected", value: (s) => s.expectedMomo, type: "money" },
      { header: "MoMo counted", value: (s) => s.closingMomo, type: "money" },
    ],
    rows: shifts,
  });
  report.table("Drawer movements", {
    title: "Money in and out of the drawer (not sales)",
    totals: true,
    columns: [
      { header: "Date & time", value: (row) => row.createdAt, type: "datetime" },
      { header: "Type", value: (row) => KIND[row.kind] ?? row.kind },
      { header: "Into", value: (row) => (row.destination ? INTO[row.destination] : null) },
      { header: "Reason", value: (row) => row.reason, width: 40 },
      { header: "By", value: (row) => row.createdBy.name },
      { header: "In", value: (row) => (row.direction === "IN" ? toMoney(row.amount) : null), type: "money", total: true },
      { header: "Out", value: (row) => (row.direction === "OUT" ? toMoney(row.amount) : null), type: "money", total: true },
    ],
    rows: movements,
  });
  return report.response(`anis-cash-up-${period.from}-to-${period.to}`);
}
