"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { businessDay } from "@/lib/session-utils";
import { Panel, EmptyState, Chip, AdminButton, Field, inputClass, inputStyle } from "@/components/admin/ui";
import { PAYMENT_LABELS } from "@/components/admin/labels";

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface AdminExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  incurredOn: string;
  paymentMethod: string;
}

export default function ExpensesClient({
  expenses,
  categories,
  month,
  total,
}: {
  expenses: AdminExpense[];
  categories: ExpenseCategory[];
  month: string;
  total: number;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(event) => router.push(`/admin/expenses?month=${event.target.value}`)}
          className="rounded-lg border px-3 py-2 text-sm min-h-11"
          style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
          aria-label="Month"
        />
        <Chip tone="bad">{formatGHS(total)} this month</Chip>
        <AdminButton variant="primary" onClick={() => setAdding(true)} className="ml-auto">
          <Plus className="w-4 h-4" /> Add expense
        </AdminButton>
      </div>

      <Panel>
        {expenses.length === 0 ? (
          <EmptyState title="No expenses this month" hint="Add one with the button above." />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {expenses.map((expense) => (
              <li key={expense.id} className="px-4 py-3 sm:px-5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{expense.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--s-ink-faint)" }}>
                    {expense.category} ·{" "}
                    {new Date(`${expense.incurredOn}T12:00:00Z`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "Africa/Accra",
                    })}{" "}
                    · {PAYMENT_LABELS[expense.paymentMethod] ?? expense.paymentMethod}
                  </p>
                </div>
                <span className="money font-semibold whitespace-nowrap">
                  {formatGHS(expense.amount)}
                </span>
                <DeleteButton
                  id={expense.id}
                  onDone={() => router.refresh()}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {adding && (
        <AddDialog
          categories={categories}
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

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/expenses", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        onDone();
      }}
      className="h-9 w-9 grid place-items-center rounded-lg shrink-0"
      style={{ color: "var(--s-ink-faint)" }}
      aria-label="Delete expense"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}

function AddDialog({
  categories,
  onClose,
  onDone,
}: {
  categories: ExpenseCategory[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [incurredOn, setIncurredOn] = useState(businessDay());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          description: description.trim(),
          amount: Number(amount) || 0,
          incurredOn,
          paymentMethod,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border p-5 space-y-3"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <h2 className="font-bold">Add an expense</h2>

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
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              className={`${inputClass} money text-right`}
              style={inputStyle}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={incurredOn}
              onChange={(event) => setIncurredOn(event.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Paid with">
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="CASH">Cash</option>
              <option value="MOMO">Mobile Money</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
            </select>
          </Field>
        </div>

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
            disabled={busy || !description.trim() || !amount}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white min-h-11 disabled:opacity-50"
            style={{ background: "var(--s-brand)" }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
