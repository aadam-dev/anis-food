import "server-only";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

/**
 * One look for every spreadsheet the back office hands out: the business name
 * and period across the top, a coloured header row that stays put when you
 * scroll, money in cedis, a totals row, and a page set up to print. An
 * accountant opening any of them should see the same tidy document.
 */

const BRAND = "FFD40D06";
const BRAND_SOFT = "FFFBEAE9";
const ZEBRA = "FFFAF7F3";
const TOTAL_FILL = "FFF3EDE6";
const RULE = "FFE7E1D9";
const INK_SOFT = "FF6B6560";

export const MONEY_FORMAT = '"GH₵"#,##0.00;[Red]-"GH₵"#,##0.00';
const FORMATS = {
  money: MONEY_FORMAT,
  number: "#,##0",
  decimal: "#,##0.00",
  percent: "0.0%",
  date: "dd mmm yyyy",
  datetime: "dd mmm yyyy hh:mm",
  time: "hh:mm",
  text: "@",
} as const;

export type ColumnType = keyof typeof FORMATS;

export interface Column<Row> {
  header: string;
  /** Read the value for this column from a row. */
  value: (row: Row) => string | number | Date | boolean | null | undefined;
  type?: ColumnType;
  width?: number;
  /** Sum this column in the totals row. */
  total?: boolean;
}

export interface Meta {
  business: string;
  /** e.g. "Sales, 1 – 31 Oct 2026" */
  period: string;
  generatedBy?: string | null;
}

export class Report {
  readonly book = new ExcelJS.Workbook();

  constructor(private readonly meta: Meta) {
    this.book.creator = meta.business;
    this.book.created = new Date();
  }

