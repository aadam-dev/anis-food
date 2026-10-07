"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, Plus, Search, KeyRound, Trash2 } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import {
  AdminButton,
  Chip,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Field,
  Panel,
  Segmented,
  inputClass,
  inputStyle,
} from "@/components/admin/ui";
import { PhotoPicker, StaffAvatar } from "@/components/admin/StaffAvatar";
import { ROLE_LABELS } from "@/components/admin/labels";

export interface StaffRow {
  id: string;
  name: string;
  position: string;
  phone: string | null;
  photoUrl: string | null;
  payType: "MONTHLY" | "DAILY" | "HOURLY";
  /** Null when the viewer may not see pay. */
  payRate: number | null;
  momoNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ssnit: boolean;
  startedAt: string | null;
  endedAt: string | null;
  isActive: boolean;
  notes: string | null;
  userId: string | null;
  userName: string | null;
}

interface Login {
  id: string;
  name: string;
  role: string;
  staffId: string | null;
}

const POSITIONS = ["Cook", "Kitchen assistant", "Server", "Cashier", "Rider", "Cleaner", "Manager", "Security"];
const PAY_LABEL = { MONTHLY: "month", DAILY: "day", HOURLY: "hour" } as const;

export default function StaffClient({
  staff,
  showPay,
  ssnitEnabled,
  canManageLogins,
  logins,
}: {
  staff: StaffRow[];
  showPay: boolean;
  ssnitEnabled: boolean;
  canManageLogins: boolean;
  logins: Login[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"active" | "left">("active");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StaffRow | "new" | null>(null);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return staff.filter(
      (member) =>
        (filter === "active" ? member.isActive : !member.isActive) &&
        (!needle ||
          member.name.toLowerCase().includes(needle) ||
          member.position.toLowerCase().includes(needle) ||
          (member.phone ?? "").includes(needle)),
    );
  }, [staff, filter, search]);

  const activeCount = staff.filter((member) => member.isActive).length;
  const monthlyBill = showPay
    ? staff.filter((member) => member.isActive && member.payType === "MONTHLY").reduce((sum, member) => sum + (member.payRate ?? 0), 0)
    : 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: "Working here", count: activeCount },
            { value: "left", label: "Left", count: staff.length - activeCount },
          ]}
        />
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--s-ink-faint)" }} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, job or phone"
            className={`${inputClass} pl-9`}
            style={inputStyle}
            aria-label="Search staff"
          />
        </div>
        <AdminButton variant="primary" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Add staff
        </AdminButton>
      </div>

      {showPay && monthlyBill > 0 && filter === "active" && (
        <p className="mb-3 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          Monthly salaries add up to <b className="money">{formatGHS(monthlyBill)}</b>, before daily and hourly staff.
        </p>
      )}

      {visible.length === 0 ? (
        <Panel>
          <EmptyState
            title={filter === "active" ? "No one here yet" : "No one has left"}
            hint={filter === "active" ? "Add the people who work at Anis: cooks, servers, riders, cashiers." : undefined}
          />
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => setEditing(member)}
                className="s-card flex w-full items-center gap-4 p-4 text-left transition-transform active:scale-[0.99]"
              >
                <StaffAvatar name={member.name} photoUrl={member.photoUrl} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{member.name}</p>
                  <p className="truncate text-sm" style={{ color: "var(--s-ink-muted)" }}>
                    {member.position || "No job title"}
                    {member.phone ? ` · ${member.phone}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {member.payRate !== null && member.payRate > 0 && (
                      <Chip tone="neutral">
                        {formatGHS(member.payRate)} / {PAY_LABEL[member.payType]}
                      </Chip>
                    )}
                    {member.userName ? (
                      <Chip tone="good">
                        <KeyRound className="h-3 w-3" /> Till login
                      </Chip>
                    ) : null}
                    {ssnitEnabled && member.ssnit && <Chip tone="neutral">SSNIT</Chip>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <StaffDialog
          key={editing === "new" ? "new" : editing.id}
          member={editing === "new" ? null : editing}
          showPay={showPay}
          ssnitEnabled={ssnitEnabled}
          canManageLogins={canManageLogins}
          logins={logins}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function StaffDialog({
  member,
  showPay,
  ssnitEnabled,
  canManageLogins,
  logins,
  onClose,
  onSaved,
}: {
  member: StaffRow | null;
  showPay: boolean;
  ssnitEnabled: boolean;
  canManageLogins: boolean;
  logins: Login[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [position, setPosition] = useState(member?.position ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(member?.photoUrl ?? null);
  const [payType, setPayType] = useState<StaffRow["payType"]>(member?.payType ?? "MONTHLY");
  const [payRate, setPayRate] = useState(member?.payRate ? member.payRate.toFixed(2) : "");
  const [momoNumber, setMomoNumber] = useState(member?.momoNumber ?? "");
  const [bankName, setBankName] = useState(member?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState(member?.bankAccount ?? "");
  const [ssnit, setSsnit] = useState(member?.ssnit ?? false);
  const [startedAt, setStartedAt] = useState(member?.startedAt ?? "");
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const [endedAt, setEndedAt] = useState(member?.endedAt ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [userId, setUserId] = useState(member?.userId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Logins nobody else is linked to, plus this person's own.
  const freeLogins = logins.filter((login) => !login.staffId || login.staffId === member?.id);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) return setError("Enter a name.");
    const rate = payRate.trim() === "" ? 0 : Number(payRate);
    if (showPay && (!Number.isFinite(rate) || rate < 0)) return setError("The pay rate is not a number.");

    const body: Record<string, unknown> = {
      name: name.trim(),
      position: position.trim(),
      phone: phone.trim(),
      photoUrl,
      ssnit,
      startedAt: startedAt || null,
      isActive,
      endedAt: isActive ? null : endedAt || new Date().toISOString().slice(0, 10),
      notes: notes.trim(),
      ...(canManageLogins && { userId: userId || null }),
      ...(showPay && {
        payType,
        payRate: roundMoney(rate),
        momoNumber: momoNumber.trim(),
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
      }),
    };

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(member ? `/api/admin/staff/${member.id}` : "/api/admin/staff", {
        method: member ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save. Try again.");
        return;
      }
      onSaved();
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!member) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/staff/${member.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setConfirmDelete(false);
        setError(data.error ?? "Could not delete.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open
        wide
        title={member ? member.name : "Add staff"}
        description={member ? member.position || undefined : "Anyone who works here, with or without a till login."}
        onClose={() => !busy && onClose()}
        footer={
          <>
            {member && (
              <AdminButton variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy} className="mr-auto">
                <Trash2 className="h-4 w-4" /> Delete
              </AdminButton>
            )}
            <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" form="staff-form" variant="primary" loading={busy}>
              {member ? "Save changes" : "Add staff"}
            </AdminButton>
          </>
        }
      >
        <form id="staff-form" onSubmit={save} className="space-y-4">
          <PhotoPicker name={name} photoUrl={photoUrl} onChange={setPhotoUrl} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputClass} style={inputStyle} autoComplete="off" />
            </Field>
            <Field label="Job">
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                list="staff-positions"
                maxLength={60}
                placeholder="e.g. Cook"
                className={inputClass}
                style={inputStyle}
              />
              <datalist id="staff-positions">
                {POSITIONS.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </Field>
            <Field label="Phone">
              <div className="flex gap-2">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className={inputClass} style={inputStyle} />
                {phone && (
                  <a href={`tel:${phone}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--s-sunk)" }} aria-label="Call">
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </Field>
            <Field label="Started on">
              <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className={inputClass} style={inputStyle} />
            </Field>
          </div>

          {showPay && (
            <section className="space-y-3 rounded-2xl p-3" style={{ background: "var(--s-sunk)" }}>
              <p className="text-sm font-extrabold">Pay</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Paid by the">
                  <select value={payType} onChange={(e) => setPayType(e.target.value as StaffRow["payType"])} className={inputClass} style={inputStyle}>
                    <option value="MONTHLY">Month (salary)</option>
                    <option value="DAILY">Day</option>
                    <option value="HOURLY">Hour</option>
                  </select>
                </Field>
                <Field label="Rate (GH₵)">
                  <input value={payRate} onChange={(e) => setPayRate(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={`${inputClass} money`} style={inputStyle} />
                </Field>
                <Field label="MoMo number">
                  <input type="tel" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} maxLength={30} className={inputClass} style={inputStyle} />
                </Field>
                <Field label="Bank and account">
                  <div className="flex gap-2">
                    <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank" maxLength={80} className={inputClass} style={inputStyle} />
                    <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account no." maxLength={40} className={inputClass} style={inputStyle} />
                  </div>
                </Field>
              </div>
              {ssnitEnabled && (
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={ssnit} onChange={(e) => setSsnit(e.target.checked)} className="h-5 w-5" />
                  Registered with SSNIT (payroll deducts 5.5% of basic pay)
                </label>
              )}
            </section>
          )}

          {canManageLogins && (
            <Field
              label="Till login"
              hint="Only for staff who sign in to the till. Create logins under Users, then link them here."
            >
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">No login</option>
                {freeLogins.map((login) => (
                  <option key={login.id} value={login.id}>
                    {login.name} ({ROLE_LABELS[login.role] ?? login.role})
                  </option>
                ))}
              </select>
            </Field>
          )}
          {!canManageLogins && member?.userName && (
            <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
              Signs in to the till as <b>{member.userName}</b>.
            </p>
          )}

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className={`${inputClass} resize-y`} style={inputStyle} />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5" />
              Works here now
            </label>
            {!isActive && (
              <label className="flex items-center gap-2 text-sm">
                Left on
                <input type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} className={`${inputClass} w-auto`} style={inputStyle} />
              </label>
            )}
          </div>
          {member?.userId && canManageLogins && (
            <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
              Marking someone as left does not close their login.{" "}
              <Link href="/admin/users" className="font-semibold underline">
                Deactivate it under Users
              </Link>
              .
            </p>
          )}

          {error && (
            <p className="text-sm" style={{ color: "var(--s-bad)" }} role="alert">
              {error}
            </p>
          )}
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${member?.name ?? "this person"}?`}
        message="Only for someone added by mistake. Anyone who has been paid is kept on record; mark them as left instead."
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
