"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FolderCog, Paperclip, Pencil, Plus, Search, Store, Trash2, Wallet } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { businessDay } from "@/lib/session-utils";
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
import { PAYMENT_LABELS } from "@/components/admin/labels";

export interface ExpenseCategory {
  id: string;
  name: string;
  isFixed: boolean;
  /** How many expenses are filed under it; a used category cannot be deleted. */
  count: number;
}

export interface AdminExpense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  category: string;
  isFixed: boolean;
  incurredOn: string;
  paymentMethod: string;
  receiptUrl: string | null;
  /** Spent from the till: amount, day and method are fixed by the shift. */
  fromTill: boolean;
}

export interface AdminDeposit {
  id: string;
  amount: number;
  reason: string;
  destination: string;
  at: string;
}

const METHODS = ["CASH", "MOMO", "CARD", "BANK_TRANSFER"] as const;

function shortDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
}

export default function ExpensesClient({
  expenses,
  deposits,
  categories,
}: {
  expenses: AdminExpense[];
  deposits: AdminDeposit[];
  categories: ExpenseCategory[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminExpense | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminExpense | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [managing, setManaging] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return expenses.filter(
      (expense) =>
        (!category || expense.categoryId === category) &&
        (!needle || expense.description.toLowerCase().includes(needle) || expense.category.toLowerCase().includes(needle)),
    );
  }, [expenses, query, category]);
  const shownTotal = shown.reduce((sum, expense) => sum + expense.amount, 0);

  async function remove() {
    if (!deleting) return;
    setDeleteBusy(true);
    await fetch("/api/admin/expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleting.id }),
    }).catch(() => null);
    setDeleteBusy(false);
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          <div className="relative min-w-[12rem] flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--s-ink-faint)" }}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search what it was for"
              className={`${inputClass} pl-10 text-sm`}
              style={inputStyle}
              aria-label="Search expenses"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={`${inputClass} w-auto text-sm`}
            style={inputStyle}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <AdminButton variant="ghost" onClick={() => setManaging(true)}>
            <FolderCog className="h-4 w-4" /> Categories
          </AdminButton>
          <AdminButton variant="primary" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add expense
          </AdminButton>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={<Wallet />}
            title={expenses.length === 0 ? "No expenses in this period" : "Nothing matches that search"}
            hint={expenses.length === 0 ? "Add one here, or spend from the till and it appears automatically." : undefined}
          />
        ) : (
          <>
            {/* Phone: tappable rows */}
            <ul className="divide-y border-t md:hidden" style={{ borderColor: "var(--s-border)" }}>
              {shown.map((expense) => (
                <li key={expense.id} style={{ borderColor: "var(--s-border)" }}>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setEditing(expense)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{expense.description}</span>
                      <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--s-ink-faint)" }}>
                        {shortDate(expense.incurredOn)} · {expense.category}
                        {expense.fromTill && " · from the till"}
                      </span>
                    </span>
                    <span className="money whitespace-nowrap font-bold">{formatGHS(expense.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Desk: table */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>What for</th>
                    <th>Category</th>
                    <th>Paid with</th>
                    <th className="num">Amount</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((expense) => (
                    <tr key={expense.id}>
                      <td className="muted whitespace-nowrap">{shortDate(expense.incurredOn)}</td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{expense.description}</span>
                          {expense.receiptUrl && (
                            <a
                              href={expense.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Receipt photo"
                              style={{ color: "var(--s-ink-faint)" }}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {expense.fromTill && (
                            <Chip tone="accent">
                              <Store className="h-3 w-3" /> Till
                            </Chip>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="whitespace-nowrap">{expense.category}</span>
                        {expense.isFixed && (
                          <span className="ml-1.5 text-xs" style={{ color: "var(--s-ink-faint)" }}>
                            fixed
                          </span>
                        )}
                      </td>
                      <td className="muted whitespace-nowrap">{PAYMENT_LABELS[expense.paymentMethod] ?? expense.paymentMethod}</td>
                      <td className="num font-semibold">{formatGHS(expense.amount)}</td>
                      <td className="w-24 whitespace-nowrap text-right">
                        <button
                          onClick={() => setEditing(expense)}
                          className="inline-grid h-9 w-9 place-items-center rounded-xl hover:bg-[var(--s-hover)]"
                          style={{ color: "var(--s-ink-muted)" }}
                          aria-label={`Edit ${expense.description}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(expense)}
                          className="inline-grid h-9 w-9 place-items-center rounded-xl hover:bg-[var(--s-bad-soft)]"
                          style={{ color: "var(--s-ink-faint)" }}
                          aria-label={`Delete ${expense.description}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>
                      {shown.length} expense{shown.length === 1 ? "" : "s"}
                      {shown.length !== expenses.length && " shown"}
                    </td>
                    <td className="num">{formatGHS(shownTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </Table>
            </div>
          </>
        )}
      </Panel>

      <Panel
        className="mt-4"
        title="Deposits"
        explainer="Cash moved from the drawer to MoMo or the bank. Transfers, so not in the total above."
      >
        {deposits.length === 0 ? (
          <p className="px-5 pb-5 text-sm" style={{ color: "var(--s-ink-faint)" }}>
            No deposits in this period.
          </p>
        ) : (
          <ul className="divide-y border-t" style={{ borderColor: "var(--s-border)" }}>
            {deposits.map((deposit) => (
              <li key={deposit.id} className="flex items-center gap-3 px-4 py-3 sm:px-5" style={{ borderColor: "var(--s-border)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{deposit.reason}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--s-ink-faint)" }}>
                    {deposit.destination === "MOMO" ? "Into MoMo" : deposit.destination === "SAFE" ? "Into the safe" : "Into the bank"} ·{" "}
                    {new Date(deposit.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" })}
                  </p>
                </div>
                <span className="money whitespace-nowrap font-bold">{formatGHS(deposit.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editing && (
        <ExpenseDialog
          expense={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onDelete={
            editing === "new"
              ? undefined
              : () => {
                  setDeleting(editing);
                  setEditing(null);
                }
          }
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this expense?"
        message={
          deleting?.fromTill
            ? `"${deleting.description}" was cash spent from the till. The cash still left the drawer, so the report will keep it as a till spend with no category.`
            : `"${deleting?.description}" (${formatGHS(deleting?.amount ?? 0)}) will be removed from the books. This cannot be undone.`
        }
        busy={deleteBusy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />

      <CategoryManager open={managing} categories={categories} onClose={() => setManaging(false)} onChanged={() => router.refresh()} />
    </>
  );
}

function ExpenseDialog({
  expense,
  categories,
  onClose,
  onDone,
  onDelete,
}: {
  expense: AdminExpense | null;
  categories: ExpenseCategory[];
  onClose: () => void;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [incurredOn, setIncurredOn] = useState(expense?.incurredOn ?? businessDay());
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? "CASH");
  const [receiptUrl, setReceiptUrl] = useState(expense?.receiptUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const locked = expense?.fromTill ?? false;

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/expenses/receipt", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error ?? "Could not upload that photo.");
      else setReceiptUrl(data.url);
    } catch {
      setError("No connection. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/expenses", {
        method: expense ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(expense && { id: expense.id }),
          categoryId,
          description: description.trim(),
          receiptUrl: receiptUrl || null,
          ...(!locked && { amount: Number(amount) || 0, incurredOn, paymentMethod }),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save that.");
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
    <Dialog
      open
      title={expense ? "Edit expense" : "Add an expense"}
      description={locked ? "Spent from the till, so the amount, day and method come from the shift." : undefined}
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <AdminButton variant="danger" onClick={onDelete} className="mr-auto">
              <Trash2 className="h-4 w-4" /> Delete
            </AdminButton>
          )}
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={submit}
            loading={busy}
            disabled={!description.trim() || !amount || !categoryId || uploading}
          >
            Save
          </AdminButton>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="What was it for?">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Tomatoes and onions"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <input
              inputMode="decimal"
              value={amount}
              disabled={locked}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              className={`${inputClass} money text-right disabled:opacity-60`}
              style={inputStyle}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={incurredOn}
              disabled={locked}
              onChange={(event) => setIncurredOn(event.target.value)}
              className={`${inputClass} disabled:opacity-60`}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass} style={inputStyle}>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Paid with">
            <select
              value={paymentMethod}
              disabled={locked}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={`${inputClass} disabled:opacity-60`}
              style={inputStyle}
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_LABELS[method]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium">Receipt photo</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
          {receiptUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- user upload on the storage host */}
              <img src={receiptUrl} alt="Receipt" className="h-16 w-16 rounded-xl border object-cover" style={{ borderColor: "var(--s-border)" }} />
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold" style={{ color: "var(--s-brand)" }}>
                View
              </a>
              <button type="button" onClick={() => setReceiptUrl("")} className="text-sm font-semibold" style={{ color: "var(--s-ink-muted)" }}>
                Remove
              </button>
            </div>
          ) : (
            <AdminButton type="button" onClick={() => fileRef.current?.click()} loading={uploading}>
              <Camera className="h-4 w-4" /> {uploading ? "Uploading…" : "Add a photo"}
            </AdminButton>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm" style={{ color: "var(--s-bad)" }}>
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function CategoryManager({
  open,
  categories,
  onClose,
  onChanged,
}: {
  open: boolean;
  categories: ExpenseCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [isFixed, setIsFixed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "POST" | "PATCH" | "DELETE", body: unknown, key: string) {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch("/api/admin/expense-categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "That did not save.");
        return false;
      }
      onChanged();
      return true;
    } catch {
      setError("No connection. Try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      title="Expense categories"
      description="Fixed costs come round whatever you sell (rent, wifi). Variable ones move with trade (stock, gas)."
      onClose={onClose}
    >
      <ul className="divide-y rounded-2xl border" style={{ borderColor: "var(--s-border)" }}>
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-2 px-3 py-2" style={{ borderColor: "var(--s-border)" }}>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {category.name}
              <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--s-ink-faint)" }}>
                {category.count} used
              </span>
            </span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => call("PATCH", { id: category.id, isFixed: !category.isFixed }, category.id)}
              className="!min-h-9 rounded-full px-3 text-xs font-bold"
              style={{
                background: category.isFixed ? "var(--s-sunk)" : "var(--s-accent-soft)",
                color: category.isFixed ? "var(--s-ink-muted)" : "var(--s-accent)",
              }}
              title="Switch between fixed and variable"
            >
              {category.isFixed ? "Fixed" : "Variable"}
            </button>
            {category.count === 0 && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => call("DELETE", { id: category.id }, category.id)}
                className="grid !min-h-9 h-9 w-9 place-items-center rounded-xl"
                style={{ color: "var(--s-ink-faint)" }}
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <Field label="New category">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cooking gas" className={inputClass} style={inputStyle} />
          </Field>
        </div>
        <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={isFixed} onChange={(event) => setIsFixed(event.target.checked)} className="h-4 w-4" />
          Fixed
        </label>
        <AdminButton
          variant="primary"
          loading={busy === "new"}
          disabled={name.trim().length < 2}
          onClick={async () => {
            if (await call("POST", { name: name.trim(), isFixed }, "new")) {
              setName("");
              setIsFixed(false);
            }
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </AdminButton>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "var(--s-bad)" }}>
          {error}
        </p>
      )}
    </Dialog>
  );
}
