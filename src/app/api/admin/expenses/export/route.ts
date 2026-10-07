import { NextResponse } from "next/server";
import { requireResource } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import { resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { Report, periodText } from "@/lib/excel";
import { PAYMENT_LABELS } from "@/components/admin/labels";

/** Expenses and cash deposits for a period. */
export async function GET(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;
  const period = resolvePeriod(Object.fromEntries(new URL(request.url).searchParams), "month");
  const { start, end } = periodBounds(period.from, period.to);
  const [expenses, deposits, settings, me] = await Promise.all([
    prisma.expense.findMany({
      where: { incurredOn: { gte: new Date(`${period.from}T00:00:00Z`), lte: new Date(`${period.to}T00:00:00Z`) } },
      orderBy: { incurredOn: "asc" },
      include: { category: { select: { name: true, isFixed: true } }, cashMovement: { select: { id: true } } },
    }),
    prisma.cashMovement.findMany({
      where: { kind: "DEPOSIT", createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { name: true } } },
    }),
    getSettings(),
    prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } }),
  ]);
  const report = new Report({ business: settings.business_name, period: periodText(period.from, period.to), generatedBy: me?.name });

  const byCategory = new Map<string, { category: string; fixed: boolean; count: number; amount: number }>();
  for (const expense of expenses) {
    const entry = byCategory.get(expense.category.name) ?? { category: expense.category.name, fixed: expense.category.isFixed, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += toMoney(expense.amount);
    byCategory.set(expense.category.name, entry);
  }

  report.table("By category", {
    title: "Expenses by category",
    totals: true,
    columns: [
      { header: "Category", value: (row) => row.category },
      { header: "Fixed or variable", value: (row) => (row.fixed ? "Fixed" : "Variable") },
      { header: "Entries", value: (row) => row.count, type: "number", total: true },
      { header: "Amount", value: (row) => row.amount, type: "money", total: true },
    ],
    rows: [...byCategory.values()].sort((a, b) => b.amount - a.amount),
  });
  report.table("Expenses", {
    title: "Every expense",
    totals: true,
    columns: [
      { header: "Date", value: (row) => row.incurredOn, type: "date" },
      { header: "Category", value: (row) => row.category.name },
      { header: "Description", value: (row) => row.description, width: 44 },
      { header: "Paid by", value: (row) => (row.cashMovement ? "Cash from the till" : (PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod)) },
      { header: "Amount", value: (row) => toMoney(row.amount), type: "money", total: true },
      { header: "Receipt", value: (row) => (row.receiptUrl ? "Yes" : "") },
    ],
    rows: expenses,
  });
  report.table("Deposits", {
    title: "Cash moved out of the till",
    note: "Transfers, not costs.",
    totals: true,
    columns: [
      { header: "Date & time", value: (row) => row.createdAt, type: "datetime" },
      { header: "Into", value: (row) => (row.destination === "MOMO" ? "MoMo" : row.destination === "SAFE" ? "Cash safe" : "Bank") },
      { header: "Reason", value: (row) => row.reason },
      { header: "By", value: (row) => row.createdBy.name },
      { header: "Amount", value: (row) => toMoney(row.amount), type: "money", total: true },
    ],
    rows: deposits,
  });
  return report.response(`anis-expenses-${period.from}-to-${period.to}`);
}
