import { BadgeCent, CircleCheck, FilePen, Hourglass } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatGHS, roundMoney, toMoney } from "@/lib/money";
import { addDays, resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { businessDay } from "@/lib/session-utils";
import { PageHeader, Stat } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import { ROLE_LABELS } from "@/components/admin/labels";
import PayrollClient, { type PayrollRecordView, type PayableStaff } from "./PayrollClient";

export const metadata = { title: "Payroll" };
export const dynamic = "force-dynamic";

/** Last day of the month that `day` falls in. */
function monthEnd(day: string): string {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const period = resolvePeriod(await searchParams, "month");
  const { start, end } = periodBounds(period.from, period.to);

  // A pay run covers the whole calendar month the view starts in.
  const runFrom = `${period.from.slice(0, 7)}-01`;
  const runTo = monthEnd(runFrom);
  const today = businessDay();
  const activityTo = runTo < today ? runTo : today;
  const activity = periodBounds(runFrom, activityTo);

  const [records, staff, settings, orderDays, shiftDays] = await Promise.all([
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
      include: {
        user: {
          select: {
            name: true,
            role: true,
            staffProfile: { select: { momoNumber: true, bankName: true, bankAccount: true } },
          },
        },
      },
      take: 300,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        staffProfile: {
          select: {
            salaryType: true,
            salaryAmount: true,
            phone: true,
            momoNumber: true,
            bankName: true,
            bankAccount: true,
          },
        },
      },
    }),
    getSettings(),
    // Days each person worked, as the till saw it: days they rang a sale…
    prisma.order.findMany({
      where: { isDemo: false, staffId: { not: null }, createdAt: { gte: activity.start, lt: activity.end } },
      select: { staffId: true, createdAt: true },
    }),
    // …or opened a shift.
    prisma.posSession.findMany({
      where: { openedAt: { gte: activity.start, lt: activity.end } },
      select: { openedById: true, openedAt: true },
    }),
  ]);

  const daysWorked = new Map<string, Set<string>>();
  const mark = (userId: string | null, at: Date) => {
    if (!userId) return;
    const set = daysWorked.get(userId) ?? new Set<string>();
    set.add(businessDay(at));
    daysWorked.set(userId, set);
  };
  for (const order of orderDays) mark(order.staffId, order.createdAt);
  for (const shift of shiftDays) mark(shift.openedById, shift.openedAt);

  const serialized: PayrollRecordView[] = records.map((record) => ({
    id: record.id,
    name: record.user.name,
    role: ROLE_LABELS[record.user.role] ?? record.user.role,
    periodStart: record.periodStart.toISOString().slice(0, 10),
    periodEnd: record.periodEnd.toISOString().slice(0, 10),
    baseAmount: toMoney(record.baseAmount),
    bonuses: toMoney(record.bonuses),
    deductions: toMoney(record.deductions),
    netAmount: toMoney(record.netAmount),
    status: record.status,
    paidAt: record.paidAt?.toISOString() ?? null,
    notes: record.notes,
    payTo: record.user.staffProfile?.momoNumber
      ? `MoMo ${record.user.staffProfile.momoNumber}`
      : record.user.staffProfile?.bankAccount
        ? `${record.user.staffProfile.bankName ?? "Bank"} ${record.user.staffProfile.bankAccount}`
        : null,
  }));

  const payable: PayableStaff[] = staff.map((user) => ({
    id: user.id,
    name: user.name,
    role: ROLE_LABELS[user.role] ?? user.role,
    salaryType: user.staffProfile?.salaryType ?? "MONTHLY",
    rate: user.staffProfile ? toMoney(user.staffProfile.salaryAmount) : 0,
    phone: user.staffProfile?.phone ?? null,
    momoNumber: user.staffProfile?.momoNumber ?? null,
    bankName: user.staffProfile?.bankName ?? null,
    bankAccount: user.staffProfile?.bankAccount ?? null,
    daysWorked: daysWorked.get(user.id)?.size ?? 0,
  }));

  const sum = (rows: typeof records) => roundMoney(rows.reduce((total, row) => total + toMoney(row.netAmount), 0));
  const paidInPeriod = sum(records.filter((row) => row.paidAt && row.paidAt >= start && row.paidAt < end));
  const approved = sum(records.filter((row) => row.status === "APPROVED"));
  const drafts = sum(records.filter((row) => row.status === "DRAFT"));
  const withRate = payable.filter((person) => person.rate > 0).length;

  return (
    <>
      <PageHeader
        eyebrow={`Money · ${period.label}`}
        title="Payroll"
        description="Set each person's pay once, run payroll for the month, approve, then mark paid. Wages count against profit on the day they are paid."
        actions={<PeriodPicker period={period} presets={["month", "last-month"]} />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Paid in this period" value={formatGHS(paidInPeriod)} icon={<CircleCheck />} tint="good" detail="What the P&L counts" />
        <Stat label="Approved, not paid" value={formatGHS(approved)} icon={<Hourglass />} tint="warn" detail="Owed to staff" />
        <Stat label="Drafts" value={formatGHS(drafts)} icon={<FilePen />} tint="neutral" detail="Waiting for approval" />
        <Stat
          label="Pay rates set"
          value={`${withRate}/${payable.length}`}
          icon={<BadgeCent />}
          tint="accent"
          detail={withRate < payable.length ? "Set the rest in Pay rates" : "Everyone has a rate"}
        />
      </div>
      <PayrollClient
        records={serialized}
        payable={payable}
        runFrom={runFrom}
        runTo={runTo}
        businessName={settings.business_name}
      />
    </>
  );
}
