"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { PageHeader, Panel, AdminButton, Field, Dialog, ConfirmDialog, inputClass, inputStyle } from "@/components/admin/ui";

export interface TableRow {
  id: string;
  label: string;
  zone: string;
  seats: number;
  sortOrder: number;
  isActive: boolean;
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

const bySortOrder = (a: TableRow, b: TableRow) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, undefined, { numeric: true });

export default function TablesClient({ initialTables }: { initialTables: TableRow[] }) {
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);
  // Fresh rows from the server replace the local copy.
  const [seen, setSeen] = useState(initialTables);
  if (seen !== initialTables) {
    setSeen(initialTables);
    setTables(initialTables);
  }
  const [label, setLabel] = useState("");
  const [zone, setZone] = useState("Main Hall");
  const [seats, setSeats] = useState("4");
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [removing, setRemoving] = useState<TableRow | null>(null);

  const zones = [...new Set(tables.map((t) => t.zone))].sort();

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim() || busy) return;
    const seatCount = Number(seats);
    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 50) {
      setError("Seats must be between 1 and 50.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await send("/api/admin/tables", "POST", { label: label.trim(), zone: zone.trim() || "Main", seats: seatCount });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setTables((t) => [...t, result.data.table as TableRow]);
    setLabel("");
    router.refresh();
  }

  async function patch(row: TableRow, data: Partial<TableRow>): Promise<string | null> {
    setRowBusy(row.id);
    setError(null);
    const before = tables;
    setTables((t) => t.map((x) => (x.id === row.id ? { ...x, ...data } : x)));
    const result = await send(`/api/admin/tables/${row.id}`, "PATCH", data);
    setRowBusy(null);
    if (!result.ok) {
      setTables(before);
      setError(result.error);
      return result.error;
    }
    router.refresh();
    return null;
  }

  async function move(zoneRows: TableRow[], index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= zoneRows.length) return;
    const ordered = [...zoneRows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setRowBusy(ordered[target].id);
    setError(null);
    // Renumber the zone so rows that share a number still land in order.
    for (const [position, row] of ordered.entries()) {
      if (row.sortOrder === position + 1) continue;
      const result = await send(`/api/admin/tables/${row.id}`, "PATCH", { sortOrder: position + 1 });
      if (!result.ok) {
        setError(result.error);
        break;
      }
      setTables((t) => t.map((x) => (x.id === row.id ? { ...x, sortOrder: position + 1 } : x)));
    }
    setRowBusy(null);
    router.refresh();
  }

  async function remove(row: TableRow) {
    setRowBusy(row.id);
    const result = await send(`/api/admin/tables/${row.id}`, "DELETE");
    setRowBusy(null);
    setRemoving(null);
    if (!result.ok) return setError(result.error);
    setTables((t) => t.filter((x) => x.id !== row.id));
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow="Shop" title="Tables" description="The dining room, as it appears on the till floor." />

      <Panel title="Add a table" className="mb-4 p-5">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto] sm:items-end">
          <Field label="Label">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="T5" maxLength={20} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Zone">
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Main Hall"
              maxLength={40}
              list="table-zones"
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
          <AdminButton type="submit" variant="primary" loading={busy} disabled={!label.trim()}>
            {!busy && <Plus className="h-4 w-4" />}
            Add
          </AdminButton>
        </form>
        <datalist id="table-zones">
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      </Panel>

      {error && (
        <p className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ color: "var(--s-bad)", background: "var(--s-bad-soft)" }} role="alert">
          {error}
        </p>
      )}

      {zones.map((z) => {
        const zoneRows = tables.filter((t) => t.zone === z).sort(bySortOrder);
        return (
          <Panel key={z} title={z} className="mb-4 overflow-hidden p-0">
            <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
              {zoneRows.map((row, index) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ opacity: row.isActive ? 1 : 0.65 }}>
                  <span className="w-16 text-lg font-bold">{row.label}</span>
                  <span className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
                    {row.seats} seat{row.seats === 1 ? "" : "s"}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <IconButton label={`Move ${row.label} up`} onClick={() => move(zoneRows, index, -1)} disabled={index === 0 || rowBusy !== null}>
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`Move ${row.label} down`}
                      onClick={() => move(zoneRows, index, 1)}
                      disabled={index === zoneRows.length - 1 || rowBusy !== null}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.isActive}
                      disabled={rowBusy === row.id}
                      onClick={() => patch(row, { isActive: !row.isActive })}
                      className="rounded-full px-3 py-1 text-xs font-semibold !min-h-9 disabled:opacity-50"
                      style={{
                        background: row.isActive ? "var(--s-good)" : "var(--s-sunk)",
                        color: row.isActive ? "#fff" : "var(--s-ink-muted)",
                      }}
                      title={row.isActive ? "On the till floor. Tap to hide." : "Hidden from the till. Tap to show."}
                    >
                      {row.isActive ? "On the floor" : "Hidden"}
                    </button>
                    <IconButton label={`Edit ${row.label}`} onClick={() => setEditing(row)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Remove ${row.label}`} onClick={() => setRemoving(row)} disabled={rowBusy !== null}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}

      {tables.length === 0 && (
        <p className="px-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          No tables yet. Add your first above.
        </p>
      )}

      {editing && (
        <EditTableDialog
          key={editing.id}
          row={editing}
          zones={zones}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            const failed = await patch(editing, data);
            if (!failed) setEditing(null);
            return failed;
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.label ?? "this table"}?`}
        message="It disappears from the till floor. Past orders keep their record of it. To take it out for a while, hide it instead."
        confirmLabel="Remove"
        busy={rowBusy !== null && rowBusy === removing?.id}
        onConfirm={() => removing && remove(removing)}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}

function EditTableDialog({
  row,
  zones,
  onClose,
  onSave,
}: {
  row: TableRow;
  zones: string[];
  onClose: () => void;
  onSave: (data: Partial<TableRow>) => Promise<string | null>;
}) {
  const [label, setLabel] = useState(row.label);
  const [zone, setZone] = useState(row.zone);
  const [seats, setSeats] = useState(String(row.seats));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const seatCount = Number(seats);
    if (!label.trim()) return setError("Give the table a label.");
    if (!zone.trim()) return setError("Give the table a zone.");
    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 50) return setError("Seats must be between 1 and 50.");
    const data: Partial<TableRow> = {};
    if (label.trim() !== row.label) data.label = label.trim();
    if (zone.trim() !== row.zone) data.zone = zone.trim();
    if (seatCount !== row.seats) data.seats = seatCount;
    if (Object.keys(data).length === 0) return onClose();
    setBusy(true);
    setError(null);
    const failed = await onSave(data);
    setBusy(false);
    if (failed) setError(failed);
  }

  return (
    <Dialog
      open
      title={`Edit ${row.label}`}
      onClose={() => !busy && onClose()}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form="edit-table" variant="primary" loading={busy}>
            Save
          </AdminButton>
        </>
      }
    >
      <form id="edit-table" onSubmit={submit} className="space-y-3">
        <Field label="Label">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={20} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Zone" hint="Pick an existing zone or type a new one.">
          <input value={zone} onChange={(e) => setZone(e.target.value)} maxLength={40} list="edit-table-zones" className={inputClass} style={inputStyle} />
          <datalist id="edit-table-zones">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
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
