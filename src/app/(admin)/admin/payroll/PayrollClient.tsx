"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCent, CheckCheck, FileText, Pencil, Play, Printer, Settings2, Trash2 } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { printReceiptNow } from "@/lib/receipt-print";
import { payLine, SALARY_UNITS, SSNIT_EMPLOYEE_RATE, SSNIT_EMPLOYER_RATE, type SalaryType } from "@/lib/payroll";
import {
  AdminButton,
  Chip,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Field,
  Panel,
  Table,
  inputClass,
  inputStyle,
} from "@/components/admin/ui";
import { PAYROLL_STATUS_LABELS } from "@/components/admin/labels";

export interface PayableStaff {
  id: string;
  name: string;
  role: string;
  salaryType: SalaryType;
  rate: number;
  phone: string | null;
  momoNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  /** Registered with SSNIT (set on their Staff record). */
  ssnit: boolean;
  /** Days the till saw them working this month; null when they have no till login. */
  daysWorked: number | null;
}

export interface PayrollRecordView {
  id: string;
  name: string;
  role: string;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  bonuses: number;
  deductions: number;
  netAmount: number;
  status: string;
  paidAt: string | null;
  notes: string | null;
  payTo: string | null;
  paidFrom: string | null;
}

/** Where wages can come from, best first. */
const PAID_FROM = [
  { value: "SAFE", label: "Cash (safe)", hint: "Cash kept outside the till. Count it out, get the payslip signed." },
  { value: "MOMO", label: "MoMo", hint: "Sent to their MoMo number. Traceable, nothing to count." },
  { value: "BANK", label: "Bank transfer", hint: "Paid into their account. Traceable, nothing to count." },
  { value: "TILL", label: "From the till", hint: "Out of today's drawer. The Z report expects it; do it before counting." },
] as const;
type PaidFrom = (typeof PAID_FROM)[number]["value"];
const PAID_FROM_LABEL: Record<string, string> = Object.fromEntries(PAID_FROM.map((entry) => [entry.value, entry.label]));

const STATUS_TONE: Record<string, "neutral" | "good" | "warn"> = {
  DRAFT: "neutral",
  APPROVED: "warn",
  PAID: "good",
};

function shortDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
}

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "That did not save.");
  return data;
}

