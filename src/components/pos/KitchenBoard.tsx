"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw, UtensilsCrossed } from "lucide-react";

type Status = "QUEUED" | "COOKING" | "READY";

interface KitchenOrder {
  id: string;
  orderNumber: string;
  tableLabel: string | null;
  deliveryType: string;
  kitchenStatus: Status | "SERVED";
  createdAt: string;
  notes: string | null;
  items: { name: string; quantity: number; notes: string | null }[];
}

const COLUMNS: { status: Status; title: string; next: Status | "SERVED"; cta: string }[] = [
  { status: "QUEUED", title: "New", next: "COOKING", cta: "Start" },
  { status: "COOKING", title: "Cooking", next: "READY", cta: "Ready" },
  { status: "READY", title: "Ready", next: "SERVED", cta: "Bump" },
];

const DELIVERY_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

function callNo(orderNumber: string) {
  const tail = orderNumber.split("-").pop() ?? orderNumber;
  return String(Number(tail));
}

function minutesSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function KitchenBoard() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/kitchen");
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      /* keep last board on a blip */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 5000);
    const clock = setInterval(() => setTick((t) => t + 1), 30000); // re-age cards
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  async function advance(order: KitchenOrder, next: Status | "SERVED") {
    // Optimistic: drop or move the card immediately, then confirm.
    setOrders((list) =>
      next === "SERVED"
        ? list.filter((o) => o.id !== order.id)
        : list.map((o) => (o.id === order.id ? { ...o, kitchenStatus: next } : o)),
    );
    await fetch("/api/pos/kitchen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, kitchenStatus: next }),
    });
    void load();
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--s-bg)" }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <Link
          href="/pos"
          className="h-10 px-3 inline-flex items-center gap-1 rounded-lg text-sm font-semibold"
          style={{ background: "var(--s-panel-alt)", color: "var(--s-ink-muted)" }}
        >
          <ChevronLeft className="w-4 h-4" /> Till
        </Link>
        <h1 className="flex items-center gap-2 font-bold text-lg">
          <UtensilsCrossed className="w-5 h-5" style={{ color: "var(--s-brand)" }} /> Kitchen
        </h1>
        <span className="ml-auto text-sm" style={{ color: "var(--s-ink-muted)" }}>
          {orders.length} active
        </span>
        <button
          onClick={() => void load()}
          className="h-10 w-10 grid place-items-center rounded-lg"
          style={{ color: "var(--s-ink-muted)" }}
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3">
        {COLUMNS.map((col) => {
          const cards = orders.filter((o) => o.kitchenStatus === col.status);
          return (
            <section key={col.status} className="flex flex-col min-h-0">
              <div
                className="mb-2 flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--s-panel)" }}
              >
                <span className="font-bold uppercase tracking-wide text-sm">{col.title}</span>
                <span
                  className="rounded-full px-2 text-xs font-bold"
                  style={{ background: "var(--s-hover)", color: "var(--s-ink-muted)" }}
                >
                  {cards.length}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {loaded && cards.length === 0 && (
                  <p className="py-8 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
                    Nothing here.
                  </p>
                )}
                {cards.map((order) => {
                  const mins = minutesSince(order.createdAt);
                  const late = mins >= 15;
                  return (
                    <article
                      key={order.id}
                      className="rounded-xl border p-3"
                      style={{
                        background: "var(--s-panel)",
                        borderColor: late ? "var(--s-warn)" : "var(--s-border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xl leading-none">#{callNo(order.orderNumber)}</span>
                        <span className="flex items-center gap-2">
                          {order.tableLabel && (
                            <span
                              className="rounded px-1.5 py-0.5 text-xs font-bold"
                              style={{ background: "var(--s-brand)", color: "#fff" }}
                            >
                              {order.tableLabel}
                            </span>
                          )}
                          <span
                            className="text-xs font-semibold"
                            style={{ color: late ? "var(--s-warn)" : "var(--s-ink-faint)" }}
                          >
                            {mins}m
                          </span>
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--s-ink-faint)" }}>
                        {DELIVERY_LABEL[order.deliveryType] ?? order.deliveryType}
                      </p>

                      <ul className="mt-2 space-y-1">
                        {order.items.map((item, i) => (
                          <li key={i} className="text-sm leading-tight">
                            <span className="font-bold">{item.quantity}×</span> {item.name}
                            {item.notes && (
                              <span className="block text-xs" style={{ color: "var(--s-warn)" }}>
                                — {item.notes}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {order.notes && (
                        <p className="mt-2 text-xs" style={{ color: "var(--s-warn)" }}>
                          Note: {order.notes}
                        </p>
                      )}

                      <button
                        onClick={() => advance(order, col.next)}
                        className="mt-3 w-full rounded-lg py-2.5 font-bold text-white"
                        style={{ background: "var(--s-brand)" }}
                      >
                        {col.cta}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
