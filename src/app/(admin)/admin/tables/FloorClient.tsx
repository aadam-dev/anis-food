"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, AdminButton, inputClass, inputStyle } from "@/components/admin/ui";
import type { FloorPayload } from "@/lib/dining-floor";

type Table = FloorPayload["areas"][number]["tables"][number];

export default function FloorClient({ floor }: { floor: FloorPayload }) {
  const router = useRouter();
  const [areaId, setAreaId] = useState(floor.areas[0]?.id ?? "");
  const [areaName, setAreaName] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [editing, setEditing] = useState<Table | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const area = floor.areas.find((entry) => entry.id === areaId) ?? floor.areas[0];

  async function send(path: string, method: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "That did not save.");
        return;
      }
      router.refresh();
    } catch {
      setError("No connection.");
    } finally {
      setBusy(false);
    }
  }

  function onDrag(table: Table, event: React.PointerEvent<HTMLButtonElement>) {
    const board = event.currentTarget.parentElement;
    if (!board) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = table.x;
    const originY = table.y;
    const rect = board.getBoundingClientRect();

    function move(ev: PointerEvent) {
      const x = Math.min(88, Math.max(0, originX + ((ev.clientX - startX) / rect.width) * 100));
      const y = Math.min(82, Math.max(0, originY + ((ev.clientY - startY) / rect.height) * 100));
      const node = document.getElementById(`table-${table.id}`);
      if (node) {
        node.style.left = `${x}%`;
        node.style.top = `${y}%`;
        node.dataset.x = String(x);
        node.dataset.y = String(y);
      }
    }

    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const node = document.getElementById(`table-${table.id}`);
      const x = Number(node?.dataset.x ?? table.x);
      const y = Number(node?.dataset.y ?? table.y);
      if (Math.abs(x - table.x) < 0.5 && Math.abs(y - table.y) < 0.5) {
        setEditing(table);
        return;
      }
      void send(`/api/admin/tables/${table.id}`, "PATCH", { kind: "table", x, y });
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <>
      <PageHeader
        title="Tables"
        description="Name the rooms, then drag each table to where it sits."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {floor.areas.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setAreaId(entry.id)}
            className="rounded-full px-4 py-2 text-sm font-bold"
            style={{
              background: entry.id === area?.id ? "var(--s-brand)" : "var(--s-panel)",
              color: entry.id === area?.id ? "#fff" : "var(--s-ink)",
              boxShadow: "var(--s-shadow)",
            }}
          >
            {entry.name}
          </button>
        ))}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!areaName.trim()) return;
            void send("/api/admin/tables", "POST", { kind: "area", name: areaName.trim() });
            setAreaName("");
          }}
        >
          <input
            value={areaName}
            onChange={(event) => setAreaName(event.target.value)}
            placeholder="New area"
            className={`${inputClass} w-36`}
            style={inputStyle}
            aria-label="New area name"
          />
          <AdminButton type="submit" disabled={busy}>
            Add area
          </AdminButton>
        </form>
      </div>

      {error && (
        <p className="mb-3 text-sm font-medium" style={{ color: "var(--s-bad)" }}>
          {error}
        </p>
      )}

      {area && (
        <div className="s-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: "var(--s-ink-muted)" }}>
              <span className="mr-3 inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#34d399" }} /> Free
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--s-brand)" }} /> On dine
              </span>
            </p>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!tableLabel.trim()) return;
                void send("/api/admin/tables", "POST", {
                  kind: "table",
                  areaId: area.id,
                  label: tableLabel.trim(),
                  seats: 4,
                });
                setTableLabel("");
              }}
            >
              <input
                value={tableLabel}
                onChange={(event) => setTableLabel(event.target.value)}
                placeholder="Table name"
                className={`${inputClass} w-36`}
                style={inputStyle}
                aria-label="New table name"
              />
              <AdminButton type="submit" variant="primary" disabled={busy}>
                Add table
              </AdminButton>
            </form>
          </div>

          <div
            className="relative h-[28rem] overflow-hidden rounded-[1.25rem]"
            style={{ background: "var(--s-panel-alt)" }}
          >
            {area.tables.map((table) => (
              <button
                id={`table-${table.id}`}
                key={table.id}
                type="button"
                data-x={table.x}
                data-y={table.y}
                onPointerDown={(event) => onDrag(table, event)}
                className="absolute w-28 rounded-2xl px-2 py-3 text-center shadow-md"
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  background: table.occupied ? "color-mix(in srgb, var(--s-brand) 16%, white)" : "#ecfdf5",
                  boxShadow: table.occupied
                    ? "inset 0 0 0 1.5px var(--s-brand)"
                    : "inset 0 0 0 1.5px #34d399",
                }}
              >
                <span className="block text-sm font-extrabold">{table.label}</span>
                <span className="text-xs" style={{ color: "var(--s-ink-muted)" }}>
                  {table.seats} seats
                </span>
                {table.occupied && (
                  <span className="mt-1 block truncate text-[11px] font-semibold" style={{ color: "var(--s-brand)" }}>
                    {table.occupied.name || "Open ticket"}
                  </span>
                )}
              </button>
            ))}
            {area.tables.length === 0 && (
              <p className="absolute inset-0 grid place-items-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
                Add a table to start the floor.
              </p>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(26,29,31,0.35)" }}>
          <form
            className="s-card w-full max-w-sm space-y-3 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void send(`/api/admin/tables/${editing.id}`, "PATCH", {
                kind: "table",
                label: String(form.get("label") || editing.label),
                seats: Number(form.get("seats")) || editing.seats,
              });
              setEditing(null);
            }}
          >
            <h2 className="text-lg font-extrabold">Edit table</h2>
            <input name="label" defaultValue={editing.label} className={inputClass} style={inputStyle} aria-label="Table name" />
            <input
              name="seats"
              type="number"
              min={1}
              max={30}
              defaultValue={editing.seats}
              className={inputClass}
              style={inputStyle}
              aria-label="Seats"
            />
            <div className="flex gap-2">
              <AdminButton type="submit" variant="primary" className="flex-1">
                Save
              </AdminButton>
              <AdminButton
                type="button"
                variant="danger"
                onClick={() => {
                  void send(`/api/admin/tables/${editing.id}`, "PATCH", { kind: "table", remove: true });
                  setEditing(null);
                }}
              >
                Remove
              </AdminButton>
              <AdminButton type="button" onClick={() => setEditing(null)}>
                Close
              </AdminButton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
