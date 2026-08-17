"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { businessDay } from "@/lib/session-utils";
import { Panel, EmptyState, Chip, AdminButton, Field, inputClass, inputStyle } from "@/components/admin/ui";
import { PAYROLL_STATUS_LABELS } from "@/components/admin/labels";

export interface PayableStaff {
  id: string;
  name: string;
  defaultSalary: number;
}

export interface PayrollRecordView {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  bonuses: number;
  deductions: number;
  netAmount: number;
  status: string;
}

const STATUS_TONE: Record<string, "neutral" | "good" | "warn"> = {
  DRAFT: "neutral",
  APPROVED: "warn",
  PAID: "good",
};

export default function PayrollClient({
  records,
  payable,
}: {
  records: PayrollRecordView[];
  payable: PayableStaff[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const paidTotal = records
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.netAmount, 0);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Chip tone="good">{formatGHS(paidTotal)} paid all-time</Chip>
        <AdminButton variant="primary" onClick={() => setAdding(true)} className="ml-auto">
          <Plus className="w-4 h-4" /> New payroll
        </AdminButton>
      </div>

      <Panel>
        {records.length === 0 ? (
          <EmptyState title="No payroll yet" hint="Create one with the button above." />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {records.map((record) => (
              <PayrollRow key={record.id} record={record} onChanged={() => router.refresh()} />
            ))}
          </ul>
        )}
      </Panel>

      {adding && (
        <AddDialog
          payable={payable}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function PayrollRow({ record, onChanged }: { record: PayrollRecordView; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function advance(status: string) {
    setBusy(true);
    await fetch(`/api/admin/payroll/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    onChanged();
  }

  return (
    <li className="px-4 py-3 sm:px-5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium flex items-center gap-2">
          {record.name}
          <Chip tone={STATUS_TONE[record.status]}>{PAYROLL_STATUS_LABELS[record.status]}</Chip>
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--s-ink-faint)" }}>
          {new Date(`${record.periodStart}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {" – "}
          {new Date(`${record.periodEnd}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {record.bonuses > 0 ? ` · +${formatGHS(record.bonuses)}` : ""}
          {record.deductions > 0 ? ` · −${formatGHS(record.deductions)}` : ""}
        </p>
      </div>
      <span className="money font-semibold whitespace-nowrap">{formatGHS(record.netAmount)}</span>
      {record.status !== "PAID" && (
        <button
          disabled={busy}
          onClick={() => advance(record.status === "DRAFT" ? "APPROVED" : "PAID")}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white min-h-9 disabled:opacity-50"
          style={{ background: "var(--s-brand)" }}
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {record.status === "DRAFT" ? "Approve" : "Mark paid"}
        </button>
      )}
    </li>
  );
}

function AddDialog({
  payable,
  onClose,
  onDone,
}: {
  payable: PayableStaff[];
  onClose: () => void;
  onDone: () => void;
}) {
  const today = businessDay();
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [userId, setUserId] = useState(payable[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [baseAmount, setBaseAmount] = useState(
    payable[0]?.defaultSalary ? String(payable[0].defaultSalary) : "",
  );
  const [bonuses, setBonuses] = useState("");
  const [deductions, setDeductions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const net =
    (Number(baseAmount) || 0) + (Number(bonuses) || 0) - (Number(deductions) || 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          periodStart,
          periodEnd,
          baseAmount: Number(baseAmount) || 0,
          bonuses: Number(bonuses) || 0,
          deductions: Number(deductions) || 0,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not create that.");
        setBusy(false);
        return;
      }
      onDone();
    } catch {
      setError("No connection. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border p-5 space-y-3"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <h2 className="font-bold">New payroll</h2>

        <Field label="Staff member">
          <select
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              const found = payable.find((p) => p.id === event.target.value);
              if (found?.defaultSalary) setBaseAmount(String(found.defaultSalary));
            }}
            className={inputClass}
            style={inputStyle}
          >
            {payable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Period start">
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Period end">
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Base">
            <input inputMode="decimal" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money text-right`} style={inputStyle} />
          </Field>
          <Field label="Bonus">
            <input inputMode="decimal" value={bonuses} onChange={(e) => setBonuses(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" className={`${inputClass} money text-right`} style={inputStyle} />
          </Field>
          <Field label="Deduct">
            <input inputMode="decimal" value={deductions} onChange={(e) => setDeductions(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" className={`${inputClass} money text-right`} style={inputStyle} />
          </Field>
        </div>

        <div className="flex justify-between items-baseline rounded-lg px-3 py-2.5" style={{ background: "var(--s-hover)" }}>
          <span className="text-sm font-medium">Net pay</span>
          <span className="money text-lg font-bold">{formatGHS(net)}</span>
        </div>

        {error && <p className="text-sm" style={{ color: "var(--s-bad)" }}>{error}</p>}

        <div className="flex gap-2 pt-1">
          <AdminButton onClick={onClose} className="flex-1">Cancel</AdminButton>
          <button
            onClick={submit}
            disabled={busy || !userId || !baseAmount}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white min-h-11 disabled:opacity-50"
            style={{ background: "var(--s-brand)" }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Create draft
          </button>
        </div>
      </div>
    </div>
  );
}
