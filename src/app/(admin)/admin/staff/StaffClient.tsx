"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Copy, Check } from "lucide-react";
import { Panel, Chip, AdminButton, Field, inputClass, inputStyle } from "@/components/admin/ui";
import { ROLE_LABELS } from "@/components/admin/labels";
import { staffAvatarTint, staffInitials } from "@/lib/staff-avatar";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  hasPin: boolean;
  phone: string | null;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  editable: boolean;
  isSelf: boolean;
}

interface StaffDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  hasPin: boolean;
  phone: string;
  notes: string;
  salaryType: string;
  salaryAmount: number;
  bankName: string;
  bankAccount: string;
  momoNumber: string;
  startedAt: string;
}

export default function StaffClient({
  staff,
  assignableRoles,
}: {
  staff: StaffMember[];
  assignableRoles: string[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [handedOver, setHandedOver] = useState<{ email: string; password: string } | null>(null);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? staff.filter((member) =>
        `${member.name} ${member.email} ${member.role} ${member.phone ?? ""}`.toLowerCase().includes(needle),
      )
    : staff;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, role or phone"
          aria-label="Search staff"
          className={`${inputClass} max-w-sm`}
          style={inputStyle}
        />
        <div className="ml-auto">
          {assignableRoles.length > 0 && (
            <AdminButton variant="primary" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" /> Add someone
            </AdminButton>
          )}
        </div>
      </div>

      <Panel>
        <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
          {visible.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                style={{ background: staffAvatarTint(member.name) }}
                aria-hidden
              >
                {staffInitials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {member.name}
                  {!member.isActive && <Chip tone="bad">Deactivated</Chip>}
                  {member.mustChangePassword && member.isActive && <Chip tone="warn">Password not set</Chip>}
                  {!member.hasPin && member.isActive && <Chip tone="warn">No PIN</Chip>}
                </p>
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--s-ink-faint)" }}>
                  {ROLE_LABELS[member.role] ?? member.role}
                  {member.phone ? ` · ${member.phone}` : ""}
                  {" · "}
                  {member.email}
                </p>
              </div>
              {member.editable && (
                <AdminButton onClick={() => setEditingId(member.id)} className="shrink-0">
                  Details
                </AdminButton>
              )}
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-5 py-10 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
              Nobody matches that search.
            </li>
          )}
        </ul>
      </Panel>

      {adding && (
        <AddDialog
          assignableRoles={assignableRoles}
          onClose={() => setAdding(false)}
          onCreated={(email, password) => {
            setAdding(false);
            if (password) setHandedOver({ email, password });
            router.refresh();
          }}
        />
      )}

      {editingId && (
        <EditDialog
          id={editingId}
          assignableRoles={assignableRoles}
          isSelf={staff.find((member) => member.id === editingId)?.isSelf ?? false}
          onClose={() => setEditingId(null)}
          onSaved={(password) => {
            if (password) {
              const email = staff.find((member) => member.id === editingId)?.email ?? "";
              setHandedOver({ email, password });
            }
            setEditingId(null);
            router.refresh();
          }}
        />
      )}

      {handedOver && (
        <PasswordDialog
          email={handedOver.email}
          password={handedOver.password}
          onClose={() => setHandedOver(null)}
        />
      )}
    </>
  );
}

