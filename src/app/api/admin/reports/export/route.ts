import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireResource } from "@/lib/api-auth";
import { getMonthlyReport } from "@/lib/reports";
import { getSessionsForMonth } from "@/lib/report-sessions";
import { PAYMENT_LABELS } from "@/components/admin/labels";

/**
 * Download a month's figures as a spreadsheet.
 *
 * XLSX so the accountant can open it and keep the number formatting, or CSV for
 * anything that only speaks plain text. Same numbers as the on-screen report —
 * both read getMonthlyReport, so an exported figure can never disagree with the
 * one Karim was looking at when he clicked Export.
 */
export async function GET(request: Request) {
  const auth = await requireResource("reports");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Bad month" }, { status: 400 });
  }

  const [report, sessions] = await Promise.all([
    getMonthlyReport(month),
    getSessionsForMonth(month),
  ]);

  if (format === "csv") {
    const rows: string[] = [];
    const line = (...cells: (string | number)[]) =>
      rows.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));

    line(`Anis — ${month}`);
    line("");
    line("PROFIT & LOSS");
    line("Revenue", report.revenue);
    line("Cost of items sold", report.cogs);
    line("Gross profit", report.grossProfit);
    line("Expenses", report.expenses);
    line("Payroll", report.payroll);
    line("Net profit", report.netProfit);
    line("");
    line("DAILY SALES");
    line("Day", "Orders", "Revenue");
    for (const day of report.dailySales) line(day.day, day.orders, day.revenue);
    line("");
    line("PAYMENT BREAKDOWN");
    for (const entry of report.paymentBreakdown) {
      line(PAYMENT_LABELS[entry.method] ?? entry.method, entry.amount);
    }
    line("");
    line("SHIFTS");
    line("Day", "Cashier", "Expected", "Counted", "Difference");
    for (const s of sessions) {
      line(s.businessDay, s.openedBy, s.expectedCash ?? "", s.closingCash ?? "", s.differenceLabel);
    }

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="anis-${month}.csv"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Anis Back Office";

  const money = '#,##0.00';

  const pl = workbook.addWorksheet("P&L");
  pl.columns = [{ width: 24 }, { width: 16 }];
  pl.addRow([`Anis — ${month}`]);
  pl.getRow(1).font = { bold: true, size: 14 };
  pl.addRow([]);
  const plRows: [string, number][] = [
    ["Revenue", report.revenue],
    ["Cost of items sold", report.cogs],
    ["Gross profit", report.grossProfit],
    ["Expenses", report.expenses],
    ["Payroll", report.payroll],
    ["Net profit", report.netProfit],
  ];
  for (const [label, value] of plRows) {
    const row = pl.addRow([label, value]);
    row.getCell(2).numFmt = money;
    if (label === "Net profit" || label === "Gross profit") row.font = { bold: true };
  }

  const sales = workbook.addWorksheet("Daily sales");
  sales.columns = [
    { header: "Day", key: "day", width: 14 },
    { header: "Orders", key: "orders", width: 10 },
    { header: "Revenue", key: "revenue", width: 16, style: { numFmt: money } },
  ];
  sales.getRow(1).font = { bold: true };
  for (const day of report.dailySales) sales.addRow(day);

  const items = workbook.addWorksheet("Top items");
  items.columns = [
    { header: "Item", key: "name", width: 36 },
    { header: "Sold", key: "quantity", width: 10 },
    { header: "Revenue", key: "revenue", width: 16, style: { numFmt: money } },
  ];
  items.getRow(1).font = { bold: true };
  for (const item of report.topItems) items.addRow(item);

  const shifts = workbook.addWorksheet("Shifts");
  shifts.columns = [
    { header: "Day", key: "day", width: 14 },
    { header: "Cashier", key: "cashier", width: 20 },
    { header: "Expected", key: "expected", width: 14, style: { numFmt: money } },
    { header: "Counted", key: "counted", width: 14, style: { numFmt: money } },
    { header: "Difference", key: "difference", width: 20 },
  ];
  shifts.getRow(1).font = { bold: true };
  for (const s of sessions) {
    shifts.addRow({
      day: s.businessDay,
      cashier: s.openedBy,
      expected: s.expectedCash ?? undefined,
      counted: s.closingCash ?? undefined,
      difference: s.differenceLabel,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="anis-${month}.xlsx"`,
    },
  });
}
