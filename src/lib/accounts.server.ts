import "server-only";
import { prisma } from "@/lib/db";
import { roundMoney, toMoney } from "@/lib/money";
import { REVENUE_WHERE, splitByMethod } from "@/lib/reports";
import { businessDay } from "@/lib/session-utils";
import { currentSession } from "@/lib/pos-session";
import { ACCOUNT_LABELS, balanceOf, expenseAccount, type Flow, type MoneyAccountKey } from "@/lib/accounts";
import { PaymentMethod } from "@/generated/prisma";

const ENTRY_LABELS: Record<string, string> = {
  OPENING_BALANCE: "Opening balance",
  TRANSFER: "Transfer",
  BOLT_PAYOUT: "Bolt payout",
  WITHDRAWAL: "Owner withdrawal",
  CAPITAL: "Owner put money in",
  ADJUSTMENT: "Correction",
};

const shortDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Every movement of money into or out of the safe, MoMo and the bank, from
 * the records that caused it. Read live, so nothing can fall out of step.
 */
export async function getFlows(): Promise<Flow[]> {
  const [entries, deposits, sales, expenses, wages] = await Promise.all([
    prisma.moneyEntry.findMany({ orderBy: { occurredAt: "asc" } }),
    prisma.cashMovement.findMany({
      where: { kind: "DEPOSIT", destination: { not: null } },
      select: {
        id: true,
        amount: true,
        destination: true,
        reason: true,
        createdAt: true,
        sessionId: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        ...REVENUE_WHERE,
        paymentMethod: { in: [PaymentMethod.MOMO, PaymentMethod.CARD, PaymentMethod.SPLIT] },
      },
      select: { paymentMethod: true, total: true, splitPayments: true, createdAt: true },
    }),
    prisma.expense.findMany({
      // Till spends left the drawer, not one of these accounts.
      where: { cashMovement: null },
      select: { id: true, amount: true, paymentMethod: true, description: true, incurredOn: true, category: { select: { name: true } } },
    }),
    prisma.payrollRecord.findMany({
      where: { status: "PAID", paidFrom: { in: ["SAFE", "MOMO", "BANK"] } },
      select: {
        id: true,
        netAmount: true,
        paidFrom: true,
        paidAt: true,
        periodStart: true,
        staff: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const flows: Flow[] = [];

  for (const entry of entries) {
    flows.push({
      account: entry.account as MoneyAccountKey,
      direction: entry.direction,
      amount: toMoney(entry.amount),
      at: entry.occurredAt,
      label: entry.reason ? `${ENTRY_LABELS[entry.kind]}: ${entry.reason}` : ENTRY_LABELS[entry.kind],
      kind: entry.kind,
      opening: entry.kind === "OPENING_BALANCE",
      entryId: entry.id,
    });
  }

  for (const deposit of deposits) {
    const account = deposit.destination as MoneyAccountKey;
    flows.push({
      account,
      direction: "IN",
      amount: toMoney(deposit.amount),
      at: deposit.createdAt,
      label: `Cash from the till (${deposit.createdBy.name})`,
      href: `/admin/cash-up?day=${businessDay(deposit.createdAt)}`,
      kind: "TILL_DEPOSIT",
    });
  }

  // MoMo and card sales land as one line per day per account.
  const byDay = new Map<string, typeof sales>();
  for (const order of sales) {
    const day = businessDay(order.createdAt);
    byDay.set(day, [...(byDay.get(day) ?? []), order]);
  }
  for (const [day, orders] of byDay) {
    const split = splitByMethod(orders);
    const at = new Date(`${day}T23:59:00Z`);
    const href = `/admin/orders?from=${day}&to=${day}&status=paid`;
    if ((split.MOMO ?? 0) > 0) {
      flows.push({ account: "MOMO", direction: "IN", amount: roundMoney(split.MOMO), at, label: `MoMo sales, ${shortDay(day)}`, href, kind: "SALES" });
    }
    if ((split.CARD ?? 0) > 0) {
      flows.push({ account: "BANK", direction: "IN", amount: roundMoney(split.CARD), at, label: `Card sales, ${shortDay(day)}`, href, kind: "SALES" });
    }
  }

  for (const expense of expenses) {
    const account = expenseAccount(expense.paymentMethod);
    if (!account) continue;
    flows.push({
      account,
      direction: "OUT",
      amount: toMoney(expense.amount),
      at: new Date(`${expense.incurredOn.toISOString().slice(0, 10)}T12:00:00Z`),
      label: `${expense.category.name}: ${expense.description}`,
      href: `/admin/expenses`,
      kind: "EXPENSE",
    });
  }

  for (const wage of wages) {
    flows.push({
      account: wage.paidFrom as MoneyAccountKey,
      direction: "OUT",
      amount: toMoney(wage.netAmount),
      at: wage.paidAt ?? wage.periodStart,
      label: `Wages: ${wage.staff?.name ?? wage.user?.name ?? "staff"}`,
      href: `/admin/payroll`,
      kind: "PAYROLL",
    });
  }

  return flows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export interface AccountBalances {
  till: { open: boolean; expected: number | null; openedBy: string | null };
  accounts: { account: MoneyAccountKey; label: string; balance: number; hasOpening: boolean }[];
}

/** Today's balances: the open drawer, the safe, MoMo and the bank. */
export async function getBalances(flows?: Flow[]): Promise<AccountBalances> {
  const [all, shift] = await Promise.all([flows ? Promise.resolve(flows) : getFlows(), currentSession()]);
  const keys: MoneyAccountKey[] = ["SAFE", "MOMO", "BANK"];
  return {
    till: {
      open: shift !== null,
      expected: shift ? shift.expectedCash : null,
      openedBy: shift?.openedBy?.name ?? null,
    },
    accounts: keys.map((account) => {
      const mine = all.filter((flow) => flow.account === account);
      return {
        account,
        label: ACCOUNT_LABELS[account],
        balance: balanceOf(mine),
        hasOpening: mine.some((flow) => flow.opening),
      };
    }),
  };
}
