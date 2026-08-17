import { prisma } from "@/lib/db";
import { toMoney, roundMoney } from "@/lib/money";
import { businessDay, businessDayRange } from "@/lib/session-utils";
import { PageHeader } from "@/components/admin/ui";
import ExpensesClient, { type AdminExpense, type ExpenseCategory } from "./ExpensesClient";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : businessDay().slice(0, 7);
  const start = businessDayRange(`${month}-01`).start;
  const [year, m] = month.split("-").map(Number);
  const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;
  const end = businessDayRange(nextMonth).start;

  const [categories, expenses] = await Promise.all([
    prisma.expenseCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.expense.findMany({
      where: { incurredOn: { gte: start, lt: end } },
      orderBy: { incurredOn: "desc" },
      include: { category: { select: { name: true } } },
    }),
  ]);

  const total = roundMoney(expenses.reduce((sum, e) => sum + toMoney(e.amount), 0));

  const serialized: AdminExpense[] = expenses.map((expense) => ({
    id: expense.id,
    description: expense.description,
    amount: toMoney(expense.amount),
    category: expense.category.name,
    incurredOn: expense.incurredOn.toISOString().slice(0, 10),
    paymentMethod: expense.paymentMethod,
  }));

  const cats: ExpenseCategory[] = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <PageHeader title="Expenses" description="What the business spent, by month." />
      <ExpensesClient
        expenses={serialized}
        categories={cats}
        month={month}
        total={total}
      />
    </>
  );
}