export default function PayrollClient({
  records,
  payable,
  runFrom,
  runTo,
  businessName,
  tillOpen,
  ssnitEnabled,
}: {
  records: PayrollRecordView[];
  payable: PayableStaff[];
  runFrom: string;
  runTo: string;
  businessName: string;
  tillOpen: boolean;
  ssnitEnabled: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [rates, setRates] = useState(false);
  const [editing, setEditing] = useState<PayrollRecordView | null>(null);
  const [slip, setSlip] = useState<PayrollRecordView | null>(null);
  const [deleting, setDeleting] = useState<PayrollRecordView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<PayrollRecordView[] | null>(null);

  const drafts = records.filter((record) => record.status === "DRAFT");
  const approved = records.filter((record) => record.status === "APPROVED");

  async function advance(
    rows: PayrollRecordView[],
    status: "APPROVED" | "PAID" | "DRAFT",
    key: string,
    extra: { paidFrom?: PaidFrom } = {},
  ) {
    setBusy(key);
    setError(null);
    try {
      for (const row of rows) await send(`/api/admin/payroll/${row.id}`, "PATCH", { status, ...extra });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not save.");
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy("delete");
    try {
      await send(`/api/admin/payroll/${deleting.id}`, "DELETE");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete that.");
    } finally {
      setBusy(null);
      setDeleting(null);
      router.refresh();
    }
  }

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          <AdminButton variant="primary" onClick={() => setRunning(true)}>
            <Play className="h-4 w-4" /> Run payroll
          </AdminButton>
          <AdminButton onClick={() => setRates(true)}>
            <Settings2 className="h-4 w-4" /> Pay rates
          </AdminButton>
          <div className="ml-auto flex flex-wrap gap-2">
            {drafts.length > 0 && (
              <AdminButton onClick={() => advance(drafts, "APPROVED", "approve-all")} loading={busy === "approve-all"}>
                <CheckCheck className="h-4 w-4" /> Approve {drafts.length} draft{drafts.length === 1 ? "" : "s"}
              </AdminButton>
            )}
            {approved.length > 0 && (
              <AdminButton variant="primary" onClick={() => setPaying(approved)} loading={busy === "pay-all"}>
                <BadgeCent className="h-4 w-4" /> Mark {approved.length} paid
              </AdminButton>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="px-5 pb-3 text-sm" style={{ color: "var(--s-bad)" }}>
            {error}
          </p>
        )}

        {records.length === 0 ? (
          <EmptyState
            icon={<BadgeCent />}
            title="No pay runs in this period"
            hint="Set everyone's pay in Pay rates, then Run payroll for the month."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Period</th>
                <th className="num">Base</th>
                <th className="num">Bonus</th>
                <th className="num">Deductions</th>
                <th className="num">Net pay</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <span className="block font-semibold">{record.name}</span>
                    <span className="block text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      {record.role}
                    </span>
                  </td>
                  <td className="muted whitespace-nowrap">
                    {shortDate(record.periodStart)} – {shortDate(record.periodEnd)}
                  </td>
                  <td className="num">{formatGHS(record.baseAmount)}</td>
                  <td className="num muted">{record.bonuses > 0 ? `+${formatGHS(record.bonuses)}` : "—"}</td>
                  <td className="num muted">{record.deductions > 0 ? `−${formatGHS(record.deductions)}` : "—"}</td>
                  <td className="num font-bold">{formatGHS(record.netAmount)}</td>
                  <td>
                    <Chip tone={STATUS_TONE[record.status]}>{PAYROLL_STATUS_LABELS[record.status]}</Chip>
                    {record.paidAt && (
                      <span className="mt-0.5 block text-xs" style={{ color: "var(--s-ink-faint)" }}>
                        {new Date(record.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" })}
                        {record.paidFrom ? ` · ${PAID_FROM_LABEL[record.paidFrom] ?? record.paidFrom}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {record.status === "DRAFT" && (
                      <>
                        <IconButton label={`Edit ${record.name}`} onClick={() => setEditing(record)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Delete ${record.name}'s draft`} onClick={() => setDeleting(record)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                        <AdminButton
                          className="!min-h-9 px-3 py-1.5"
                          onClick={() => advance([record], "APPROVED", record.id)}
                          loading={busy === record.id}
                        >
                          Approve
                        </AdminButton>
                      </>
                    )}
                    {record.status === "APPROVED" && (
                      <>
                        <AdminButton
                          variant="ghost"
                          className="!min-h-9 px-2 py-1.5"
                          onClick={() => advance([record], "DRAFT", `back-${record.id}`)}
                          loading={busy === `back-${record.id}`}
                        >
                          Back to draft
                        </AdminButton>
                        <AdminButton
                          variant="primary"
                          className="!min-h-9 px-3 py-1.5"
                          onClick={() => setPaying([record])}
                          loading={busy === record.id}
                        >
                          Mark paid
                        </AdminButton>
                      </>
                    )}
                    <IconButton label={`Payslip for ${record.name}`} onClick={() => setSlip(record)}>
                      <FileText className="h-4 w-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {running && (
        <RunDialog
          ssnitEnabled={ssnitEnabled}
          payable={payable}
          runFrom={runFrom}
          runTo={runTo}
          onClose={() => setRunning(false)}
          onOpenRates={() => {
            setRunning(false);
            setRates(true);
          }}
          onDone={() => {
            setRunning(false);
            router.refresh();
          }}
        />
      )}
      {rates && <RatesDialog payable={payable} onClose={() => setRates(false)} onSaved={() => router.refresh()} />}
      {editing && (
        <EditDialog
          record={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {slip && <Payslip record={slip} businessName={businessName} onClose={() => setSlip(null)} />}
      {paying && (
        <PayDialog
          rows={paying}
          tillOpen={tillOpen}
          busy={busy === "pay"}
          onClose={() => setPaying(null)}
          onConfirm={async (paidFrom) => {
            await advance(paying, "PAID", "pay", { paidFrom });
            setPaying(null);
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this draft?"
        message={`${deleting?.name}'s draft for ${formatGHS(deleting?.netAmount ?? 0)} will be removed. Paid records can never be deleted.`}
        busy={busy === "delete"}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/**
 * "Where did the money come from?" Every paid wage leaves one account, so the
 * safe, MoMo, bank or drawer balance stays true. Cash from the safe is the
 * default; MoMo and bank leave the clearest record.
 */
function PayDialog({
  rows,
  tillOpen,
  busy,
  onClose,
  onConfirm,
}: {
  rows: PayrollRecordView[];
  tillOpen: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (paidFrom: PaidFrom) => void;
}) {
  const [paidFrom, setPaidFrom] = useState<PaidFrom>("SAFE");
  const total = rows.reduce((sum, row) => sum + row.netAmount, 0);
  const options = PAID_FROM.filter((option) => option.value !== "TILL" || tillOpen);

  return (
    <Dialog
      open
      title={rows.length === 1 ? `Pay ${rows[0].name}` : `Pay ${rows.length} people`}
      description={`${formatGHS(total)} in total. It counts against profit today.`}
      onClose={() => !busy && onClose()}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={() => onConfirm(paidFrom)} loading={busy}>
            Mark paid
          </AdminButton>
        </>
      }
    >
      <p className="mb-2 text-sm font-bold">Paid from</p>
      <div className="space-y-2" role="radiogroup" aria-label="Paid from">
        {options.map((option) => {
          const active = paidFrom === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPaidFrom(option.value)}
              className="flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left"
              style={{
                borderColor: active ? "var(--s-brand)" : "var(--s-border)",
                background: active ? "var(--s-brand-soft)" : "var(--s-panel)",
              }}
            >
              <span
                className="mt-1 h-4 w-4 shrink-0 rounded-full border-2"
                style={{ borderColor: active ? "var(--s-brand)" : "var(--s-border-strong)", background: active ? "var(--s-brand)" : "transparent" }}
              />
              <span>
                <span className="block font-bold">{option.label}</span>
                <span className="block text-xs" style={{ color: "var(--s-ink-muted)" }}>
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {!tillOpen && (
        <p className="mt-2 text-xs" style={{ color: "var(--s-ink-faint)" }}>
          Paying from the till needs an open shift.
        </p>
      )}
      {paidFrom === "TILL" && (
        <p className="mt-3 rounded-2xl px-3 py-2 text-sm" style={{ background: "var(--s-warn-soft)", color: "var(--s-warn)" }}>
          The cashier hands over {formatGHS(total)} from the drawer now. It shows as “Wages” on the Z report, so the count still balances.
        </p>
      )}
    </Dialog>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-grid h-9 w-9 place-items-center rounded-xl align-middle hover:bg-[var(--s-hover)]"
      style={{ color: "var(--s-ink-muted)" }}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

const smallInput = "money w-24 rounded-xl border px-2.5 py-1.5 text-right outline-none focus:ring-2 !min-h-10";
const num = (text: string) => Number(text) || 0;

interface RunLine {
  include: boolean;
  units: string;
  bonuses: string;
  other: string;
}

/** The month's pay for everyone on one sheet, with live totals. */
function RunDialog({
  ssnitEnabled,
  payable,
  runFrom,
  runTo,
  onClose,
  onOpenRates,
  onDone,
}: {
  ssnitEnabled: boolean;
  payable: PayableStaff[];
  runFrom: string;
  runTo: string;
  onClose: () => void;
  onOpenRates: () => void;
  onDone: () => void;
}) {
  const withRate = payable.filter((person) => person.rate > 0);
  const missing = payable.length - withRate.length;
  const [from, setFrom] = useState(runFrom);
  const [to, setTo] = useState(runTo);
  // On for anyone marked as registered with SSNIT on their Staff record.
  const [ssnit, setSsnit] = useState(() => ssnitEnabled && withRate.some((person) => person.ssnit));
  const [lines, setLines] = useState<Record<string, RunLine>>(() =>
    Object.fromEntries(
      withRate.map((person) => [
        person.id,
        { include: true, units: person.salaryType === "MONTHLY" ? "" : String(person.daysWorked ?? ""), bonuses: "", other: "" },
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, patch: Partial<RunLine>) =>
    setLines((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  const computed = withRate.map((person) => {
    const line = lines[person.id];
    return {
      person,
      line,
      pay: payLine({
        salaryType: person.salaryType,
        rate: person.rate,
        units: num(line.units),
        bonuses: num(line.bonuses),
        otherDeductions: num(line.other),
        ssnit: ssnit && person.ssnit,
      }),
    };
  });
  const chosen = computed.filter((row) => row.line.include);
  const total = chosen.reduce((sum, row) => sum + row.pay.net, 0);
  const employerSsnit = ssnit
    ? chosen.filter((row) => row.person.ssnit).reduce((sum, row) => sum + row.pay.base * SSNIT_EMPLOYER_RATE, 0)
    : 0;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const data = await send("/api/admin/payroll/run", "POST", {
        periodStart: from,
        periodEnd: to,
        ssnit,
        lines: chosen.map(({ person, line }) => ({
          staffId: person.id,
          ssnit: ssnit && person.ssnit,
          salaryType: person.salaryType,
          rate: person.rate,
          units: num(line.units),
          bonuses: num(line.bonuses),
          otherDeductions: num(line.other),
        })),
      });
      if (data.skipped?.length) {
        setError(`${data.created} drafts created. ${data.skipped.length} already had pay for this period and were left alone.`);
        setTimeout(onDone, 1800);
        return;
      }
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not save.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      wide
      title="Run payroll"
      description="Everyone's pay for the period as drafts. Check them, approve, then mark paid once the money has gone out."
      onClose={onClose}
      footer={
        <>
          <p className="mr-auto self-center text-sm">
            {chosen.length} people · <span className="money font-bold">{formatGHS(total)}</span> to pay
          </p>
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={busy} disabled={chosen.length === 0}>
            Create drafts
          </AdminButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="To">
          <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className={inputClass} style={inputStyle} />
        </Field>
      </div>

      {ssnitEnabled && (
      <label className="mt-3 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm" style={{ background: "var(--s-sunk)" }}>
        <input type="checkbox" checked={ssnit} onChange={(event) => setSsnit(event.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          <span className="font-bold">Deduct SSNIT ({(SSNIT_EMPLOYEE_RATE * 100).toFixed(1)}% of basic pay)</span>
          <span className="block text-xs" style={{ color: "var(--s-ink-muted)" }}>
            Only from staff marked as registered with SSNIT on the Staff page. The business also owes {(SSNIT_EMPLOYER_RATE * 100).toFixed(0)}% on top
            {ssnit && employerSsnit > 0 ? `: about ${formatGHS(employerSsnit)} this run` : ""}, paid to SSNIT, not taken from wages.
          </span>
        </span>
      </label>
      )}

      {missing > 0 && (
        <p className="mt-3 text-sm" style={{ color: "var(--s-warn)" }}>
          {missing} active staff have no pay rate, so they are not listed.{" "}
          <button type="button" onClick={onOpenRates} className="font-bold underline">
            Set pay rates
          </button>
        </p>
      )}

      {withRate.length === 0 ? (
        <EmptyState title="Nobody has a pay rate yet" hint="Set each person's pay first." />
      ) : (
        <div className="-mx-5 mt-3">
          <Table>
            <thead>
              <tr>
                <th aria-label="Include" />
                <th>Staff</th>
                <th className="num">Days / hours</th>
                <th className="num">Base</th>
                <th className="num">Bonus</th>
                <th className="num">Other deductions</th>
                <th className="num">Net</th>
              </tr>
            </thead>
            <tbody>
              {computed.map(({ person, line, pay }) => {
                const unit = SALARY_UNITS[person.salaryType].unit;
                return (
                  <tr key={person.id} style={line.include ? undefined : { opacity: 0.45 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={line.include}
                        onChange={(event) => update(person.id, { include: event.target.checked })}
                        className="h-4 w-4"
                        aria-label={`Include ${person.name}`}
                      />
                    </td>
                    <td>
                      <span className="block font-semibold">{person.name}</span>
                      <span className="block text-xs" style={{ color: "var(--s-ink-faint)" }}>
                        {formatGHS(person.rate)} {SALARY_UNITS[person.salaryType].per}
                      </span>
                    </td>
                    <td className="num">
                      {unit ? (
                        <>
                          <input
                            inputMode="decimal"
                            value={line.units}
                            onChange={(event) => update(person.id, { units: event.target.value.replace(/[^\d.]/g, "") })}
                            className={smallInput}
                            style={inputStyle}
                            aria-label={`${unit} for ${person.name}`}
                          />
                          {person.salaryType === "DAILY" && (person.daysWorked ?? 0) > 0 && (
                            <span className="mt-0.5 block text-[11px]" style={{ color: "var(--s-ink-faint)" }}>
                              till saw {person.daysWorked} days
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="muted">Monthly</span>
                      )}
                    </td>
                    <td className="num">{formatGHS(pay.base)}</td>
                    <td className="num">
                      <input
                        inputMode="decimal"
                        value={line.bonuses}
                        placeholder="0"
                        onChange={(event) => update(person.id, { bonuses: event.target.value.replace(/[^\d.]/g, "") })}
                        className={smallInput}
                        style={inputStyle}
                        aria-label={`Bonus for ${person.name}`}
                      />
                    </td>
                    <td className="num">
                      <input
                        inputMode="decimal"
                        value={line.other}
                        placeholder="0"
                        onChange={(event) => update(person.id, { other: event.target.value.replace(/[^\d.]/g, "") })}
                        className={smallInput}
                        style={inputStyle}
                        aria-label={`Other deductions for ${person.name}`}
                      />
                      {pay.ssnit > 0 && (
                        <span className="mt-0.5 block text-[11px]" style={{ color: "var(--s-ink-faint)" }}>
                          + SSNIT {formatGHS(pay.ssnit)}
                        </span>
                      )}
                    </td>
                    <td className="num font-bold" style={pay.net < 0 ? { color: "var(--s-bad)" } : undefined}>
                      {formatGHS(pay.net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm" style={{ color: "var(--s-bad)" }}>
          {error}
        </p>
      )}
    </Dialog>
  );
}

/** Each person's pay type, rate and where the money goes. Saves per row. */
function RatesDialog({
  payable,
  onClose,
  onSaved,
}: {
  payable: PayableStaff[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog
      open
      wide
      title="Pay rates"
      description="Set once; every pay run starts from these. Daily and hourly staff are paid for the days or hours you enter on the run."
      onClose={onClose}
    >
      <div className="space-y-3">
        {payable.map((person) => (
          <RateRow key={person.id} person={person} onSaved={onSaved} />
        ))}
      </div>
    </Dialog>
  );
}

function RateRow({ person, onSaved }: { person: PayableStaff; onSaved: () => void }) {
  const [salaryType, setSalaryType] = useState<SalaryType>(person.salaryType);
  const [rate, setRate] = useState(person.rate ? person.rate.toFixed(2) : "");
  const [momo, setMomo] = useState(person.momoNumber ?? "");
  const [bankName, setBankName] = useState(person.bankName ?? "");
  const [bankAccount, setBankAccount] = useState(person.bankAccount ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const dirty =
    salaryType !== person.salaryType ||
    num(rate) !== person.rate ||
    momo !== (person.momoNumber ?? "") ||
    bankName !== (person.bankName ?? "") ||
    bankAccount !== (person.bankAccount ?? "");

  async function save() {
    setState("saving");
    setMessage(null);
    try {
      await send("/api/admin/payroll/rates", "PUT", {
        staffId: person.id,
        salaryType,
        salaryAmount: num(rate),
        phone: person.phone,
        momoNumber: momo,
        bankName,
        bankAccount,
      });
      setState("saved");
      onSaved();
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Could not save.");
    }
  }

  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: "var(--s-border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">
          {person.name}
          <span className="ml-2 text-xs font-medium" style={{ color: "var(--s-ink-faint)" }}>
            {person.role}
          </span>
        </p>
        <span className="text-xs" style={{ color: state === "error" ? "var(--s-bad)" : "var(--s-good)" }}>
          {state === "saved" && !dirty ? "Saved" : state === "error" ? message : ""}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[9rem_8rem_1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Paid">
          <select value={salaryType} onChange={(event) => setSalaryType(event.target.value as SalaryType)} className={inputClass} style={inputStyle}>
            <option value="MONTHLY">Monthly</option>
            <option value="DAILY">Daily</option>
            <option value="HOURLY">Hourly</option>
          </select>
        </Field>
        <Field label={`Rate, ${SALARY_UNITS[salaryType].per}`}>
          <input
            inputMode="decimal"
            value={rate}
            onChange={(event) => setRate(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0.00"
            className={`${inputClass} money text-right`}
            style={inputStyle}
          />
        </Field>
        <Field label="MoMo number">
          <input value={momo} onChange={(event) => setMomo(event.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Bank">
          <input value={bankName} onChange={(event) => setBankName(event.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Account number">
          <input value={bankAccount} onChange={(event) => setBankAccount(event.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        <AdminButton variant="primary" onClick={save} loading={state === "saving"} disabled={!dirty} className="col-span-2 sm:col-span-1">
          Save
        </AdminButton>
      </div>
    </div>
  );
}

function EditDialog({
  record,
  onClose,
  onDone,
}: {
  record: PayrollRecordView;
  onClose: () => void;
  onDone: () => void;
}) {
  const [base, setBase] = useState(record.baseAmount.toFixed(2));
  const [bonuses, setBonuses] = useState(record.bonuses ? record.bonuses.toFixed(2) : "");
  const [deductions, setDeductions] = useState(record.deductions ? record.deductions.toFixed(2) : "");
  const [notes, setNotes] = useState(record.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const net = num(base) + num(bonuses) - num(deductions);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await send(`/api/admin/payroll/${record.id}`, "PATCH", {
        baseAmount: num(base),
        bonuses: num(bonuses),
        deductions: num(deductions),
        notes,
      });
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      title={`Edit ${record.name}'s pay`}
      description={`${shortDate(record.periodStart)} – ${shortDate(record.periodEnd)} · draft`}
      onClose={onClose}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={save} loading={busy} disabled={net < 0}>
            Save
          </AdminButton>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Field label="Base">
          <input inputMode="decimal" value={base} onChange={(event) => setBase(event.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money text-right`} style={inputStyle} />
        </Field>
        <Field label="Bonus">
          <input inputMode="decimal" value={bonuses} placeholder="0" onChange={(event) => setBonuses(event.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money text-right`} style={inputStyle} />
        </Field>
        <Field label="Deductions">
          <input inputMode="decimal" value={deductions} placeholder="0" onChange={(event) => setDeductions(event.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money text-right`} style={inputStyle} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes" hint="Shown on the payslip, e.g. an advance being repaid.">
          <input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} style={inputStyle} />
        </Field>
      </div>
      <div className="mt-3 flex items-baseline justify-between rounded-2xl px-3 py-2.5" style={{ background: "var(--s-sunk)" }}>
        <span className="text-sm font-bold">Net pay</span>
        <span className="money text-lg font-extrabold" style={net < 0 ? { color: "var(--s-bad)" } : undefined}>
          {formatGHS(net)}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm" style={{ color: "var(--s-bad)" }}>
          {error}
        </p>
      )}
    </Dialog>
  );
}

/** A printable payslip on the same slip layout as receipts. */
function Payslip({ record, businessName, onClose }: { record: PayrollRecordView; businessName: string; onClose: () => void }) {
  const notes = record.notes?.split(" · ").filter(Boolean) ?? [];
  return (
    <Dialog
      open
      title="Payslip"
      onClose={onClose}
      footer={
        <AdminButton variant="primary" onClick={() => printReceiptNow()}>
          <Printer className="h-4 w-4" /> Print
        </AdminButton>
      }
    >
      <div data-anis-receipt className="anis-receipt anis-receipt--preview">
        <div className="r-center">
          <div className="r-title">{businessName}</div>
          <div className="r-title">PAYSLIP</div>
          <div className="r-small">
            {shortDate(record.periodStart)} – {shortDate(record.periodEnd)} {record.periodEnd.slice(0, 4)}
          </div>
        </div>
        <div className="r-rule" />
        <SlipRow label="Name" value={record.name} />
        <SlipRow label="Role" value={record.role} />
        <div className="r-rule" />
        <SlipRow label="Basic pay" value={formatGHS(record.baseAmount)} />
        {record.bonuses > 0 && <SlipRow label="Bonus" value={`+${formatGHS(record.bonuses)}`} />}
        {record.deductions > 0 && <SlipRow label="Deductions" value={`-${formatGHS(record.deductions)}`} />}
        {notes.map((note) => (
          <div key={note} className="r-note">
            {note}
          </div>
        ))}
        <div className="r-rule" />
        <div className="r-row r-total">
          <span>NET PAY</span>
          <span>{formatGHS(record.netAmount)}</span>
        </div>
        <div className="r-rule" />
        <SlipRow
          label="Status"
          value={
            record.paidAt
              ? `Paid ${new Date(record.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" })}`
              : PAYROLL_STATUS_LABELS[record.status]
          }
        />
        {record.paidFrom && <SlipRow label="Paid from" value={PAID_FROM_LABEL[record.paidFrom] ?? record.paidFrom} />}
        {record.payTo && <SlipRow label="Pay to" value={record.payTo} />}
        <div className="r-rule" />
        <div className="r-small">Received by: ____________________</div>
      </div>
    </Dialog>
  );
}

function SlipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="r-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
