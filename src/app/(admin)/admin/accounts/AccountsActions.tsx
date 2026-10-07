"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { AdminButton, ConfirmDialog, Dialog, Field, inputClass, inputStyle } from "@/components/admin/ui";

type Account = "SAFE" | "MOMO" | "BANK";
type Kind = "transfer" | "bolt_payout" | "opening" | "adjustment" | "withdrawal" | "capital";

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "transfer", label: "Move money", hint: "Between the safe, MoMo and the bank, e.g. MoMo cashed out to the safe." },
  { value: "bolt_payout", label: "Bolt payout", hint: "What Bolt paid you for its orders, after its commission." },
  { value: "opening", label: "Opening balance", hint: "What an account holds today. Earlier history is not counted." },
  { value: "adjustment", label: "Correct a balance", hint: "Enter what it really holds after counting or checking a statement." },
  { value: "withdrawal", label: "Owner takes money out", hint: "Not a cost of the business, but it leaves the account." },
  { value: "capital", label: "Owner puts money in", hint: "Money added to the business, e.g. to cover a shortfall." },
];

export default function AccountsActions({ accounts }: { accounts: { key: Account; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("transfer");
  const [from, setFrom] = useState<Account>("MOMO");
  const [to, setTo] = useState<Account>("BANK");
  const [account, setAccount] = useState<Account>("MOMO");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountSelect = (value: Account, onChange: (next: Account) => void, only?: Account[]) => (
    <select value={value} onChange={(event) => onChange(event.target.value as Account)} className={inputClass} style={inputStyle}>
      {accounts
        .filter((entry) => !only || only.includes(entry.key))
        .map((entry) => (
          <option key={entry.key} value={entry.key}>
            {entry.label}
          </option>
        ))}
    </select>
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || (kind !== "opening" && kind !== "adjustment" && value <= 0)) {
      return setError("Enter an amount.");
    }
    const body: Record<string, unknown> = { type: kind, day, reason: reason.trim() };
    if (kind === "transfer") Object.assign(body, { from, to, amount: value });
    if (kind === "bolt_payout") Object.assign(body, { to: account === "SAFE" ? "BANK" : account, amount: value });
    if (kind === "opening") Object.assign(body, { account, amount: value });
    if (kind === "adjustment") Object.assign(body, { account, counted: value });
    if (kind === "withdrawal") Object.assign(body, { from: account, amount: value });
    if (kind === "capital") Object.assign(body, { to: account, amount: value });

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setError(data.error ?? "Could not record that.");
      setOpen(false);
      setAmount("");
      setReason("");
      router.refresh();
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const current = KINDS.find((entry) => entry.value === kind)!;

  return (
    <>
      <AdminButton variant="primary" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="h-4 w-4" /> Record movement
      </AdminButton>
      <Dialog
        open={open}
        title="Record a movement"
        description="Sales, till deposits, expenses and wages are recorded on their own. Use this for everything else."
        onClose={() => !busy && setOpen(false)}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" form="money-form" variant="primary" loading={busy}>
              Record
            </AdminButton>
          </>
        }
      >
        <form id="money-form" onSubmit={submit} className="space-y-3">
          <Field label="What happened" hint={current.hint}>
            <select value={kind} onChange={(event) => setKind(event.target.value as Kind)} className={inputClass} style={inputStyle}>
              {KINDS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>

          {kind === "transfer" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">{accountSelect(from, setFrom)}</Field>
              <Field label="To">{accountSelect(to, setTo)}</Field>
            </div>
          ) : (
            <Field label={kind === "withdrawal" ? "Taken from" : kind === "bolt_payout" || kind === "capital" ? "Paid into" : "Account"}>
              {accountSelect(account, setAccount, kind === "bolt_payout" ? ["MOMO", "BANK"] : undefined)}
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={kind === "adjustment" ? "It really holds (GH₵)" : kind === "opening" ? "It holds (GH₵)" : "Amount (GH₵)"}>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d.-]/g, ""))}
                inputMode="decimal"
                className={`${inputClass} money`}
                style={inputStyle}
              />
            </Field>
            <Field label="On">
              <input type="date" value={day} onChange={(event) => setDay(event.target.value)} className={inputClass} style={inputStyle} />
            </Field>
          </div>

          <Field label={kind === "withdrawal" || kind === "adjustment" ? "Reason" : "Note (optional)"}>
            <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} className={inputClass} style={inputStyle} />
          </Field>

          {error && (
            <p className="text-sm" style={{ color: "var(--s-bad)" }} role="alert">
              {error}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}

/** Remove a hand-recorded line typed in by mistake (a transfer goes as a pair). */
export function DeleteEntryButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="grid h-9 w-9 place-items-center rounded-xl"
        style={{ color: "var(--s-ink-faint)" }}
        aria-label={`Remove ${label}`}
        title="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={confirming}
        title="Remove this movement?"
        message={`“${label}”. For a transfer, both sides go. The audit trail keeps a record of it.`}
        confirmLabel="Remove"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          await fetch(`/api/admin/accounts/${id}`, { method: "DELETE" }).catch(() => null);
          setBusy(false);
          setConfirming(false);
          router.refresh();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
