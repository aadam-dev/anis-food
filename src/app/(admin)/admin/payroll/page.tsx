import { prisma } from "@/lib/db";
import { BadgeCent, CircleCheck, FilePen, Hourglass } from "lucide-react";
import { formatGHS, roundMoney, toMoney } from "@/lib/money";
import { addDays, resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { PageHeader, Stat } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import PayrollClient, { type PayrollRecordView, type PayableStaff } from "./PayrollClient";

export const metadata = { title: "Payroll" };
export const dynamic = "force-dynamic";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const period = resolvePeriod(await searchParams, "month");
  const { start, end } = periodBounds(period.from, period.to);

  const [records, staff] = await Promise.all([
    prisma.payrollRecord.findMany({
      // A pay run shows in the period it covers or the one it was paid in, and
      // anything not yet paid always shows — money owed must not scroll away.
      where: {
        OR: [
          {
            periodStart: {
              gte: new Date(`${period.from}T00:00:00Z`),
              lt: new Date(`${addDays(period.to, 1)}T00:00:00Z`),
            },
          },
          { paidAt: { gte: start, lt: end } },
          { status: { not: "PAID" } },
        ],
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      include: { user: { select: { name: true } } },
      take: 200,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, staffProfile: { select: { salaryAmount: true } } },
    }),
  ]);

  const serialized: PayrollRecordView[] = records.map((record) => ({
    id: record.id,
    name: record.user.name,
    periodStart: record.periodStart.toISOString().slice(0, 10),
    periodEnd: record.periodEnd.toISOString().slice(0, 10),
    baseAmount: toMoney(record.baseAmount),
    bonuses: toMoney(record.bonuses),
    deductions: toMoney(record.deductions),
    netAmount: toMoney(record.netAmount),
    status: record.status,
  }));

  const sum = (rows: typeof records) => roundMoney(rows.reduce((total, row) => total + toMoney(row.netAmount), 0));
  const paidInPeriod = sum(records.filter((row) => row.paidAt && row.paidAt >= start && row.paidAt < end));
  const approved = sum(records.filter((row) => row.status === "APPROVED"));
  const drafts = sum(records.filter((row) => row.status === "DRAFT"));

  const payable: PayableStaff[] = staff.map((user) => ({
    id: user.id,
    name: user.name,
    defaultSalary: user.staffProfile ? toMoney(user.staffProfile.salaryAmount) : 0,
  }));

  return (
    <>
      <PageHeader
        eyebrow={`Money · ${period.label}`}
        title="Payroll"
        description="Draft, approve, then mark as paid. Wages count against profit on the day they are paid."
        actions={<PeriodPicker period={period} presets={["month", "last-month"]} />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Paid in this period" value={formatGHS(paidInPeriod)} icon={<CircleCheck />} tint="good" detail="What the P&L counts" />
        <Stat label="Approved, not paid" value={formatGHS(approved)} icon={<Hourglass />} tint="warn" detail="Owed to staff" />
        <Stat label="Drafts" value={formatGHS(drafts)} icon={<FilePen />} tint="neutral" detail="Not yet approved" />
        <Stat label="Pay runs shown" value={records.length} icon={<BadgeCent />} tint="accent" detail={`${staff.length} active staff`} />
      </div>
      <PayrollClient records={serialized} payable={payable} />
    </>
  );
}
