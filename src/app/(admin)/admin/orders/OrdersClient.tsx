"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { Panel, EmptyState, Chip, AdminButton } from "@/components/admin/ui";
import {
  PAYMENT_LABELS,
  ORDER_SOURCE_LABELS,
  VOID_REASON_LABELS,
} from "@/components/admin/labels";

export interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  source: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  staff: string | null;
  customerName: string | null;
  customerPhone: string | null;
  voidReason: string | null;
  items: { id: string; name: string; quantity: number; lineTotal: number }[];
}

const VOID_REASONS = Object.entries(VOID_REASON_LABELS);

type OrderFilter = "all" | "unpaid" | "paid" | "voided";

const FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Unpaid" },
  { id: "paid", label: "Paid" },
  { id: "voided", label: "Voided" },
];

export default function OrdersClient({ orders, day }: { orders: AdminOrder[]; day: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<AdminOrder | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("all");

  const active = orders.filter((order) => order.status !== "CANCELLED");
  const total = active.reduce((sum, order) => sum + order.total, 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const voided = order.status === "CANCELLED";
      if (filter === "voided" && !voided) return false;
      if (filter === "unpaid" && (voided || order.paymentStatus !== "PENDING")) return false;
      if (filter === "paid" && (voided || order.paymentStatus === "PENDING")) return false;
      if (!needle) return true;
      const haystack = [
        order.orderNumber,
        callNumber(order.orderNumber),
        order.customerName,
        order.customerPhone,
        order.staff,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [orders, query, filter]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={day}
            onChange={(event) => router.push(`/admin/orders?day=${event.target.value}`)}
            className="rounded-lg border px-3 py-2 text-sm min-h-11"
            style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
            aria-label="Day"
          />
          <Chip>{active.length} orders</Chip>
          <Chip tone="good">{formatGHS(total)}</Chip>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--s-ink-faint)" }}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, phone, or order number"
            aria-label="Search orders"
            className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm min-h-11 outline-none"
            style={{ background: "var(--s-panel)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((entry) => {
            const selected = filter === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold"
                style={{
                  background: selected ? "var(--s-brand)" : "var(--s-panel)",
                  borderColor: selected ? "var(--s-brand)" : "var(--s-border)",
                  color: selected ? "#fff" : "var(--s-ink-muted)",
                }}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      <Panel>
        {orders.length === 0 ? (
          <EmptyState title="No orders on this day" hint="Pick another date above." />
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing matches" hint="Try another search or filter." />
        ) : (
          <ul className="flex flex-col gap-3 p-3 sm:gap-0 sm:p-0 sm:divide-y" style={{ borderColor: "var(--s-border)" }}>
            {visible.map((order) => {
              const voided = order.status === "CANCELLED";
              const isOpen = open === order.id;
              const when = new Date(order.createdAt).toLocaleTimeString("en-GB", {
                timeZone: "Africa/Accra",
                hour: "2-digit",
                minute: "2-digit",
              });
              const customer = [order.customerName?.trim(), order.customerPhone?.trim()]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={order.id}
                  className="rounded-xl border p-3 sm:rounded-none sm:border-0 sm:px-5 sm:py-3"
                  style={{ borderColor: "var(--s-border)", background: "var(--s-panel)" }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : order.id)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <span
                      className="money text-lg font-bold w-12 shrink-0"
                      style={{ color: voided ? "var(--s-ink-faint)" : "var(--s-ink)" }}
                    >
                      {callNumber(order.orderNumber)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-sm font-medium"
                          style={voided ? { textDecoration: "line-through", color: "var(--s-ink-faint)" } : undefined}
                        >
                          {when}
                        </span>
                        {voided ? (
                          <Chip tone="bad">Voided</Chip>
                        ) : (
                          <Chip>{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</Chip>
                        )}
                        {order.paymentStatus === "PENDING" && !voided && <Chip tone="warn">Unpaid</Chip>}
                        {order.source !== "POS" && (
                          <Chip>{ORDER_SOURCE_LABELS[order.source] ?? order.source}</Chip>
                        )}
                      </span>
                      <span className="block text-xs mt-0.5 truncate" style={{ color: "var(--s-ink-faint)" }}>
                        {customer || "Walk-in"}
                      </span>
                    </span>
                    <span
                      className="money font-semibold whitespace-nowrap"
                      style={voided ? { textDecoration: "line-through", color: "var(--s-ink-faint)" } : undefined}
                    >
                      {formatGHS(order.total)}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 sm:pl-12">
                      <ul className="space-y-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                        {order.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-3">
                            <span>
                              {item.quantity}× {item.name}
                            </span>
                            <span className="money">{formatGHS(item.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                          {order.orderNumber}
                          {order.staff ? ` · ${order.staff}` : ""}
                          {voided && order.voidReason
                            ? ` · ${VOID_REASON_LABELS[order.voidReason] ?? order.voidReason}`
                            : ""}
                        </span>
                        {!voided && (
                          <AdminButton variant="danger" onClick={() => setVoiding(order)}>
                            Void
                          </AdminButton>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {voiding && (
        <VoidDialog
          order={voiding}
          onClose={() => setVoiding(null)}
          onDone={() => {
            setVoiding(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function VoidDialog({
  order,
  onClose,
  onDone,
}: {
  order: AdminOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("MISTAKE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note: note.trim() || undefined }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not void that order.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-sm rounded-2xl border p-5"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <h2 className="font-bold">Void order {callNumber(order.orderNumber)}?</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          {formatGHS(order.total)} · the order stays on record with your reason, but stops
          counting as revenue.
        </p>

        <label className="mt-4 block text-sm font-medium mb-1.5">Why?</label>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-lg border px-3 py-2.5 min-h-11"
          style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
        >
          {VOID_REASONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note (optional)"
          className="mt-2 w-full rounded-lg border px-3 py-2.5 min-h-11"
          style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
        />

        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--s-bad)" }}>
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <AdminButton onClick={onClose} className="flex-1">
            Keep it
          </AdminButton>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white min-h-11 disabled:opacity-50"
            style={{ background: "var(--s-bad)" }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Void order
          </button>
        </div>
      </div>
    </div>
  );
}
