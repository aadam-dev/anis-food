"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { PageHeader, Panel, AdminButton, Field, inputClass, inputStyle } from "@/components/admin/ui";

export interface TableRow {
  id: string;
  label: string;
  zone: string;
  seats: number;
  sortOrder: number;
  isActive: boolean;
}

export default function TablesClient({ initialTables }: { initialTables: TableRow[] }) {
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);
  const [label, setLabel] = useState("");
  const [zone, setZone] = useState("Main Hall");
  const [seats, setSeats] = useState("4");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zones = [...new Set(tables.map((t) => t.zone))];

  async function add() {
    if (!label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), zone: zone.trim() || "Main", seats: Number(seats) || 4 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add the table.");
        return;
      }
      setTables((t) => [...t, data.table]);
      setLabel("");
      router.refresh();
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: TableRow) {
    setTables((t) => t.map((x) => (x.id === row.id ? { ...x, isActive: !x.isActive } : x)));
    await fetch(`/api/admin/tables/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    router.refresh();
  }

  async function remove(row: TableRow) {
    if (!confirm(`Remove ${row.label}? Past orders keep their record.`)) return;
    const res = await fetch(`/api/admin/tables/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not remove the table.");
      return;
    }
    setTables((t) => t.filter((x) => x.id !== row.id));
    router.refresh();
  }

  return (
    <>
      <PageHeader title="Tables" description="The dining room, as it appears on the till floor." />

      <Panel title="Add a table" className="p-5 mb-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto] sm:items-end">
          <Field label="Label">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="T5"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="Zone">
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Main Hall"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="Seats">
            <input
              inputMode="numeric"
              value={seats}
              onChange={(e) => setSeats(e.target.value.replace(/[^\d]/g, ""))}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <AdminButton variant="primary" onClick={add} disabled={busy || !label.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </AdminButton>
        </div>
        {error && (
          <p className="mt-2 text-sm" style={{ color: "var(--s-bad)" }}>
            {error}
          </p>
        )}
      </Panel>

      {zones.map((z) => (
        <Panel key={z} title={z} className="p-0 mb-4 overflow-hidden">
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {tables
              .filter((t) => t.zone === z)
              .map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="font-bold text-lg w-16">{row.label}</span>
                  <span className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
                    {row.seats} seats
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(row)}
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        background: row.isActive ? "var(--s-good)" : "var(--s-hover)",
                        color: row.isActive ? "#fff" : "var(--s-ink-muted)",
                      }}
                    >
                      {row.isActive ? "Active" : "Hidden"}
                    </button>
                    <button
                      onClick={() => remove(row)}
                      aria-label={`Remove ${row.label}`}
                      className="h-9 w-9 grid place-items-center rounded-lg"
                      style={{ color: "var(--s-ink-faint)" }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </Panel>
      ))}

      {tables.length === 0 && (
        <p className="text-sm px-1" style={{ color: "var(--s-ink-muted)" }}>
          No tables yet. Add your first above.
        </p>
      )}
    </>
  );
}
