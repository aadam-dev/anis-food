"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader, Panel, AdminButton, Field, inputClass, inputStyle } from "@/components/admin/ui";

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

export default function InventoryClient({ initialItems }: { initialItems: InvRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [stock, setStock] = useState("0");
  const [low, setLow] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});

  const lowCount = items.filter((i) => i.low && i.isActive).length;

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          unit: unit.trim() || "unit",
          stock: Number(stock) || 0,
          lowStock: Number(low) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add the item.");
        return;
      }
      setItems((list) => [...list, data.item]);
      setName("");
      setStock("0");
      setLow("0");
      router.refresh();
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function move(item: InvRow, type: "RECEIVE" | "COUNT") {
    const raw = qty[item.id];
    const amount = Number(raw);
    if (!raw || Number.isNaN(amount) || amount < 0) return;
    const res = await fetch(`/api/admin/inventory/${item.id}/movement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, quantity: amount }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setItems((list) =>
      list.map((x) => (x.id === item.id ? { ...x, stock: data.stock, low: data.low } : x)),
    );
    setQty((q) => ({ ...q, [item.id]: "" }));
    router.refresh();
  }

  async function remove(item: InvRow) {
    if (!confirm(`Remove ${item.name} and its stock history?`)) return;
    const res = await fetch(`/api/admin/inventory/${item.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((list) => list.filter((x) => x.id !== item.id));
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock levels, receipts and counts — with low-stock alerts."
      />

      {lowCount > 0 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium"
          style={{ borderColor: "var(--s-warn)", color: "var(--s-warn)", background: "var(--s-hover)" }}
        >
          <AlertTriangle className="w-4 h-4" />
          {lowCount} item{lowCount === 1 ? " is" : "s are"} low on stock.
        </div>
      )}

      <Panel title="Add a stock item" className="p-5 mb-4">
        <div className="grid gap-3 sm:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto] sm:items-end">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rice (bag)" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Unit">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bag" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Opening">
            <input inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money`} style={inputStyle} />
          </Field>
          <Field label="Low at">
            <input inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputClass} money`} style={inputStyle} />
          </Field>
          <AdminButton variant="primary" onClick={add} disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </AdminButton>
        </div>
        {error && <p className="mt-2 text-sm" style={{ color: "var(--s-bad)" }}>{error}</p>}
      </Panel>

      <Panel title="Stock" className="p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            No stock items yet. Add your first above.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-40">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                    low at {item.lowStock} {item.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="money font-bold text-lg"
                    style={{ color: item.low ? "var(--s-warn)" : "var(--s-ink)" }}
                  >
                    {item.stock} {item.unit}
                  </span>
                  {item.low && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: "var(--s-warn)", color: "#fff" }}
                    >
                      Low
                    </span>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-1.5">
                  <input
                    inputMode="decimal"
                    value={qty[item.id] ?? ""}
                    onChange={(e) =>
                      setQty((q) => ({ ...q, [item.id]: e.target.value.replace(/[^\d.]/g, "") }))
                    }
                    placeholder="qty"
                    className={`${inputClass} money w-20`}
                    style={inputStyle}
                  />
                  <AdminButton onClick={() => move(item, "RECEIVE")}>Receive</AdminButton>
                  <AdminButton onClick={() => move(item, "COUNT")}>Set count</AdminButton>
                  <button
                    onClick={() => remove(item)}
                    aria-label={`Remove ${item.name}`}
                    className="h-9 w-9 grid place-items-center rounded-lg"
                    style={{ color: "var(--s-ink-faint)" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
