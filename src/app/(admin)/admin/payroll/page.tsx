import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { PageHeader } from "@/components/admin/ui";
import PayrollClient, { type PayrollRecordView, type PayableStaff } from "./PayrollClient";

export const metadata = { title: "Payroll" };
export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const [records, staff] = await Promise.all([
    prisma.payrollRecord.findMany({
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

  const payable: PayableStaff[] = staff.map((user) => ({
    id: user.id,
    name: user.name,
    defaultSalary: user.staffProfile ? toMoney(user.staffProfile.salaryAmount) : 0,
  }));

  return (
    <>
      <PageHeader title="Payroll" description="Draft, approve, then mark as paid. Only paid wages count against profit." />
      <PayrollClient records={serialized} payable={payable} />
    </>
  );
}