function AddDialog({
  assignableRoles,
  onClose,
  onCreated,
}: {
  assignableRoles: string[];
  onClose: () => void;
  onCreated: (email: string, password: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(assignableRoles.includes("CASHIER") ? "CASHIER" : assignableRoles[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          phone: phone.trim() || undefined,
          pin: pin.trim(),
          ...(password.trim() ? { password: password.trim() } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not create that account.");
        setBusy(false);
        return;
      }
      onCreated(data.email, data.initialPassword ?? null);
    } catch {
      setError("No connection. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog onClose={onClose} title="Add someone">
      <Field label="Name">
        <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} style={inputStyle} />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoCapitalize="none"
          placeholder="ama@anis.com"
          className={inputClass}
          style={inputStyle}
        />
      </Field>
      <Field label="Phone">
        <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} style={inputStyle} />
      </Field>
      <Field label="Role">
        <select value={role} onChange={(event) => setRole(event.target.value)} className={inputClass} style={inputStyle}>
          {assignableRoles.map((entry) => (
            <option key={entry} value={entry}>
              {ROLE_LABELS[entry] ?? entry}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Till PIN" hint="4 digits">
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          className={`${inputClass} tracking-[0.3em]`}
          style={inputStyle}
        />
      </Field>
      <Field label="Password" hint="Optional. Leave blank to generate one.">
        <input
          type="text"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className={inputClass}
          style={inputStyle}
        />
      </Field>
      {error && (
        <p className="text-sm" style={{ color: "var(--s-bad)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <AdminButton onClick={onClose} className="flex-1">
          Cancel
        </AdminButton>
        <button
          onClick={submit}
          disabled={busy || !name.trim() || !email.trim() || pin.length !== 4}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--s-brand)" }}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Create
        </button>
      </div>
    </Dialog>
  );
}

function EditDialog({
  id,
  assignableRoles,
  isSelf,
  onClose,
  onSaved,
}: {
  id: string;
  assignableRoles: string[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: (generatedPassword: string | null) => void;
}) {
  const [detail, setDetail] = useState<StaffDetail | null>(null);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/admin/staff/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (!alive) return;
        if (data?.id) setDetail(data);
        else setError(data?.error ?? "Could not open that account.");
      })
      .catch(() => {
        if (alive) setError("No connection. Try again.");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  function set<K extends keyof StaffDetail>(key: K, value: StaffDetail[K]) {
    setDetail((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(extra: Record<string, unknown> = {}) {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detail.name.trim(),
          email: detail.email.trim(),
          role: detail.role,
          isActive: detail.isActive,
          phone: detail.phone,
          notes: detail.notes,
          salaryType: detail.salaryType,
          salaryAmount: Number(detail.salaryAmount) || 0,
          bankName: detail.bankName,
          bankAccount: detail.bankAccount,
          momoNumber: detail.momoNumber,
          startedAt: detail.startedAt || null,
          ...(pin.length === 4 ? { pin } : {}),
          ...(password.trim() ? { password: password.trim() } : {}),
          ...extra,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setBusy(false);
      if (!response.ok) {
        setError(data.error ?? "Could not save those details.");
        return;
      }
      onSaved(data.initialPassword ?? null);
    } catch {
      setError("No connection. Try again.");
      setBusy(false);
    }
  }

  const roles = detail ? [...new Set([detail.role, ...assignableRoles])] : assignableRoles;

  return (
    <Dialog onClose={onClose} title={detail?.name || "Staff details"} wide>
      {!detail && !error && (
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Opening the record
        </p>
      )}
      {detail && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input value={detail.name} onChange={(event) => set("name", event.target.value)} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Email">
              <input
                value={detail.email}
                onChange={(event) => set("email", event.target.value)}
                autoCapitalize="none"
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label="Phone">
              <input value={detail.phone} onChange={(event) => set("phone", event.target.value)} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Started">
              <input
                type="date"
                value={detail.startedAt}
                onChange={(event) => set("startedAt", event.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label="Role">
              <select
                value={detail.role}
                disabled={isSelf}
                onChange={(event) => set("role", event.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                {roles.map((entry) => (
                  <option key={entry} value={entry}>
                    {ROLE_LABELS[entry] ?? entry}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pay" hint="GH₵">
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={String(detail.salaryAmount)}
                  onChange={(event) => set("salaryAmount", Number(event.target.value.replace(/[^\d.]/g, "")) || 0)}
                  className={`${inputClass} money`}
                  style={inputStyle}
                />
                <select
                  value={detail.salaryType}
                  onChange={(event) => set("salaryType", event.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  aria-label="Pay period"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="DAILY">Daily</option>
                  <option value="HOURLY">Hourly</option>
                </select>
              </div>
            </Field>
            <Field label="Bank">
              <input value={detail.bankName} onChange={(event) => set("bankName", event.target.value)} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Account number">
              <input
                value={detail.bankAccount}
                onChange={(event) => set("bankAccount", event.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label="MoMo number">
              <input
                value={detail.momoNumber}
                onChange={(event) => set("momoNumber", event.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label="New till PIN" hint={detail.hasPin ? "Leave blank to keep the current PIN" : "No PIN yet"}>
              <input
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className={`${inputClass} tracking-[0.3em]`}
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={detail.notes}
              onChange={(event) => set("notes", event.target.value)}
              rows={2}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="Set a password" hint="Leave blank to keep the current one">
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          {error && (
            <p className="text-sm" style={{ color: "var(--s-bad)" }}>
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void save()}
              disabled={busy || !detail.name.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--s-brand)" }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
            {!isSelf && (
              <>
                <AdminButton onClick={() => void save({ resetPassword: true })} disabled={busy}>
                  Generate password
                </AdminButton>
                <AdminButton
                  variant={detail.isActive ? "danger" : "secondary"}
                  onClick={() => void save({ isActive: !detail.isActive })}
                  disabled={busy}
                >
                  {detail.isActive ? "Deactivate" : "Reactivate"}
                </AdminButton>
              </>
            )}
            <AdminButton onClick={onClose}>Close</AdminButton>
          </div>
        </>
      )}
      {error && !detail && (
        <p className="text-sm" style={{ color: "var(--s-bad)" }}>
          {error}
        </p>
      )}
    </Dialog>
  );
}

function PasswordDialog({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog onClose={onClose} title="Password to hand over">
      <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
        Give this to <strong>{email}</strong> directly. It is shown once. They still sign in at the till with their PIN.
      </p>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(password);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex w-full items-center justify-between rounded-lg border px-4 py-3 font-mono text-lg"
        style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
      >
        <span>{password}</span>
        {copied ? <Check className="h-4 w-4" style={{ color: "var(--s-good)" }} /> : <Copy className="h-4 w-4" style={{ color: "var(--s-ink-faint)" }} />}
      </button>
      <AdminButton variant="primary" onClick={onClose} className="w-full justify-center">
        Done
      </AdminButton>
    </Dialog>
  );
}

function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className={`relative max-h-[92dvh] w-full space-y-3 overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <h2 className="font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
