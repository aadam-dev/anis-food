"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import type { OrderView, PaymentChoice } from "./types";

/** Wall clock for "how long has this ticket been waiting", refreshed twice a minute. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function waitingMinutes(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
}

const SETTLE_METHODS: { value: Exclude<PaymentChoice, "UNPAID" | "BOLT_FOOD" | "BANK_TRANSFER">; label: string }[] = [
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
  onTakePayment,
}: {
  tickets: OrderView[];
  onTakePayment: (ticket: OrderView) => void;
}) {
  const [query, setQuery] = useState("");
  const now = useNow();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) => {
      const haystack = [
        ticket.customerName,
        ticket.customerPhone,
        ticket.orderNumber,
        callNumber(ticket.orderNumber),
        ...ticket.items.map((item) => item.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [tickets, query]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
      <div className="relative mb-3">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--s-ink-faint)" }}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, or ticket"
          aria-label="Search tickets"
          className="w-full rounded-xl border pl-9 pr-10 py-3 text-sm outline-none"
          style={{
            background: "var(--s-panel-alt)",
            borderColor: "var(--s-border)",
            color: "var(--s-ink)",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-lg"
            style={{ color: "var(--s-ink-muted)" }}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="grid place-items-center px-4 py-16">
          <p className="text-sm text-center" style={{ color: "var(--s-ink-muted)" }}>
            No unpaid tickets.
            <br />
            Anything sent to the kitchen without payment shows up here.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-muted)" }}>
          No ticket matches that.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              now={now}
              onTakePayment={() => onTakePayment(ticket)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  now,
  onTakePayment,
}: {
  ticket: OrderView;
  now: number;
  onTakePayment: () => void;
}) {
  const minutes = waitingMinutes(ticket.createdAt, now);
  const name = ticket.customerName?.trim();

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight truncate">{name || "Walk-in"}</p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            <span className="money font-semibold">{callNumber(ticket.orderNumber)}</span>
            {ticket.customerPhone?.trim() ? ` · ${ticket.customerPhone.trim()}` : ""}
            {" · "}
            <span style={{ color: minutes > 20 ? "var(--s-warn)" : undefined }}>
              {minutes}m
            </span>
          </p>
        </div>
        <p className="money text-lg font-bold whitespace-nowrap">{formatGHS(ticket.total)}</p>
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

      <button
        onClick={onTakePayment}
        className="mt-3 w-full rounded-xl px-4 py-3 font-bold text-white"
        style={{ background: "var(--s-brand)" }}
      >
        Take payment
      </button>
    </section>
  );
}

/**
 * Paying an open ticket. A sheet rather than a row of tiny buttons squeezed
 * onto the card, so cash, MoMo, card and split are each a full touch target.
 */
export function SettleSheet({
  ticket,
  onClose,
  onSettled,
  onError,
}: {
  ticket: OrderView;
  onClose: () => void;
  onSettled: (order: OrderView) => void;
  onError: (message: string) => void;
}) {
  const [method, setMethod] = useState<Exclude<PaymentChoice, "UNPAID"> | null>(null);
  const [splitCash, setSplitCash] = useState("");
  const [busy, setBusy] = useState(false);

  const cashLeg = Math.min(Number(splitCash) || 0, ticket.total);
  const momoLeg = roundMoney(ticket.total - cashLeg);
  const splitInvalid = method === "SPLIT" && (cashLeg <= 0 || momoLeg <= 0);

  async function settle(chosen: Exclude<PaymentChoice, "UNPAID">) {
    if (chosen === "SPLIT" && (cashLeg <= 0 || momoLeg <= 0)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/pos/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ticket.id,
          paymentMethod: chosen,
          splitPayments:
            chosen === "SPLIT"
              ? [
                  { method: "CASH", amount: cashLeg },
                  { method: "MOMO", amount: momoLeg },
                ]
              : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        onError(data.error ?? "Could not settle that ticket.");
        return;
      }
      onSettled(data.order);
    } catch {
      onError("No connection. Settling a ticket needs the network.");
    } finally {
      setBusy(false);
    }
  }

  const name = ticket.customerName?.trim() || "Walk-in";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={`Take payment for ${name}`}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border"
        style={{
          background: "var(--s-panel)",
          borderColor: "var(--s-border)",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--s-border)" }}
        >
          <div className="min-w-0">
            <p className="font-bold truncate">{name}</p>
            <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
              <span className="money">{callNumber(ticket.orderNumber)}</span>
              {ticket.customerPhone?.trim() ? ` · ${ticket.customerPhone.trim()}` : ""}
              {" · "}
              <span className="money font-semibold">{formatGHS(ticket.total)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-11 w-11 grid place-items-center rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {SETTLE_METHODS.map((entry) => {
              const selected = method === entry.value;
              return (
                <button
                  key={entry.value}
                  disabled={busy}
                  onClick={() => {
                    setMethod(entry.value);
                    if (entry.value !== "SPLIT") void settle(entry.value);
                  }}
                  className="rounded-xl py-4 text-base font-bold disabled:opacity-50"
                  style={{
                    background: selected ? "var(--s-brand)" : "var(--s-panel-alt)",
                    color: selected ? "#fff" : "var(--s-ink)",
                    border: "1px solid var(--s-border)",
                  }}
                >
                  {busy && selected ? <Loader2 className="w-4 h-4 animate-spin inline" /> : entry.label}
                </button>
              );
            })}
          </div>

          {method === "SPLIT" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Paid in cash</label>
              <input
                type="text"
                inputMode="decimal"
                value={splitCash}
                onChange={(event) => setSplitCash(event.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className="money w-full rounded-xl border px-3 py-3 text-right text-xl outline-none"
                style={{
                  background: "var(--s-panel-alt)",
                  borderColor: "var(--s-border)",
                  color: "var(--s-ink)",
                }}
              />
              <p className="mt-1 flex justify-between text-sm" style={{ color: "var(--s-ink-muted)" }}>
                <span>The rest on MoMo</span>
                <span className="money">{formatGHS(momoLeg)}</span>
              </p>
              {splitInvalid && splitCash !== "" && (
                <p className="mt-1 text-sm" style={{ color: "var(--s-bad)" }}>
                  Both parts need to be more than zero.
                </p>
              )}
              <button
                disabled={busy || splitInvalid}
                onClick={() => void settle("SPLIT")}
                className="mt-3 w-full rounded-xl px-4 py-3.5 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "var(--s-brand)" }}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm split
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
