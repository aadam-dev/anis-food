"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Copy, Check, Pencil } from "lucide-react";
import { Panel, Chip, AdminButton, Field, Dialog, ConfirmDialog, inputClass, inputStyle } from "@/components/admin/ui";
import { ROLE_LABELS } from "@/components/admin/labels";
import { staffAvatarTint, staffInitials } from "@/lib/staff-avatar";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  hasPin: boolean;
  /** The staff member this login belongs to, if any. */
  staffName: string | null;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  editable: boolean;
  isSelf: boolean;
}

export default function UsersClient({
  staff,
  assignableRoles,
}: {
  staff: UserAccount[];
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
  member: UserAccount;
  assignableRoles: string[];
  onChanged: () => void;
  onPasswordReset: (password: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState<"deactivate" | "reset" | null>(null);

  /** Returns the error, or null when it saved. The row shows what the server says, so a refused change never looks done. */
  async function patch(body: Record<string, unknown>): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error ?? "Could not save that change.";
        setError(message);
        return message;
      }
      if (data.initialPassword) onPasswordReset(data.initialPassword);
      onChanged();
      return null;
    } catch {
      setError("No connection. Try again.");
      return "No connection. Try again.";
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: staffAvatarTint(member.name) }}
          aria-hidden
        >
          {staffInitials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
            {member.name}
            {member.editable && (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="grid h-8 w-8 place-items-center rounded-lg !min-h-0"
                style={{ color: "var(--s-ink-faint)" }}
                aria-label={`Rename ${member.name}`}
                title="Rename"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {!member.isActive && <Chip tone="bad">Deactivated</Chip>}
            {member.mustChangePassword && member.isActive && (
              <Chip tone="warn">Hasn&apos;t set password</Chip>
            )}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--s-ink-faint)" }}>
            {member.email} · {ROLE_LABELS[member.role] ?? member.role}
            {member.hasPin ? " · PIN set" : " · no PIN"}
            {member.staffName ? ` · ${member.staffName}` : ""}
          </p>
        </div>
        {member.editable && (
          <div className="flex items-center gap-2 shrink-0">
            {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--s-ink-faint)" }} />}
            <select
              value={member.role}
              disabled={busy || member.isSelf}
              onChange={(event) => patch({ role: event.target.value })}
              className={`${inputClass} max-w-40 text-sm`}
              style={inputStyle}
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
            onClick={() => setConfirming("reset")}
            disabled={busy}
            className="text-xs !min-h-9 !py-1.5"
          >
            Reset password
          </AdminButton>
          {member.hasPin && (
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
            onClick={() => (member.isActive ? setConfirming("deactivate") : patch({ isActive: true }))}
            disabled={busy}
            className="text-xs !min-h-9 !py-1.5"
          >
            {member.isActive ? "Deactivate" : "Reactivate"}
          </AdminButton>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--s-bad)" }} role="alert">
          {error}
        </p>
      )}

      {renaming && (
        <RenameDialog
          name={member.name}
          onClose={() => setRenaming(false)}
          onSave={async (name) => {
            const failed = await patch({ name });
            if (!failed) setRenaming(false);
            return failed;
          }}
        />
      )}

      <ConfirmDialog
        open={confirming !== null}
        title={confirming === "reset" ? `Reset ${member.name}'s password?` : `Deactivate ${member.name}?`}
        message={
          confirming === "reset"
            ? "Their current password stops working at once. You get a one-time password to hand them."
            : "They can no longer sign in to the till or the back office. Their sales history stays. You can reactivate them later."
        }
        confirmLabel={confirming === "reset" ? "Reset password" : "Deactivate"}
        busy={busy}
        onConfirm={async () => {
          await patch(confirming === "reset" ? { resetPassword: true } : { isActive: false });
          setConfirming(null);
        }}
        onCancel={() => setConfirming(null)}
      />
    </li>
  );
}

function RenameDialog({
  name: initial,
  onClose,
  onSave,
}: {
  name: string;
  onClose: () => void;
  onSave: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name.");
    if (trimmed === initial) return onClose();
    setBusy(true);
    setError(null);
    const failed = await onSave(trimmed);
    setBusy(false);
    if (failed) setError(failed);
  }

  return (
    <Dialog
      open
      title="Rename"
      description="This is the name on the till sign-in, receipts and reports."
      onClose={() => !busy && onClose()}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form="rename-staff" variant="primary" loading={busy}>
            Save
          </AdminButton>
        </>
      }
    >
      <form id="rename-staff" onSubmit={submit} className="space-y-2">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputClass} style={inputStyle} autoFocus />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: "var(--s-bad)" }} role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
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

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy || !name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
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
    <Dialog
      open
      onClose={() => !busy && onClose()}
      title="Add someone"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form="add-staff" variant="primary" loading={busy} disabled={!name.trim() || !email.trim()}>
            Create
          </AdminButton>
        </>
      }
    >
      <form id="add-staff" onSubmit={submit} className="space-y-3">
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
      {error && <p className="text-sm" style={{ color: "var(--s-bad)" }} role="alert">{error}</p>}
      </form>
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
    <Dialog open onClose={onClose} title="One-time password">
      <div className="space-y-3">
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
      </div>
    </Dialog>
  );
}
