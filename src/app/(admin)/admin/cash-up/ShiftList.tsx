"use client";

import { useState } from "react";
import { ChevronDown, FileText, Printer } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { printReceiptNow } from "@/lib/receipt-print";
import type { CashUpShift } from "@/lib/report-sessions";
import { SlipRows, Row } from "@/components/pos/XReportSheet";
import { AdminButton, Chip, Dialog, Panel } from "@/components/admin/ui";
import { PAYMENT_LABELS } from "@/components/admin/labels";

function time(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Africa/Accra", hour: "2-digit", minute: "2-digit" });
}

function dayLabel(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function tone(difference: number | null) {
  if (difference === null) return "neutral" as const;
  if (difference === 0) return "good" as const;
  return difference < 0 ? ("bad" as const) : ("warn" as const);
}

function momoLabel(difference: number | null) {
  if (difference === null) return "Balance not checked";
  if (difference === 0) return "Balanced";
  return `${difference < 0 ? "Short" : "Over"} by ${formatGHS(Math.abs(difference))}`;
}

export default function ShiftList({ shifts, businessName }: { shifts: CashUpShift[]; businessName: string }) {
  const [printing, setPrinting] = useState<CashUpShift | null>(null);

  return (
    <>
      {shifts.map((shift) => (
        <ShiftCard key={shift.summary.id} shift={shift} onReport={() => setPrinting(shift)} />
      ))}

      <Dialog
        open={printing !== null}
        title={printing?.summary.status === "OPEN" ? "X report" : "Shift report"}
        description={printing?.summary.status === "OPEN" ? "This shift is still open. Reading only." : undefined}
        onClose={() => setPrinting(null)}
        footer={
          <AdminButton variant="primary" onClick={() => printReceiptNow()}>
            <Printer className="h-4 w-4" /> Print
          </AdminButton>
        }
      >
        {printing && <ShiftSlip shift={printing} businessName={businessName} />}
      </Dialog>
    </>
  );
}

/** The same slip the till prints, plus the close: what was counted and the difference. */
function ShiftSlip({ shift, businessName }: { shift: CashUpShift; businessName: string }) {
  const { summary, report } = shift;
  const closed = summary.status === "CLOSED";
  return (
    <div data-anis-receipt className="anis-receipt anis-receipt--preview">
      <div className="r-center">
        <div className="r-title">{businessName}</div>
        <div className="r-title">{closed ? "Z REPORT" : "X REPORT"}</div>
        <div className="r-small">Opened by {summary.openedBy.name} · {time(summary.openedAt)}</div>
        {closed && (
          <div className="r-small">
            Closed{summary.closedBy ? ` by ${summary.closedBy.name}` : ""} · {time(summary.closedAt)}
          </div>
        )}
        <div className="r-small">{dayLabel(summary.businessDay)}</div>
      </div>
      <div className="r-rule" />
      <SlipRows report={report} />
      {closed && (
        <>
          <div className="r-rule" />
          <Row label="Cash counted" value={summary.closingCash === null ? "Not counted" : formatGHS(summary.closingCash)} />
          <Row label="Cash difference" value={summary.differenceLabel} strong />
          <Row label="MoMo counted" value={summary.closingMomo === null ? "Not checked" : formatGHS(summary.closingMomo)} />
          <Row label="MoMo difference" value={momoLabel(shift.momoDifference)} />
        </>
      )}
    </div>
  );
}

function ShiftCard({ shift, onReport }: { shift: CashUpShift; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  const { summary, report } = shift;
  const denominations = Object.entries(summary.cashCount ?? {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[0]) - Number(a[0]));

  const figures: [string, string, string][] = [
    ["Taken", formatGHS(summary.takings.gross), `${summary.takings.orderCount} paid orders`],
    ["Cash should be", formatGHS(summary.expectedCash), `Float ${formatGHS(summary.openingFloat)}`],
    [
      "Cash counted",
      summary.closingCash === null ? "—" : formatGHS(summary.closingCash),
      summary.status === "OPEN" ? "Not closed yet" : "",
    ],
    ["MoMo taken", formatGHS(summary.takings.momo), momoLabel(shift.momoDifference)],
  ];

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <p className="font-bold">
            {dayLabel(summary.businessDay)}
            <span className="ml-2 text-sm font-medium" style={{ color: "var(--s-ink-muted)" }}>
              {time(summary.openedAt)} – {summary.closedAt ? time(summary.closedAt) : "now"}
            </span>
          </p>
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Opened by {summary.openedBy.name}
            {summary.closedBy && ` · closed by ${summary.closedBy.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary.status === "OPEN" ? (
            <Chip tone={summary.isStale ? "bad" : "good"}>{summary.isStale ? "Left open" : "Open now"}</Chip>
          ) : (
            <Chip tone={tone(summary.difference)}>{summary.differenceLabel}</Chip>
          )}
          <AdminButton onClick={onReport} className="!min-h-10 px-3 py-1.5">
            <FileText className="h-4 w-4" /> {summary.status === "OPEN" ? "X report" : "Report"}
          </AdminButton>
        </div>
      </div>

      <dl
        className="mt-3 grid grid-cols-2 gap-px border-y sm:grid-cols-4"
        style={{ borderColor: "var(--s-border)", background: "var(--s-border)" }}
      >
        {figures.map(([label, value, sub]) => (
          <div key={label} className="px-4 py-3 sm:px-5" style={{ background: "var(--s-panel)" }}>
            <dt className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
              {label}
            </dt>
            <dd className="money mt-0.5 font-bold">{value}</dd>
            {sub && (
              <dd className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                {sub}
              </dd>
            )}
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-b-[var(--s-radius)] px-4 py-2.5 text-sm font-semibold sm:px-5"
        style={{ color: "var(--s-ink-muted)" }}
        aria-expanded={open}
      >
        Payment split, money in and out, notes counted
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="grid gap-5 border-t px-4 py-4 text-sm sm:grid-cols-3 sm:px-5" style={{ borderColor: "var(--s-border)" }}>
          <Detail title="Payment split">
            {report.byTender.length === 0 ? (
              <Muted>No paid sales.</Muted>
            ) : (
              report.byTender.map((entry) => (
                <Pair key={entry.method} label={PAYMENT_LABELS[entry.method] ?? entry.method} value={formatGHS(entry.amount)} />
              ))
            )}
            {(report.voids.count > 0 || report.refunds.count > 0) && (
              <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--s-border)" }}>
                <Pair label={`Voids · ${report.voids.count}`} value={formatGHS(report.voids.amount)} />
                <Pair label={`Refunds · ${report.refunds.count}`} value={formatGHS(report.refunds.amount)} />
              </div>
            )}
          </Detail>
          <Detail title="Money in and out">
            {summary.movements.length === 0 ? (
              <Muted>None.</Muted>
            ) : (
              summary.movements.map((movement) => (
                <div key={movement.id} className="flex justify-between gap-3" title={`${movement.reason} · ${movement.by}`}>
                  <span className="min-w-0 truncate" style={{ color: "var(--s-ink-muted)" }}>
                    {movement.kind === "DEPOSIT"
                      ? `Deposit${movement.destination ? ` to ${movement.destination === "MOMO" ? "MoMo" : "bank"}` : ""}`
                      : movement.reason}
                  </span>
                  <span
                    className="money whitespace-nowrap"
                    style={{ color: movement.direction === "IN" ? "var(--s-good)" : "var(--s-bad)" }}
                  >
                    {movement.direction === "IN" ? "+" : "−"}
                    {formatGHS(movement.amount)}
                  </span>
                </div>
              ))
            )}
          </Detail>
          <Detail title="Notes counted">
            {denominations.length === 0 ? (
              <Muted>{summary.status === "OPEN" ? "Counted at close." : "Total typed, no breakdown."}</Muted>
            ) : (
              denominations.map(([denomination, count]) => (
                <Pair
                  key={denomination}
                  label={`GH₵${denomination} × ${count}`}
                  value={formatGHS(Number(denomination) * Number(count))}
                />
              ))
            )}
          </Detail>
        </div>
      )}
    </Panel>
  );
}

function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--s-ink-faint)" }}>
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: "var(--s-ink-muted)" }}>{label}</span>
      <span className="money">{value}</span>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--s-ink-faint)" }}>{children}</p>;
}