  /** The three-line title band every sheet starts with. Returns the next free row. */
  private band(sheet: ExcelJS.Worksheet, title: string, span: number, note?: string): number {
    const lastCol = Math.max(span, 2);
    const line = (rowNumber: number, text: string, font: Partial<ExcelJS.Font>, height?: number) => {
      sheet.mergeCells(rowNumber, 1, rowNumber, lastCol);
      const cell = sheet.getCell(rowNumber, 1);
      cell.value = text;
      cell.font = { name: "Calibri", ...font };
      cell.alignment = { vertical: "middle" };
      if (height) sheet.getRow(rowNumber).height = height;
    };
    line(1, this.meta.business.toUpperCase(), { bold: true, size: 11, color: { argb: BRAND } }, 18);
    line(2, title, { bold: true, size: 16 }, 26);
    const generated = new Date().toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Accra",
    });
    line(
      3,
      `${this.meta.period}  ·  Generated ${generated}${this.meta.generatedBy ? ` by ${this.meta.generatedBy}` : ""}`,
      { italic: true, size: 10, color: { argb: INK_SOFT } },
    );
    let next = 4;
    if (note) {
      line(4, note, { size: 10, color: { argb: INK_SOFT } });
      next = 5;
    }
    return next + 1;
  }

  private setup(sheet: ExcelJS.Worksheet, columns: number, headerRow: number) {
    sheet.pageSetup = {
      orientation: columns > 6 ? "landscape" : "portrait",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
      printTitlesRow: `${headerRow}:${headerRow}`,
    };
    sheet.headerFooter.oddFooter = `&L&8${this.meta.business}&C&8${this.meta.period}&R&8Page &P of &N`;
  }

  /** A sheet that is one table: title band, header, rows, optional totals. */
  table<Row>(
    name: string,
    options: { title: string; columns: Column<Row>[]; rows: Row[]; totals?: boolean; note?: string; tab?: string; empty?: string },
  ): ExcelJS.Worksheet {
    const sheet = this.book.addWorksheet(name.slice(0, 31), {
      properties: { tabColor: { argb: options.tab ?? BRAND } },
      views: [{ showGridLines: false }],
    });
    const { columns, rows } = options;
    const headerRow = this.band(sheet, options.title, columns.length, options.note);

    const header = sheet.getRow(headerRow);
    columns.forEach((column, index) => {
      const cell = header.getCell(index + 1);
      cell.value = column.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
      cell.alignment = {
        vertical: "middle",
        horizontal: column.type && column.type !== "text" ? "right" : "left",
        wrapText: true,
      };
    });
    header.height = 24;

    rows.forEach((row, rowIndex) => {
      const excelRow = sheet.getRow(headerRow + 1 + rowIndex);
      columns.forEach((column, index) => {
        const cell = excelRow.getCell(index + 1);
        const raw = column.value(row);
        cell.value = raw === undefined || raw === null || raw === "" ? null : (raw as ExcelJS.CellValue);
        if (column.type) cell.numFmt = FORMATS[column.type];
        cell.border = { bottom: { style: "thin", color: { argb: RULE } } };
        cell.alignment = { vertical: "middle", horizontal: column.type && column.type !== "text" ? "right" : "left" };
        if (rowIndex % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      });
    });

    if (rows.length === 0) {
      const cell = sheet.getCell(headerRow + 1, 1);
      cell.value = options.empty ?? "Nothing in this period.";
      cell.font = { italic: true, color: { argb: INK_SOFT } };
    }

    if (options.totals && rows.length > 0) {
      const totalRow = sheet.getRow(headerRow + rows.length + 1);
      const first = headerRow + 1;
      const last = headerRow + rows.length;
      columns.forEach((column, index) => {
        const cell = totalRow.getCell(index + 1);
        if (index === 0) cell.value = "Total";
        else if (column.total) {
          const letter = sheet.getColumn(index + 1).letter;
          cell.value = { formula: `SUM(${letter}${first}:${letter}${last})` };
          if (column.type) cell.numFmt = FORMATS[column.type];
        }
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
        cell.border = { top: { style: "medium", color: { argb: "FF1A1D1F" } } };
        cell.alignment = { horizontal: column.type && column.type !== "text" && index > 0 ? "right" : "left" };
      });
      totalRow.height = 20;
    }

    // Widths from the content, so nothing is cut off and nothing sprawls.
    columns.forEach((column, index) => {
      const sample = rows.slice(0, 500).map((row) => {
        const value = column.value(row);
        if (value instanceof Date) return 18;
        if (typeof value === "number") return column.type === "money" ? String(value.toFixed(2)).length + 6 : String(value).length + 2;
        return String(value ?? "").length;
      });
      const widest = Math.max(column.header.length + 2, ...sample, 8);
      sheet.getColumn(index + 1).width = column.width ?? Math.min(widest + 2, 48);
    });

    sheet.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];
    if (rows.length > 0) {
      sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + rows.length, column: columns.length } };
    }
    this.setup(sheet, columns.length, headerRow);
    return sheet;
  }

  /**
   * A summary sheet: label and value pairs in sections, for P&L-style pages.
   * A row with `strong` is a subtotal; a string row starts a new section.
   */
  summary(
    name: string,
    options: {
      title: string;
      note?: string;
      rows: (string | { label: string; value: number | string | null; type?: ColumnType; strong?: boolean; detail?: string })[];
    },
  ): ExcelJS.Worksheet {
    const sheet = this.book.addWorksheet(name.slice(0, 31), {
      properties: { tabColor: { argb: "FF1A1D1F" } },
      views: [{ showGridLines: false }],
    });
    let rowNumber = this.band(sheet, options.title, 3, options.note);
    for (const entry of options.rows) {
      const row = sheet.getRow(rowNumber++);
      if (typeof entry === "string") {
        rowNumber++;
        const cell = row.getCell(1);
        cell.value = entry.toUpperCase();
        cell.font = { bold: true, size: 10, color: { argb: BRAND } };
        row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } };
        row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } };
        row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } };
        continue;
      }
      row.getCell(1).value = entry.label;
      const value = row.getCell(2);
      value.value = entry.value;
      value.numFmt = FORMATS[entry.type ?? "money"];
      value.alignment = { horizontal: "right" };
      if (entry.detail) {
        row.getCell(3).value = entry.detail;
        row.getCell(3).font = { size: 9, color: { argb: INK_SOFT } };
      }
      for (const index of [1, 2, 3]) {
        row.getCell(index).border = entry.strong
          ? { top: { style: "thin", color: { argb: "FF1A1D1F" } } }
          : { bottom: { style: "hair", color: { argb: RULE } } };
      }
      if (entry.strong) {
        row.getCell(1).font = { bold: true };
        value.font = { bold: true };
      }
    }
    sheet.getColumn(1).width = 44;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 36;
    this.setup(sheet, 3, 5);
    return sheet;
  }

  /** The finished workbook as a download. */
  async response(filename: string): Promise<NextResponse> {
    const buffer = await this.book.xlsx.writeBuffer();
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]+/g, "-")}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
}

/** "1 – 31 Oct 2026", or a single day. */
export function periodText(from: string, to: string): string {
  const show = (day: string, withYear: boolean) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(withYear && { year: "numeric" }),
      timeZone: "UTC",
    });
  return from === to ? show(from, true) : `${show(from, from.slice(0, 4) !== to.slice(0, 4))} – ${show(to, true)}`;
}
