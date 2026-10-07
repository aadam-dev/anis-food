"use client";

import { useEffect, useState } from "react";
import { formatGHS } from "@/lib/money";
import { PAYMENT_LABELS } from "@/components/admin/labels";
import { printReceiptNow } from "@/lib/receipt-print";
import type { XReport } from "@/lib/x-report";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { posRequest } from "./usePosAction";

/**
 * X report: a mid-shift reading. Printing it does not close the shift or
 * reset any figure. Z-out remains the only close.
 */
export default function XReportSheet({
  businessName,
  onClose,
}: {
  businessName: string;
  onClose: () => void;
}) {
  const [report, setReport] = useState<XReport | null>(null);
  const [when, setWhen] = useState("");
  const [openedBy, setOpenedBy] = useState("");
  const [scope, setScope] = useState<"mine" | "shift">("shift");
  const [cashierName, setCashierName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    posRequest<{
      report: XReport | null;
      businessDay: string;
      openedAt: string;
      openedBy: string;
      scope?: "mine" | "shift";
      cashierName?: string | null;
    }>("/api/pos/x-report", "GET")
      .then((data) => {
        if (!alive) return;
        if (!data.report) {
          setError("Open a shift before printing an X report.");
          return;
        }
        setReport(data.report);
        setOpenedBy(data.openedBy);
        setScope(data.scope === "mine" ? "mine" : "shift");
        setCashierName(data.cashierName ?? null);
        setWhen(
          new Date(data.openedAt).toLocaleString("en-GB", {
            timeZone: "Africa/Accra",
            dateStyle: "medium",
            timeStyle: "short",
          }),
        );
      })
      .catch((caught: unknown) => {
        if (!alive) return;
        setError(caught instanceof Error ? caught.message : "The X report could not be read.");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Sheet
      eyebrow="Does not close the shift"
      title="X report"
      onClose={onClose}
      footer={
        <Button size="lg" className="w-full" disabled={!report} onClick={() => printReceiptNow()}>
          Print X report
        </Button>
      }
    >
      <SheetError message={error} />
      {!report && !error && (
        <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
          Reading this shift…
        </p>
      )}
      {report && (
        <div data-anis-receipt className="anis-receipt anis-receipt--preview">
          <div className="r-center">
            <div className="r-title">{businessName}</div>
            <div className="r-title">X REPORT</div>
            {scope === "mine" && cashierName ? (
              <div className="r-small">My sales · {cashierName}</div>
            ) : (
              <div className="r-small">Opened by {openedBy}</div>
            )}
            <div className="r-small">{when}</div>
            <div className="r-small">Reading only. The shift stays open.</div>
          </div>
          <div className="r-rule" />
          <SlipRows report={report} />
        </div>
      )}
    </Sheet>
  );
}

/** The slip body, shared with the back office's shift reprint (Z report). */
export function SlipRows({ report }: { report: XReport }) {
  return (
    <>
      <Row label="Opening float" value={formatGHS(report.openingFloat)} />
      <Row
        label="Opening MoMo"
        value={report.openingMomo === null ? "Not recorded" : formatGHS(report.openingMomo)}
      />
      <div className="r-rule" />
      <div className="r-small">Sales · {report.salesCount}</div>
      {report.byTender.length === 0 && <Row label="No paid sales yet" value={formatGHS(0)} />}
      {report.byTender.map((entry) => (
        <Row key={entry.method} label={PAYMENT_LABELS[entry.method] ?? entry.method} value={formatGHS(entry.amount)} />
      ))}
      <Row label="Gross sales" value={formatGHS(report.gross)} strong />
      <div className="r-rule" />
      <Row label={`Voids (${report.voids.count})`} value={formatGHS(report.voids.amount)} />
      <Row label={`Refunds (${report.refunds.count})`} value={formatGHS(report.refunds.amount)} />
      <div className="r-rule" />
      <Row label="Cash put in" value={formatGHS(report.cashIn.amount)} />
      {report.cashIn.lines.map((line, index) => (
        <div className="r-note" key={`in-${index}`}>
          {line.reason} {formatGHS(line.amount)}
        </div>
      ))}
      <Row label="Spends" value={formatGHS(report.spends.amount)} />
      {report.spends.lines.map((line, index) => (
        <div className="r-note" key={`spend-${index}`}>
          {line.reason} {formatGHS(line.amount)}
        </div>
      ))}
      <Row label="Deposited to MoMo" value={formatGHS(report.deposits.momo)} />
      <Row label="Deposited to bank" value={formatGHS(report.deposits.bank)} />
      {report.deposits.lines.map((line, index) => (
        <div className="r-note" key={`dep-${index}`}>
          {line.reason}
        </div>
      ))}
      <div className="r-rule" />
      <Row label="Drawer should hold" value={formatGHS(report.expectedCash)} strong />
      <Row
        label="MoMo should be"
        value={report.expectedMomo === null ? "Not recorded" : formatGHS(report.expectedMomo)}
      />
      <div className="r-rule" />
      <Row label={`Unpaid tickets (${report.unpaid.count})`} value={formatGHS(report.unpaid.amount)} />
      {report.boltAwaiting.count > 0 && (
        <Row label={`Bolt, older unpaid (${report.boltAwaiting.count})`} value={formatGHS(report.boltAwaiting.amount)} />
      )}
      <div className="r-small">Bolt sales are paid to Bolt, so they are never in the drawer.</div>
    </>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "r-row r-total" : "r-row"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
