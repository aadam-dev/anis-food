import { ArrowRightLeft, Crown, Pin, Shuffle, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { toMoney, roundMoney, formatGHS } from "@/lib/money";
import { addDays, resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { PageHeader, Stat } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import ExportMenu from "@/components/admin/ExportMenu";
import ExpensesClient, {
  type AdminDeposit,
  type AdminExpense,
  type ExpenseCategory,
} from "./ExpensesClient";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const period = resolvePeriod(await searchParams, "month");
  const { start, end } = periodBounds(period.from, period.to);

  const [categories, expenses, deposits] = await Promise.all([
    prisma.expenseCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { expenses: true } } },
    }),
    prisma.expense.findMany({
      // incurredOn is a DATE column, so compare against UTC midnights.
      where: {
        incurredOn: {
          gte: new Date(`${period.from}T00:00:00Z`),
          lt: new Date(`${addDays(period.to, 1)}T00:00:00Z`),
        },
      },
      orderBy: [{ incurredOn: "desc" }, { createdAt: "desc" }],
      include: {
        category: { select: { id: true, name: true, isFixed: true } },
        cashMovement: { select: { id: true } },
      },
    }),
    prisma.cashMovement.findMany({
      where: { kind: "DEPOSIT", createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, reason: true, destination: true, createdAt: true },
    }),
  ]);

  let fixed = 0;
  let variable = 0;
  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    const amount = toMoney(expense.amount);
    if (expense.category.isFixed) fixed += amount;
    else variable += amount;
    byCategory.set(expense.category.name, (byCategory.get(expense.category.name) ?? 0) + amount);
  }
  const total = roundMoney(fixed + variable);
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const depositTotal = roundMoney(deposits.reduce((sum, deposit) => sum + toMoney(deposit.amount), 0));

  const serialized: AdminExpense[] = expenses.map((expense) => ({
    id: expense.id,
    description: expense.description,
    amount: toMoney(expense.amount),
    categoryId: expense.category.id,
    category: expense.category.name,
    isFixed: expense.category.isFixed,
    incurredOn: expense.incurredOn.toISOString().slice(0, 10),
    paymentMethod: expense.paymentMethod,
    receiptUrl: expense.receiptUrl,
    fromTill: expense.cashMovement !== null,
  }));

  const cats: ExpenseCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    isFixed: category.isFixed,
    count: category._count.expenses,
  }));

  const depositRows: AdminDeposit[] = deposits.map((deposit) => ({
    id: deposit.id,
    amount: toMoney(deposit.amount),
    reason: deposit.reason,
    destination: deposit.destination ?? "BANK",
    at: deposit.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        eyebrow={`Money · ${period.label}`}
        title="Expenses"
        description="What the business spent. Spends from the till land here on their own; deposits are transfers, not costs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker period={period} presets={["today", "week", "month", "last-month"]} />
            <ExportMenu endpoint="/api/admin/expenses/export" from={period.from} to={period.to} title="Export expenses" />
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Total spent"
          value={formatGHS(total)}
          icon={<Wallet />}
          tint="bad"
          detail={`${expenses.length} expense${expenses.length === 1 ? "" : "s"} · fixed ${formatGHS(fixed)}`}
        />
        <Stat label="Variable" value={formatGHS(variable)} icon={<Shuffle />} tint="accent" detail="Stock, gas, repairs" />
        <Stat
          label="Biggest category"
          value={top ? formatGHS(top[1]) : "—"}
          icon={top ? <Crown /> : <Pin />}
          tint="warn"
          detail={top ? `${top[0]} · ${Math.round((top[1] / (total || 1)) * 100)}% of spending` : "Nothing spent yet"}
        />
        <Stat
          label="Deposited"
          value={formatGHS(depositTotal)}
          icon={<ArrowRightLeft />}
          tint="neutral"
          detail="To MoMo or bank. Not a cost."
        />
      </div>

      <ExpensesClient expenses={serialized} deposits={depositRows} categories={cats} />
    </>
  );
}
