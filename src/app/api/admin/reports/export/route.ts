import { NextResponse } from "next/server";
import { requireResource } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { Report, periodText } from "@/lib/excel";
import { getLedger, getVatReturn } from "@/lib/reports";
import { getShifts } from "@/lib/report-sessions";
import { getSettings, getTaxConfig } from "@/lib/settings";
import { resolvePeriod } from "@/lib/period";
import { PAYMENT_LABELS, VOID_REASON_LABELS } from "@/components/admin/labels";

/**
 * Download a period's figures as a spreadsheet.
 *
 * XLSX so the accountant can open it and keep the number formatting, or CSV for
 * anything that only speaks plain text. Same numbers as the on-screen report —
 * both read getLedger, so an exported figure can never disagree with the one
 * Karim was looking at when he clicked Export. Takes the Reports page's own
 * `period` / `from`+`to` params, and the older `month=` links still work.
 */
export async function GET(request: Request) {
  const auth = await requireResource("reports");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const period = resolvePeriod(Object.fromEntries(url.searchParams), "month");
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const label = period.from === period.to ? period.from : `${period.from}_to_${period.to}`;

  const [ledger, shifts, vat, settings] = await Promise.all([
    getLedger(period.from, period.to),
    getShifts(period.from, period.to),
    getVatReturn(period.from, period.to),
    getSettings(),
  ]);
  const title = `${settings.business_name} — ${period.from} to ${period.to}`;
  // VAT lines appear only once tax is on (or the period really carried tax).
  const showTax = getTaxConfig(settings).enabled || ledger.tax > 0;

  const plRows: [string, number, boolean?][] = [
    ...(showTax
      ? ([
          ["Takings (VAT included)", ledger.takings],
          ["Less VAT & levies", -ledger.tax],
          ["Net sales", ledger.netSales, true],
        ] as [string, number, boolean?][])
      : ([["Sales", ledger.netSales, true]] as [string, number, boolean?][])),
    ["Cost of items sold", -ledger.cogs],
    ["Gross profit", ledger.grossProfit, true],
    ...ledger.expenses.byCategory.map(
      (row) => [`Expense: ${row.category}${row.isFixed ? " (fixed)" : ""}`, -row.amount] as [string, number],
    ),
    ["Till spends with no category", -ledger.tillSpends.amount],
    ["Payroll paid", -ledger.payroll],
    ["Bolt commission", -ledger.platformFees.amount],
    ["Net profit", ledger.netProfit, true],
  ];
  const memoRows: [string, number, number?][] = [
    ["Discounts given (already off takings)", ledger.discounts, ledger.discountedOrders],
    ["Voids", ledger.voids.amount, ledger.voids.count],
    ["Refunds", ledger.refunds.amount, ledger.refunds.count],
    ["Deposited to MoMo", ledger.deposits.momo],
    ["Deposited to bank", ledger.deposits.bank],
    ["Sold on Bolt (in sales above)", ledger.platformFees.sales, ledger.platformFees.count],
  ];

  if (format === "csv") {
    const rows: string[] = [];
    const line = (...cells: (string | number)[]) =>
      rows.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));

    line(title);
    line("");
    line("PROFIT & LOSS");
    for (const [name, value] of plRows) line(name, value);
    line(`Cost price coverage: ${ledger.cogsCoverage}% of item sales`);
    line("");
    line("OUTSIDE THE PROFIT FIGURE", "Amount", "Count");
    for (const [name, value, count] of memoRows) line(name, value, count ?? "");
    line("");
    line("DAILY SALES");
    line("Day", "Orders", showTax ? "Net sales" : "Sales");
    for (const day of ledger.daily) line(day.day, day.orders, day.revenue);
    line("");
    line("PAYMENT BREAKDOWN");
    for (const entry of ledger.paymentMix) line(PAYMENT_LABELS[entry.method] ?? entry.method, entry.amount);
    line("");
    line("REFUNDS BY REASON");
    for (const row of ledger.refunds.byReason) line(VOID_REASON_LABELS[row.reason] ?? row.reason, row.count, row.amount);
    line("");
    line("CASH-UP");
    line("Day", "Cashier", "Expected cash", "Counted cash", "Difference", "MoMo expected", "MoMo counted");
    for (const s of shifts) {
      line(s.businessDay, s.openedBy, s.expectedCash ?? "", s.closingCash ?? "", s.differenceLabel, s.expectedMomo ?? "", s.closingMomo ?? "");
    }
    if (showTax) {
      line("");
      line("VAT RETURN");
      line("Taxable sales (excl. tax)", vat.taxable);
      for (const levy of vat.byLevy) line(levy.label, levy.amount);
      line("Total tax collected", vat.taxTotal);
    }

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="anis-${label}.csv"`,
      },
    });
  }

  const me = await prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } });
  const report = new Report({ business: settings.business_name, period: periodText(period.from, period.to), generatedBy: me?.name });

  report.summary("Profit & loss", {
    title: "Profit & loss",
    note: `Cost prices cover ${ledger.cogsCoverage}% of item sales.${ledger.profitKnown ? "" : " Profit is incomplete until dishes are costed."}`,
    rows: [
      "Sales",
      ...plRows.slice(0, plRows.findIndex(([name]) => name === "Cost of items sold")).map(([name, value, strong]) => ({ label: name, value, strong })),
      "Cost of sales",
      ...plRows
        .slice(plRows.findIndex(([name]) => name === "Cost of items sold"), plRows.findIndex(([name]) => name === "Gross profit") + 1)
        .map(([name, value, strong]) => ({ label: name, value, strong })),
      "Overheads",
      ...plRows
        .slice(plRows.findIndex(([name]) => name === "Gross profit") + 1)
        .filter(([name, value]) => name === "Net profit" || value !== 0)
        .map(([name, value, strong]) => ({ label: name, value, strong })),
      "Outside the profit figure",
      ...memoRows.map(([name, value, count]) => ({ label: name, value, detail: count !== undefined ? `${count} order${count === 1 ? "" : "s"}` : undefined })),
    ],
  });

  report.table("Daily sales", {
    title: "Sales by day",
    totals: true,
    columns: [
      { header: "Day", value: (day) => new Date(`${day.day}T12:00:00Z`), type: "date" },
      { header: "Orders", value: (day) => day.orders, type: "number", total: true },
      { header: showTax ? "Net sales" : "Sales", value: (day) => day.revenue, type: "money", total: true },
      { header: "Average order", value: (day) => (day.orders ? day.revenue / day.orders : 0), type: "money" },
    ],
    rows: ledger.daily,
  });

  report.table("Top items", {
    title: "Best-selling items",
    totals: true,
    columns: [
      { header: "Item", value: (item) => item.name },
      { header: "Sold", value: (item) => item.quantity, type: "number", total: true },
      { header: "Sales", value: (item) => item.revenue, type: "money", total: true },
    ],
    rows: ledger.topItems,
  });

  report.table("Payments", {
    title: "How customers paid",
    totals: true,
    columns: [
      { header: "Method", value: (entry) => PAYMENT_LABELS[entry.method] ?? entry.method },
      { header: "Amount", value: (entry) => entry.amount, type: "money", total: true },
      { header: "Share", value: (entry) => (ledger.takings ? entry.amount / ledger.takings : 0), type: "percent" },
    ],
    rows: ledger.paymentMix,
  });

  report.table("Refunds", {
    title: "Refunds by reason",
    totals: true,
    empty: "No refunds in this period.",
    columns: [
      { header: "Reason", value: (row) => VOID_REASON_LABELS[row.reason] ?? row.reason },
      { header: "Orders", value: (row) => row.count, type: "number", total: true },
      { header: "Value", value: (row) => row.amount, type: "money", total: true },
    ],
    rows: ledger.refunds.byReason,
  });

  report.table("Cash-up", {
    title: "Cash-up by shift",
    columns: [
      { header: "Day", value: (s) => new Date(`${s.businessDay}T12:00:00Z`), type: "date" },
      { header: "Opened by", value: (s) => s.openedBy },
      { header: "Closed by", value: (s) => s.closedBy ?? (s.status === "OPEN" ? "(still open)" : "") },
      { header: "Float", value: (s) => s.openingFloat, type: "money" },
      { header: "Expected cash", value: (s) => s.expectedCash, type: "money" },
      { header: "Counted cash", value: (s) => s.closingCash, type: "money" },
      { header: "Difference", value: (s) => s.differenceLabel },
      { header: "MoMo expected", value: (s) => s.expectedMomo, type: "money" },
      { header: "MoMo counted", value: (s) => s.closingMomo, type: "money" },
    ],
    rows: shifts,
  });

  if (showTax) {
    report.summary("VAT return", {
      title: "VAT return",
      rows: [
        { label: "Taxable sales (excl. tax)", value: vat.taxable },
        ...vat.byLevy.map((levy) => ({ label: levy.label, value: levy.amount })),
        { label: "Total tax collected", value: vat.taxTotal, strong: true },
      ],
    });
  }

  return report.response(`anis-report-${label}`);
}
