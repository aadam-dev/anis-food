import Link from "next/link";
import { Landmark, Smartphone, Vault, Banknote, Download } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { resolvePeriod } from "@/lib/period";
import { periodBounds } from "@/lib/reports";
import { ACCOUNT_LABELS, statementOf, type MoneyAccountKey } from "@/lib/accounts";
import { getBalances, getFlows } from "@/lib/accounts.server";
import { PageHeader, Panel, Stat, EmptyState, Table, Chip } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import AccountsActions, { DeleteEntryButton } from "./AccountsActions";

export const metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

const ICONS = { SAFE: <Vault />, MOMO: <Smartphone />, BANK: <Landmark /> } as const;
const KEYS: MoneyAccountKey[] = ["SAFE", "MOMO", "BANK"];

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = resolvePeriod(params, "month");
  const { start, end } = periodBounds(period.from, period.to);
  const requested = (Array.isArray(params.account) ? params.account[0] : params.account) as MoneyAccountKey | undefined;
  const account: MoneyAccountKey = requested && KEYS.includes(requested) ? requested : "MOMO";

  const flows = await getFlows();
  const balances = await getBalances(flows);
  const statement = statementOf(account, flows, start, end);
  const current = balances.accounts.find((entry) => entry.account === account)!;
  const keep = (key: string) => {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) if (typeof value === "string" && name !== "account") query.set(name, value);
    query.set("account", key);
    return `?${query.toString()}`;
  };
  const periodQuery = new URLSearchParams(
    Object.entries(params).filter(([, value]) => typeof value === "string") as [string, string][],
  );
  periodQuery.set("account", account);

  return (
    <>
      <PageHeader
        eyebrow={`Money · ${period.label}`}
        title="Accounts"
        description="Where the money is: the till, the cash safe, MoMo and the bank. Sales, deposits, expenses and wages move these on their own; record anything else here."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker period={period} />
            <AccountsActions accounts={KEYS.map((key) => ({ key, label: ACCOUNT_LABELS[key] }))} />
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Till drawer"
          value={balances.till.expected === null ? "Closed" : formatGHS(balances.till.expected)}
          icon={<Banknote />}
          tint="neutral"
          detail={balances.till.open ? `Should hold now · ${balances.till.openedBy ?? ""}` : "No shift open"}
          href="/admin/cash-up"
        />
        {balances.accounts.map((entry) => (
          <Stat
            key={entry.account}
            label={entry.label}
            value={formatGHS(entry.balance)}
            icon={ICONS[entry.account]}
            tint={entry.account === account ? "brand" : "neutral"}
            detail={entry.hasOpening ? "Balance now" : "Set an opening balance"}
            href={keep(entry.account)}
          />
        ))}
      </div>

      <Panel
        title={`${ACCOUNT_LABELS[account]} statement`}
        explainer={`${period.label}. Opening ${formatGHS(statement.opening)}, money in ${formatGHS(statement.moneyIn)}, money out ${formatGHS(statement.moneyOut)}.`}
        action={
          <a
            href={`/api/admin/accounts/export?${periodQuery.toString()}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold"
            style={{ color: "var(--s-brand)" }}
          >
            <Download className="h-4 w-4" /> Excel
          </a>
        }
      >
        {!current.hasOpening && (
          <p className="mx-4 mb-3 rounded-2xl px-3 py-2 text-sm sm:mx-5" style={{ background: "var(--s-warn-soft)", color: "var(--s-warn)" }}>
            Record what {ACCOUNT_LABELS[account].toLowerCase()} holds today as its opening balance (Record movement → Opening
            balance). From then on the balance follows every sale, deposit, expense and wage.
          </p>
        )}
        {statement.lines.length === 0 ? (
          <EmptyState title="No money moved in this period" hint="Pick another period or account." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>What</th>
                <th className="num">In</th>
                <th className="num">Out</th>
                <th className="num">Balance</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="muted" colSpan={4}>
                  Opening balance
                </td>
                <td className="num font-semibold">{formatGHS(statement.opening)}</td>
                <td />
              </tr>
              {statement.lines.map((line, index) => (
                <tr key={`${line.at.toISOString()}-${index}`}>
                  <td className="muted whitespace-nowrap">
                    {line.at.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" })}
                  </td>
                  <td>
                    {line.href ? (
                      <Link href={line.href} className="hover:underline">
                        {line.label}
                      </Link>
                    ) : (
                      line.label
                    )}
                    {line.opening && (
                      <span className="ml-2">
                        <Chip tone="neutral">Balance set</Chip>
                      </span>
                    )}
                  </td>
                  <td className="num">{line.direction === "IN" && !line.opening ? formatGHS(line.amount) : ""}</td>
                  <td className="num">{line.direction === "OUT" ? formatGHS(line.amount) : ""}</td>
                  <td className="num font-semibold">{formatGHS(line.balance)}</td>
                  <td className="w-10 text-right">{line.entryId && <DeleteEntryButton id={line.entryId} label={line.label} />}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="font-bold">
                  Closing balance
                </td>
                <td className="num font-bold">{formatGHS(statement.closing)}</td>
                <td />
              </tr>
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
