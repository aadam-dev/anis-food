import { NextResponse } from "next/server";
import { requireResource } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { addDays, resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { Report, periodText } from "@/lib/excel";
import { PAYROLL_STATUS_LABELS } from "@/components/admin/labels";

const FROM: Record<string, string> = { SAFE: "Cash (safe)", MOMO: "MoMo", BANK: "Bank transfer", TILL: "From the till" };

/** Payslips covering, or paid in, a period. */
export async function GET(request: Request) {
  const auth = await requireResource("payroll");
  if (auth instanceof NextResponse) return auth;
  const period = resolvePeriod(Object.fromEntries(new URL(request.url).searchParams), "month");
  const { start, end } = periodBounds(period.from, period.to);
  const [records, settings, me] = await Promise.all([
    prisma.payrollRecord.findMany({
      where: {
        OR: [
          { periodStart: { gte: new Date(`${period.from}T00:00:00Z`), lt: new Date(`${addDays(period.to, 1)}T00:00:00Z`) } },
          { paidAt: { gte: start, lt: end } },
        ],
      },
      orderBy: [{ periodStart: "asc" }],
      include: { staff: { select: { name: true, position: true, momoNumber: true, bankName: true, bankAccount: true } }, user: { select: { name: true } } },
    }),
    getSettings(),
    prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } }),
  ]);
  const report = new Report({ business: settings.business_name, period: periodText(period.from, period.to), generatedBy: me?.name });
  report.table("Payroll", {
    title: "Payroll",
    totals: true,
    columns: [
      { header: "Name", value: (row) => row.staff?.name ?? row.user?.name ?? "Former staff" },
      { header: "Job", value: (row) => row.staff?.position },
      { header: "Pay period", value: (row) => `${row.periodStart.toISOString().slice(0, 10)} to ${row.periodEnd.toISOString().slice(0, 10)}` },
      { header: "Basic", value: (row) => toMoney(row.baseAmount), type: "money", total: true },
      { header: "Bonuses", value: (row) => toMoney(row.bonuses) || null, type: "money", total: true },
      { header: "Deductions", value: (row) => toMoney(row.deductions) || null, type: "money", total: true },
      { header: "Net pay", value: (row) => toMoney(row.netAmount), type: "money", total: true },
      { header: "Status", value: (row) => PAYROLL_STATUS_LABELS[row.status] ?? row.status },
      { header: "Paid on", value: (row) => row.paidAt, type: "date" },
      { header: "Paid from", value: (row) => (row.paidFrom ? FROM[row.paidFrom] : null) },
      {
        header: "Pay to",
        value: (row) =>
          row.staff?.momoNumber ? `MoMo ${row.staff.momoNumber}` : row.staff?.bankAccount ? `${row.staff.bankName ?? "Bank"} ${row.staff.bankAccount}` : null,
      },
    ],
    rows: records,
  });
  return report.response(`anis-payroll-${period.from}-to-${period.to}`);
}
