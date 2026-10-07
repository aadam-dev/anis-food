import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireResource } from "@/lib/api-auth";
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
    ["Net profit", ledger.netProfit, true],
  ];
  const memoRows: [string, number, number?][] = [
    ["Discounts given (already off takings)", ledger.discounts, ledger.discountedOrders],
    ["Voids", ledger.voids.amount, ledger.voids.count],
    ["Refunds", ledger.refunds.amount, ledger.refunds.count],
    ["Deposited to MoMo", ledger.deposits.momo],
    ["Deposited to bank", ledger.deposits.bank],
    ["Bolt awaiting payout", ledger.boltAwaiting.amount, ledger.boltAwaiting.count],
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Anis Back Office";
  const money = "#,##0.00;[Red]-#,##0.00";

  const pl = workbook.addWorksheet("P&L");
  pl.columns = [{ width: 40 }, { width: 16 }, { width: 10 }];
  pl.addRow([title]).font = { bold: true, size: 14 };
  pl.addRow([]);
  for (const [name, value, bold] of plRows) {
    const row = pl.addRow([name, value]);
    row.getCell(2).numFmt = money;
    if (bold) row.font = { bold: true };
  }
  pl.addRow([`Cost price coverage: ${ledger.cogsCoverage}% of item sales`]).font = { italic: true };
  pl.addRow([]);
  pl.addRow(["Outside the profit figure", "Amount", "Count"]).font = { bold: true };
  for (const [name, value, count] of memoRows) {
    const row = pl.addRow([name, value, count ?? ""]);
    row.getCell(2).numFmt = money;
  }

  const sales = workbook.addWorksheet("Daily sales");
  sales.columns = [
    { header: "Day", key: "day", width: 14 },
    { header: "Orders", key: "orders", width: 10 },
    { header: showTax ? "Net sales" : "Sales", key: "revenue", width: 16, style: { numFmt: money } },
  ];
  sales.getRow(1).font = { bold: true };
  for (const day of ledger.daily) sales.addRow(day);

  const items = workbook.addWorksheet("Top items");
  items.columns = [
    { header: "Item", key: "name", width: 36 },
    { header: "Sold", key: "quantity", width: 10 },
    { header: "Sales", key: "revenue", width: 16, style: { numFmt: money } },
  ];
  items.getRow(1).font = { bold: true };
  for (const item of ledger.topItems) items.addRow(item);

  const payments = workbook.addWorksheet("Payments");
  payments.columns = [
    { header: "Method", key: "method", width: 20 },
    { header: "Amount", key: "amount", width: 16, style: { numFmt: money } },
  ];
  payments.getRow(1).font = { bold: true };
  for (const entry of ledger.paymentMix) {
    payments.addRow({ method: PAYMENT_LABELS[entry.method] ?? entry.method, amount: entry.amount });
  }

  const refunds = workbook.addWorksheet("Refunds");
  refunds.columns = [
    { header: "Reason", key: "reason", width: 24 },
    { header: "Orders", key: "count", width: 10 },
    { header: "Value", key: "amount", width: 16, style: { numFmt: money } },
  ];
  refunds.getRow(1).font = { bold: true };
  for (const row of ledger.refunds.byReason) {
    refunds.addRow({ reason: VOID_REASON_LABELS[row.reason] ?? row.reason, count: row.count, amount: row.amount });
  }

  const cashUp = workbook.addWorksheet("Cash-up");
  cashUp.columns = [
    { header: "Day", key: "day", width: 14 },
    { header: "Cashier", key: "cashier", width: 20 },
    { header: "Closed by", key: "closedBy", width: 20 },
    { header: "Float", key: "float", width: 12, style: { numFmt: money } },
    { header: "Expected cash", key: "expected", width: 14, style: { numFmt: money } },
    { header: "Counted cash", key: "counted", width: 14, style: { numFmt: money } },
    { header: "Difference", key: "difference", width: 22 },
    { header: "MoMo expected", key: "momoExpected", width: 14, style: { numFmt: money } },
    { header: "MoMo counted", key: "momoCounted", width: 14, style: { numFmt: money } },
  ];
  cashUp.getRow(1).font = { bold: true };
  for (const s of shifts) {
    cashUp.addRow({
      day: s.businessDay,
      cashier: s.openedBy,
      closedBy: s.closedBy ?? (s.status === "OPEN" ? "(still open)" : ""),
      float: s.openingFloat,
      expected: s.expectedCash ?? undefined,
      counted: s.closingCash ?? undefined,
      difference: s.differenceLabel,
      momoExpected: s.expectedMomo ?? undefined,
      momoCounted: s.closingMomo ?? undefined,
    });
  }

  if (showTax) {
    const vatSheet = workbook.addWorksheet("VAT return");
    vatSheet.columns = [{ width: 28 }, { width: 16 }];
    vatSheet.addRow([`VAT return — ${period.from} to ${period.to}`]).font = { bold: true, size: 14 };
    vatSheet.addRow([]);
    vatSheet.addRow(["Taxable sales (excl. tax)", vat.taxable]).getCell(2).numFmt = money;
    for (const levy of vat.byLevy) vatSheet.addRow([levy.label, levy.amount]).getCell(2).numFmt = money;
    const total = vatSheet.addRow(["Total tax collected", vat.taxTotal]);
    total.getCell(2).numFmt = money;
    total.font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="anis-${label}.xlsx"`,
    },
  });
}
