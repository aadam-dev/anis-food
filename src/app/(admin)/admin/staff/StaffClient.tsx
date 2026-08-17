"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Copy, Check } from "lucide-react";
import { Panel, Chip, AdminButton, Field, inputClass, inputStyle } from "@/components/admin/ui";
import { ROLE_LABELS } from "@/components/admin/labels";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  hasPin: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  editable: boolean;
  isSelf: boolean;
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
  const [handedOver, setHandedOver] = useState<{ email: string; password: string } | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        {assignableRoles.length > 0 && (
          <AdminButton variant="primary" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> Add someone
          </AdminButton>
        )}
      </div>

      <Panel>
        <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
          {staff.map((member) => (
            <StaffRow
              key={member.id}
              member={member}
              assignableRoles={assignableRoles}
              onChanged={() => router.refresh()}
              onPasswordReset={(password) => setHandedOver({ email: member.email, password })}
            />
          ))}
        </ul>
      </Panel>

      {adding && (
        <AddDialog
          assignableRoles={assignableRoles}
          onClose={() => setAdding(false)}
          onCreated={(email, password) => {
            setAdding(false);
            setHandedOver({ email, password });
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

function StaffRow({
  member,
  assignableRoles,
  onChanged,
  onPasswordReset,
}: {
  member: StaffMember;
  assignableRoles: string[];
  onChanged: () => void;
  onPasswordReset: (password: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    const response = await fetch(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (data.initialPassword) onPasswordReset(data.initialPassword);
    onChanged();
  }

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
            {member.name}
            {!member.isActive && <Chip tone="bad">Deactivated</Chip>}
            {member.mustChangePassword && member.isActive && (
              <Chip tone="warn">Hasn&apos;t set password</Chip>
            )}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--s-ink-faint)" }}>
            {member.email} · {ROLE_LABELS[member.role] ?? member.role}
            {member.role === "CASHIER" ? (member.hasPin ? " · PIN set" : " · no PIN") : ""}
          </p>
        </div>
        {member.editable && (
          <div className="flex items-center gap-2 shrink-0">
            {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--s-ink-faint)" }} />}
            <select
              value={member.role}
              disabled={busy || member.isSelf}
              onChange={(event) => patch({ role: event.target.value })}
              className="rounded-lg border px-2 py-1.5 text-xs min-h-9"
              style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
              aria-label={`Role for ${member.name}`}
            >
              {/* Keep the current role selectable even if this admin cannot assign
                  it, so the dropdown never silently changes it. */}
              {[...new Set([member.role, ...assignableRoles])].map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {member.editable && !member.isSelf && (
        <div className="mt-2 flex flex-wrap gap-2">
          <AdminButton
            onClick={() => patch({ resetPassword: true })}
            disabled={busy}
            className="text-xs !min-h-9 !py-1.5"
          >
            Reset password
          </AdminButton>
          {member.role === "CASHIER" && member.hasPin && (
            <AdminButton
              onClick={() => patch({ clearPin: true })}
              disabled={busy}
              className="text-xs !min-h-9 !py-1.5"
            >
              Clear PIN
            </AdminButton>
          )}
          <AdminButton
            variant={member.isActive ? "danger" : "secondary"}
            onClick={() => patch({ isActive: !member.isActive })}
            disabled={busy}
            className="text-xs !min-h-9 !py-1.5"
          >
            {member.isActive ? "Deactivate" : "Reactivate"}
          </AdminButton>
        </div>
      )}
    </li>
  );
}

function AddDialog({
  assignableRoles,
  onClose,
  onCreated,
}: {
  assignableRoles: string[];
  onClose: () => void;
  onCreated: (email: string, password: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not create that account.");
        setBusy(false);
        return;
      }
      onCreated(data.email, data.initialPassword);
    } catch {
      setError("No connection. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog onClose={onClose} title="Add someone">
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} style={inputStyle} />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          className={inputClass}
          style={inputStyle}
        />
      </Field>
      <Field label="Role">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} style={inputStyle}>
          {assignableRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] ?? r}
            </option>
          ))}
        </select>
      </Field>
      {error && <p className="text-sm" style={{ color: "var(--s-bad)" }}>{error}</p>}
      <div className="flex gap-2 pt-1">
        <AdminButton onClick={onClose} className="flex-1">Cancel</AdminButton>
        <button
          onClick={submit}
          disabled={busy || !name.trim() || !email.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white min-h-11 disabled:opacity-50"
          style={{ background: "var(--s-brand)" }}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Create
        </button>
      </div>
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
    <Dialog onClose={onClose} title="One-time password">
      <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
        Give this to <strong>{email}</strong> directly. It is shown once and is not stored —
        they must change it the first time they sign in.
      </p>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(password);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="w-full flex items-center justify-between rounded-lg border px-4 py-3 font-mono text-lg"
        style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
      >
        <span>{password}</span>
        {copied ? (
          <Check className="w-4 h-4" style={{ color: "var(--s-good)" }} />
        ) : (
          <Copy className="w-4 h-4" style={{ color: "var(--s-ink-faint)" }} />
        )}
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border p-5 space-y-3"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <h2 className="font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
