"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { AdminButton, Dialog, Field, Segmented, inputClass, inputStyle } from "./ui";

type Range = "day" | "week" | "last-week" | "month" | "custom";

const today = () => new Date(Date.now()).toISOString().slice(0, 10);

/**
 * Download a spreadsheet for a day, a week, a month or any range. Starts on
 * the period the page is showing, so the common case is two taps.
 */
export default function ExportMenu({
  endpoint,
  label = "Export",
  title = "Export to Excel",
  from,
  to,
  csv = false,
}: {
  /** e.g. /api/admin/sales/export */
  endpoint: string;
  label?: string;
  title?: string;
  /** The period on screen. */
  from: string;
  to: string;
  /** Offer CSV as well as Excel. */
  csv?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<Range>(from === to ? "day" : "custom");
  const [day, setDay] = useState(from === to ? from : today());
  const [month, setMonth] = useState(from.slice(0, 7));
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");

  const query = new URLSearchParams();
  if (range === "day") {
    query.set("from", day);
    query.set("to", day);
  } else if (range === "week" || range === "last-week") {
    query.set("period", range);
  } else if (range === "month") {
    query.set("month", month);
  } else {
    query.set("from", start <= end ? start : end);
    query.set("to", start <= end ? end : start);
  }
  if (format === "csv") query.set("format", "csv");
  const href = `${endpoint}?${query.toString()}`;

  return (
    <>
      <AdminButton onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" /> {label}
      </AdminButton>
      <Dialog
        open={open}
        title={title}
        description="Pick the period. The file opens in Excel, Google Sheets or Numbers."
        onClose={() => setOpen(false)}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </AdminButton>
            <a
              href={href}
              onClick={() => setOpen(false)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--s-brand)" }}
            >
              <Download className="h-4 w-4" /> Download
            </a>
          </>
        }
      >
        <div className="space-y-4">
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "day", label: "A day" },
              { value: "week", label: "This week" },
              { value: "last-week", label: "Last week" },
              { value: "month", label: "A month" },
              { value: "custom", label: "Custom" },
            ]}
          />
          {range === "day" && (
            <Field label="Day">
              <input type="date" value={day} max={today()} onChange={(event) => setDay(event.target.value)} className={inputClass} style={inputStyle} />
            </Field>
          )}
          {range === "month" && (
            <Field label="Month">
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={inputClass} style={inputStyle} />
            </Field>
          )}
          {range === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input type="date" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} style={inputStyle} />
              </Field>
              <Field label="To">
                <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className={inputClass} style={inputStyle} />
              </Field>
            </div>
          )}
          {csv && (
            <Segmented
              value={format}
              onChange={setFormat}
              options={[
                { value: "xlsx", label: "Excel" },
                { value: "csv", label: "CSV (plain text)" },
              ]}
            />
          )}
        </div>
      </Dialog>
    </>
  );
}
