"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, RefreshCw } from "lucide-react";
import { formatGHS } from "@/lib/money";

export interface FloorTable {
  id: string;
  label: string;
  zone: string;
  seats: number;
  openOrder: {
    id: string;
    orderNumber: string;
    total: number;
    items: number;
    openedAt: string;
  } | null;
}

/**
 * The dining room, at the till. Free tables are tapped to seat a new order;
 * occupied ones show their running tab and open it to add items or settle.
 */
export default function TableFloor({
  onSeat,
  onOpenTab,
  refreshKey,
}: {
  onSeat: (table: { id: string; label: string }) => void;
  onOpenTab: (orderId: string, tableLabel: string) => void;
  /** Bump to force a reload (e.g. after an order is sent or settled). */
  refreshKey: number;
}) {
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/tables");
      if (!res.ok) return;
      const data = await res.json();
      setTables(data.tables);
    } catch {
      /* Offline: keep what we last had. */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const zones = [...new Set(tables.map((t) => t.zone))];
  const occupied = tables.filter((t) => t.openOrder).length;

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
          {occupied} of {tables.length} tables seated
        </p>
        <button
          onClick={() => void load()}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-sm"
          style={{ background: "var(--s-panel-alt)", color: "var(--s-ink-muted)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading && tables.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
          Loading the floor…
        </p>
      ) : tables.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
          No tables set up yet. Add them in the back office under Tables.
        </p>
      ) : (
        zones.map((zone) => (
          <div key={zone} className="mb-6">
            <h3
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--s-ink-faint)" }}
            >
              {zone}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {tables
                .filter((t) => t.zone === zone)
                .map((table) => {
                  const tab = table.openOrder;
                  return (
                    <button
                      key={table.id}
                      onClick={() =>
                        tab
                          ? onOpenTab(tab.id, table.label)
                          : onSeat({ id: table.id, label: table.label })
                      }
                      className="rounded-xl border p-3 text-left transition-transform active:scale-[0.98]"
                      style={{
                        background: tab ? "var(--s-brand)" : "var(--s-panel)",
                        borderColor: tab ? "var(--s-brand)" : "var(--s-border)",
                        color: tab ? "#fff" : "var(--s-ink)",
                        minHeight: "5.5rem",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg leading-none">{table.label}</span>
                        <span
                          className="inline-flex items-center gap-0.5 text-xs"
                          style={{ color: tab ? "rgba(255,255,255,0.8)" : "var(--s-ink-faint)" }}
                        >
                          <Users className="w-3 h-3" />
                          {table.seats}
                        </span>
                      </div>
                      {tab ? (
                        <div className="mt-2">
                          <div className="money text-sm font-semibold">{formatGHS(tab.total)}</div>
                          <div className="text-[0.7rem]" style={{ color: "rgba(255,255,255,0.85)" }}>
                            {tab.items} item{tab.items === 1 ? "" : "s"} · open
                          </div>
                        </div>
                      ) : (
                        <div
                          className="mt-2 text-xs font-medium"
                          style={{ color: "var(--s-ink-faint)" }}
                        >
                          Tap to seat
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
