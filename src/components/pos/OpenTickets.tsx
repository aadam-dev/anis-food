"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import type { OrderView, PaymentChoice } from "./types";

const SETTLE_METHODS: { value: Exclude<PaymentChoice, "UNPAID">; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "CARD", label: "Card" },
  { value: "SPLIT", label: "Split" },
];

/**
 * Tickets that went to the kitchen and have not been paid for.
 *
 * The lines are shown but cannot be edited. Once food has been cooked, changing
 * what was ordered is a void and a re-order — not a quiet edit that leaves the
 * kitchen and the till telling different stories.
 */
export default function OpenTickets({
  tickets,
  onSettled,
  onError,
}: {
  tickets: OrderView[];
  onSettled: (order: OrderView) => void;
  onError: (message: string) => void;
}) {
  const [settling, setSettling] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [splitCash, setSplitCash] = useState("");

  async function settle(order: OrderView, method: Exclude<PaymentChoice, "UNPAID">) {
    setBusy(true);
    try {
      const cashLeg = Math.min(Number(splitCash) || 0, order.total);
      const response = await fetch("/api/pos/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod: method,
          splitPayments:
            method === "SPLIT"
              ? [
                  { method: "CASH", amount: cashLeg },
                  { method: "MOMO", amount: roundMoney(order.total - cashLeg) },
                ]
              : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        onError(data.error ?? "Could not settle that ticket.");
        return;
      }
      setSettling(null);
      setSplitCash("");
      onSettled(data.order);
    } catch {
      onError("No connection. Settling a ticket needs the network.");
    } finally {
      setBusy(false);
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="flex-1 grid place-items-center px-4 py-16">
        <p className="text-sm text-center" style={{ color: "var(--s-ink-muted)" }}>
          No unpaid tickets.
          <br />
          Anything sent to the kitchen without payment shows up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-3">
      {tickets.map((ticket) => {
        const isSettling = settling === ticket.id;
        const waitingMinutes = Math.floor(
          (Date.now() - new Date(ticket.createdAt).getTime()) / 60000,
        );
        return (
          <section
            key={ticket.id}
            className="rounded-2xl border p-4"
            style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="money text-2xl font-bold leading-none">
                  {callNumber(ticket.orderNumber)}
                </p>
                <p className="mt-1 text-sm truncate" style={{ color: "var(--s-ink-muted)" }}>
                  {ticket.customerName || "No name"} ·{" "}
                  <span style={{ color: waitingMinutes > 20 ? "var(--s-warn)" : undefined }}>
                    {waitingMinutes}m ago
                  </span>
                </p>
              </div>
              <p className="money text-lg font-bold whitespace-nowrap">
                {formatGHS(ticket.total)}
              </p>
            </div>

            <ul className="mt-3 space-y-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
              {ticket.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="money whitespace-nowrap">{formatGHS(item.lineTotal)}</span>
                </li>
              ))}
            </ul>

            {!isSettling ? (
              <button
                onClick={() => setSettling(ticket.id)}
                className="mt-3 w-full rounded-xl px-4 py-3 font-bold text-white"
                style={{ background: "var(--s-brand)" }}
              >
                Take payment
              </button>
            ) : (
              <div className="mt-3">
                <div className="grid grid-cols-4 gap-2">
                  {SETTLE_METHODS.map((entry) => (
                    <button
                      key={entry.value}
                      disabled={busy}
                      onClick={() =>
                        entry.value === "SPLIT" ? setSplitCash("0") : settle(ticket, entry.value)
                      }
                      className="rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
                      style={{ background: "var(--s-panel-alt)", color: "var(--s-ink)" }}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>

                {splitCash !== "" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={splitCash}
                      onChange={(event) =>
                        setSplitCash(event.target.value.replace(/[^\d.]/g, ""))
                      }
                      placeholder="Paid in cash"
                      className="money w-full rounded-xl border px-3 py-3 text-right outline-none focus:ring-2"
                      style={{
                        background: "var(--s-panel-alt)",
                        borderColor: "var(--s-border)",
                        color: "var(--s-ink)",
                      }}
                    />
                    <p
                      className="mt-1 flex justify-between text-sm"
                      style={{ color: "var(--s-ink-muted)" }}
                    >
                      <span>The rest on MoMo</span>
                      <span className="money">
                        {formatGHS(
                          roundMoney(ticket.total - Math.min(Number(splitCash) || 0, ticket.total)),
                        )}
                      </span>
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => settle(ticket, "SPLIT")}
                      className="mt-2 w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: "var(--s-brand)" }}
                    >
                      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                      Confirm split
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSettling(null);
                    setSplitCash("");
                  }}
                  className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{ color: "var(--s-ink-muted)" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
