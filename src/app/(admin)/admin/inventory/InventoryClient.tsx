"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import { PageHeader, Panel, AdminButton, Field, Dialog, ConfirmDialog, Chip, inputClass, inputStyle } from "@/components/admin/ui";

export interface InvRow {
  id: string;
  name: string;
  unit: string;
  stock: number;
  lowStock: number;
  costPerUnit: number | null;
  isActive: boolean;
  low: boolean;
}

type Result = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

async function send(url: string, method: string, body?: unknown): Promise<Result> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "Could not save. Try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No connection. Try again." };
  }
}

/** A number box: null when empty, NaN when it is not a number. */
function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

const quantity = (value: number) => Number(value.toFixed(3)).toString();

export default function InventoryClient({ initialItems }: { initialItems: InvRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  // Fresh rows from the server replace the local copy.
  const [seen, setSeen] = useState(initialItems);
  if (seen !== initialItems) {
    setSeen(initialItems);
    setItems(initialItems);
  }
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [stock, setStock] = useState("0");
  const [low, setLow] = useState("0");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<InvRow | null>(null);
  const [removing, setRemoving] = useState<InvRow | null>(null);

  const active = items.filter((i) => i.isActive);
  const lowCount = active.filter((i) => i.low).length;
  const stockValue = active.reduce((sum, i) => sum + (i.costPerUnit ?? 0) * i.stock, 0);
  const uncosted = active.filter((i) => i.costPerUnit === null).length;

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    const opening = parseAmount(stock) ?? 0;
    const lowAt = parseAmount(low) ?? 0;
    const unitCost = parseAmount(cost);
    if ([opening, lowAt, unitCost].some((value) => Number.isNaN(value))) {
      setError("Use numbers only, like 12 or 12.5.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await send("/api/admin/inventory", "POST", {
      name: name.trim(),
      unit: unit.trim() || "unit",
      stock: opening,
      lowStock: lowAt,
      ...(unitCost !== null && { costPerUnit: roundMoney(unitCost) }),
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setItems((list) => [...list, result.data.item as InvRow]);
    setName("");
    setStock("0");
    setLow("0");
    setCost("");
    router.refresh();
  }

  async function move(item: InvRow, type: "RECEIVE" | "COUNT") {
    const amount = parseAmount(qty[item.id] ?? "");
    if (amount === null || Number.isNaN(amount)) {
      setRowError((e) => ({ ...e, [item.id]: "Enter a quantity first." }));
      return;
    }
    if (type === "RECEIVE" && amount === 0) {
      setRowError((e) => ({ ...e, [item.id]: "Enter how much came in." }));
      return;
    }
    setRowBusy(item.id);
    setRowError((e) => ({ ...e, [item.id]: "" }));
    const result = await send(`/api/admin/inventory/${item.id}/movement`, "POST", { type, quantity: amount });
    setRowBusy(null);
    if (!result.ok) {
      setRowError((e) => ({ ...e, [item.id]: result.error }));
      return;
    }
    const { stock: next, low: isLow } = result.data as { stock: number; low: boolean };
    setItems((list) => list.map((x) => (x.id === item.id ? { ...x, stock: Number(next), low: Boolean(isLow) } : x)));
    setQty((q) => ({ ...q, [item.id]: "" }));
    router.refresh();
  }

  async function remove(item: InvRow) {
    setRowBusy(item.id);
    const result = await send(`/api/admin/inventory/${item.id}`, "DELETE");
    setRowBusy(null);
    setRemoving(null);
    if (!result.ok) {
      setRowError((e) => ({ ...e, [item.id]: result.error }));
      return;
    }
    setItems((list) => list.filter((x) => x.id !== item.id));
    router.refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Inventory"
        description="Stock levels, deliveries and counts, with low-stock alerts."
        actions={
          <div className="flex flex-wrap gap-2">
            <Chip tone="neutral">Stock value {formatGHS(stockValue)}</Chip>
            {uncosted > 0 && <Chip tone="warn">{uncosted} without a cost</Chip>}
          </div>
        }
      />

      {lowCount > 0 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{ color: "var(--s-warn)", background: "var(--s-warn-soft)" }}
          role="status"
        >
          <AlertTriangle className="h-4 w-4" />
          {lowCount} item{lowCount === 1 ? " is" : "s are"} low on stock.
        </div>
      )}

      <Panel title="Add a stock item" className="mb-4 p-5">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.9fr_auto] sm:items-end">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rice (bag)" maxLength={80} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Unit">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bag" maxLength={16} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Opening stock">
            <input inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money`} style={inputStyle} />
          </Field>
          <Field label="Low at">
            <input inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money`} style={inputStyle} />
          </Field>
          <Field label="Cost / unit (GH₵)">
            <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Optional" className={`${inputClass} money`} style={inputStyle} />
          </Field>
          <AdminButton type="submit" variant="primary" loading={busy} disabled={!name.trim()}>
            {!busy && <Plus className="h-4 w-4" />}
            Add
          </AdminButton>
        </form>
        {error && (
          <p className="mt-2 text-sm" style={{ color: "var(--s-bad)" }} role="alert">
            {error}
          </p>
        )}
      </Panel>

      <Panel title="Stock" explainer="Receive adds a delivery to the stock. Set count replaces it with what you counted on the shelf." className="overflow-hidden p-0">
        {items.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            No stock items yet. Add your first above.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3" style={{ opacity: item.isActive ? 1 : 0.6 }}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-40 flex-1">
                    <p className="font-semibold">
                      {item.name}
                      {!item.isActive && (
                        <span className="ml-2 text-xs font-semibold" style={{ color: "var(--s-ink-faint)" }}>
                          not tracked
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      Low at {quantity(item.lowStock)} {item.unit}
                      {" · "}
                      {item.costPerUnit === null ? "no cost yet" : `${formatGHS(item.costPerUnit)} per ${item.unit}`}
                      {item.costPerUnit !== null && ` · worth ${formatGHS(item.costPerUnit * item.stock)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="money text-lg font-bold" style={{ color: item.low ? "var(--s-warn)" : "var(--s-ink)" }}>
                      {quantity(item.stock)} {item.unit}
                    </span>
                    {item.low && item.isActive && <Chip tone="warn">Low</Chip>}
                  </div>

                  <div className="flex items-center gap-1.5 sm:ml-auto">
                    <label className="sr-only" htmlFor={`qty-${item.id}`}>
                      Quantity of {item.name} in {item.unit}
                    </label>
                    <input
                      id={`qty-${item.id}`}
                      inputMode="decimal"
                      value={qty[item.id] ?? ""}
                      onChange={(e) => setQty((q) => ({ ...q, [item.id]: e.target.value.replace(/[^\d.]/g, "") }))}
                      placeholder={item.unit}
                      className={`${inputClass} money w-24`}
                      style={inputStyle}
                    />
                    <AdminButton onClick={() => move(item, "RECEIVE")} disabled={rowBusy !== null}>
                      Receive
                    </AdminButton>
                    <AdminButton onClick={() => move(item, "COUNT")} disabled={rowBusy !== null}>
                      Set count
                    </AdminButton>
                    <IconButton label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Remove ${item.name}`} onClick={() => setRemoving(item)} disabled={rowBusy !== null}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
                {rowError[item.id] && (
                  <p className="mt-1 text-right text-xs" style={{ color: "var(--s-bad)" }} role="alert">
                    {rowError[item.id]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editing && (
        <EditStockDialog
          key={editing.id}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(patch) => {
            setItems((list) =>
              list.map((x) => {
                if (x.id !== editing.id) return x;
                const next = { ...x, ...patch };
                return { ...next, low: next.stock <= next.lowStock };
              }),
            );
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.name ?? "this item"}?`}
        message="Its stock level and full movement history will be deleted. This cannot be undone. To stop tracking it but keep the history, edit it and switch off tracking instead."
        confirmLabel="Remove"
        busy={rowBusy !== null && rowBusy === removing?.id}
        onConfirm={() => removing && remove(removing)}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}

function EditStockDialog({
  item,
  onClose,
  onSaved,
}: {
  item: InvRow;
  onClose: () => void;
  onSaved: (patch: Partial<InvRow>) => void;
}) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [low, setLow] = useState(quantity(item.lowStock));
  const [cost, setCost] = useState(item.costPerUnit === null ? "" : item.costPerUnit.toFixed(2));
  const [isActive, setIsActive] = useState(item.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) return setError("Give the item a name.");
    if (!unit.trim()) return setError("Give the item a unit, like bag or kg.");
    const lowAt = parseAmount(low);
    const unitCost = parseAmount(cost);
    if (lowAt === null || Number.isNaN(lowAt)) return setError("Enter the low-stock level as a number.");
    if (Number.isNaN(unitCost)) return setError("The cost is not a number.");

    const patch: Partial<InvRow> = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if (unit.trim() !== item.unit) patch.unit = unit.trim();
    if (lowAt !== item.lowStock) patch.lowStock = lowAt;
    const roundedCost = unitCost === null ? null : roundMoney(unitCost);
    if (roundedCost !== item.costPerUnit) patch.costPerUnit = roundedCost;
    if (isActive !== item.isActive) patch.isActive = isActive;
    if (Object.keys(patch).length === 0) return onClose();

    setBusy(true);
    setError(null);
    const result = await send(`/api/admin/inventory/${item.id}`, "PATCH", patch);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onSaved(patch);
  }

  return (
    <Dialog
      open
      title={`Edit ${item.name}`}
      description="Stock levels change through Receive and Set count, so every change is on record."
      onClose={() => !busy && onClose()}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form="edit-stock" variant="primary" loading={busy}>
            Save
          </AdminButton>
        </>
      }
    >
      <form id="edit-stock" onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} style={inputStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={16} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Low at">
            <input inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money`} style={inputStyle} />
          </Field>
        </div>
        <Field label="Cost per unit (GH₵)" hint="What one unit costs to buy. Leave empty if unknown.">
          <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money`} style={inputStyle} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5" />
          Track this item (off hides it from low-stock alerts and the stock value)
        </label>
        {error && (
          <p className="text-sm" style={{ color: "var(--s-bad)" }} role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-xl disabled:opacity-30"
      style={{ color: "var(--s-ink-muted)" }}
    >
      {children}
    </button>
  );
}
