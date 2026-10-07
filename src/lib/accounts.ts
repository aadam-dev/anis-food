import { roundMoney } from "./money";

/**
 * The business's money outside the till: the cash safe, the MoMo wallet and
 * the bank. Each balance is folded from every movement that touched it. Most
 * movements are read from their own records (sales, till deposits, expenses,
 * wages), so a balance can never drift from what actually happened; only
 * opening balances, transfers, Bolt payouts, owner withdrawals and corrections
 * are typed in by hand.
 */

export type MoneyAccountKey = "SAFE" | "MOMO" | "BANK";

export const ACCOUNT_LABELS: Record<MoneyAccountKey | "TILL", string> = {
  TILL: "Till drawer",
  SAFE: "Cash safe",
  MOMO: "MoMo wallet",
  BANK: "Bank",
};

export interface Flow {
  account: MoneyAccountKey;
  direction: "IN" | "OUT";
  amount: number;
  at: Date;
  /** What moved it, in a few words: "Cash from the till", "Wages: Ama". */
  label: string;
  /** Where to look for the source: a shift, an expense, a payslip, a day's sales. */
  href?: string;
  /** Kind of movement, for filters and the export. */
  kind: string;
  /** True for OPENING_BALANCE: the balance starts again from here. */
  opening?: boolean;
  /** For hand-entered movements, the entry's id (so it can be reversed). */
  entryId?: string;
}

export interface StatementLine extends Flow {
  balance: number;
}

export interface Statement {
  account: MoneyAccountKey;
  /** Balance at the start of the period. */
  opening: number;
  lines: StatementLine[];
  /** Balance at the end of the period. */
  closing: number;
  moneyIn: number;
  moneyOut: number;
}

/** Flows that count: those on or after the latest opening balance at or before `until`. */
function counted(flows: Flow[], until: Date): Flow[] {
  const ordered = flows
    .filter((flow) => flow.at.getTime() <= until.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime() || Number(Boolean(b.opening)) - Number(Boolean(a.opening)));
  let start = 0;
  ordered.forEach((flow, index) => {
    if (flow.opening) start = index;
  });
  return ordered.slice(start);
}

const signed = (flow: Flow) => (flow.direction === "IN" ? flow.amount : -flow.amount);

/** An account's balance at a moment (now, by default). */
export function balanceOf(flows: Flow[], until: Date = new Date()): number {
  return roundMoney(counted(flows, until).reduce((sum, flow) => sum + signed(flow), 0));
}

/** Every movement in [from, to) with a running balance, for one account. */
export function statementOf(account: MoneyAccountKey, flows: Flow[], from: Date, to: Date): Statement {
  const mine = flows.filter((flow) => flow.account === account);
  const all = counted(mine, new Date(to.getTime() - 1));
  const before = all.filter((flow) => flow.at.getTime() < from.getTime());
  const during = all.filter((flow) => flow.at.getTime() >= from.getTime());

  // An opening balance inside the period restarts the running total there.
  const opening = during.some((flow) => flow.opening)
    ? 0
    : roundMoney(before.reduce((sum, flow) => sum + signed(flow), 0));

  let running = opening;
  const lines = during.map((flow) => {
    running = roundMoney(flow.opening ? flow.amount : running + signed(flow));
    return { ...flow, balance: running };
  });
  const sumOf = (direction: "IN" | "OUT") =>
    roundMoney(during.filter((flow) => flow.direction === direction && !flow.opening).reduce((sum, flow) => sum + flow.amount, 0));

  return { account, opening, lines, closing: running, moneyIn: sumOf("IN"), moneyOut: sumOf("OUT") };
}

/** Which account a non-till expense was paid from, by how it was paid. */
export function expenseAccount(paymentMethod: string): MoneyAccountKey | null {
  if (paymentMethod === "MOMO") return "MOMO";
  if (paymentMethod === "BANK_TRANSFER" || paymentMethod === "CARD") return "BANK";
  if (paymentMethod === "CASH") return "SAFE";
  return null;
}
