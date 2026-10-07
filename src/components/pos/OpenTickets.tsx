"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { VOID_REASON_LABELS } from "@/components/admin/labels";
import type { OrderView, PaymentChoice } from "./types";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import MethodMark from "./MethodMark";
import { posRequest, usePosAction } from "./usePosAction";

/** Wall clock for "how long has this ticket been waiting", refreshed twice a minute. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function waitingMinutes(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
}

/** Plain wait label: "12m", "2h 5m", "3d". */
export function waitLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / (24 * 60))}d`;
}

/** Waiting colour: calm, then amber past 10 minutes, red past 20. */
export function waitTone(minutes: number) {
  if (minutes > 20) return "var(--s-bad)";
  if (minutes > 10) return "var(--s-warn)";
  return "var(--s-ink-muted)";
}

type SettleMethod = Exclude<PaymentChoice, "UNPAID" | "BOLT_FOOD">;

const SETTLE_METHODS: { value: SettleMethod; label: string }[] = [
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
export function TicketCard({
  ticket,
  now,
  canVoid,
  onTakePayment,
  onVoid,
  compact = false,
}: {
  ticket: OrderView;
  now: number;
  canVoid: boolean;
  onTakePayment: () => void;
  onVoid: () => void;
  compact?: boolean;
}) {
  const minutes = waitingMinutes(ticket.createdAt, now);
  const name = ticket.customerName?.trim();
  const tone = waitTone(minutes);

  return (
    <section
      className="rounded-2xl border p-4 flex flex-col"
      style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="money grid h-11 min-w-11 shrink-0 place-items-center rounded-xl px-2 text-lg font-bold"
            style={{ background: "var(--s-panel-alt)" }}
            aria-label={`Number ${callNumber(ticket.orderNumber)}`}
          >
            {callNumber(ticket.orderNumber)}
          </span>
          <div className="min-w-0">
            <p className="font-bold leading-tight truncate">{name || "Walk-in"}</p>
            <p className="mt-0.5 text-sm truncate" style={{ color: "var(--s-ink-muted)" }}>
              {ticket.customerPhone?.trim() || `${ticket.items.length} item${ticket.items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="money text-lg font-bold whitespace-nowrap">{formatGHS(ticket.total)}</p>
          <span
            className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ color: tone, background: `color-mix(in srgb, ${tone} 14%, transparent)` }}
          >
            {waitLabel(minutes)}
          </span>
        </div>
      </div>

      {!compact && (
        <ul className="mt-3 space-y-0.5 text-sm flex-1" style={{ color: "var(--s-ink-muted)" }}>
          {ticket.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {item.quantity}× {item.name}
              </span>
              <span className="money whitespace-nowrap">{formatGHS(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={`mt-3 grid gap-2 ${canVoid ? "grid-cols-[1fr_auto]" : ""}`}>
        <Button onClick={onTakePayment}>Take payment</Button>
        {canVoid && (
          <Button tone="danger" onClick={onVoid} aria-label={`Void ${name || "ticket"}`}>
            <Ban className="w-4 h-4" /> Void
          </Button>
        )}
      </div>
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
  onPrintBill,
}: {
  ticket: OrderView;
  onClose: () => void;
  onSettled: (order: OrderView) => void;
  /** Present the bill before payment, as at a table. */
  onPrintBill?: () => void;
}) {
  const [method, setMethod] = useState<SettleMethod>("CASH");
  const [splitCash, setSplitCash] = useState("");
  const { run, busy, error } = usePosAction();

  const cashLeg = Math.min(Number(splitCash) || 0, ticket.total);
  const momoLeg = roundMoney(ticket.total - cashLeg);
  const splitInvalid = method === "SPLIT" && (cashLeg <= 0 || momoLeg <= 0);

  async function settle() {
    if (splitInvalid) return;
    const data = await run(() =>
      posRequest<{ order: OrderView }>("/api/pos/orders", "PATCH", {
        orderId: ticket.id,
        paymentMethod: method,
        splitPayments:
          method === "SPLIT"
            ? [
                { method: "CASH", amount: cashLeg },
                { method: "MOMO", amount: momoLeg },
              ]
            : undefined,
      }),
    );
    if (data) onSettled(data.order);
  }

  const name = ticket.customerName?.trim() || "Walk-in";

  return (
    <Sheet
      eyebrow={`Ticket ${callNumber(ticket.orderNumber)}`}
      title={name}
      subtitle={<span className="money font-semibold">{formatGHS(ticket.total)} to collect</span>}
      onClose={onClose}
      dismissible={!busy}
      footer={
        <div className={onPrintBill ? "grid grid-cols-[auto_1fr] gap-2" : undefined}>
          {onPrintBill && (
            <Button tone="secondary" size="lg" onClick={onPrintBill} disabled={busy}>
              Print bill
            </Button>
          )}
          <Button size="lg" className="w-full" busy={busy} disabled={splitInvalid} onClick={settle}>
            {method === "SPLIT" ? "Confirm split" : `Take ${formatGHS(ticket.total)}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {SETTLE_METHODS.map((entry) => {
            const selected = method === entry.value;
            return (
              <button
                key={entry.value}
                type="button"
                disabled={busy}
                onClick={() => setMethod(entry.value)}
                aria-pressed={selected}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold disabled:opacity-50"
                style={{
                  background: selected ? "var(--s-brand)" : "var(--s-panel-alt)",
                  color: selected ? "#fff" : "var(--s-ink)",
                  border: selected ? "1px solid transparent" : "1px solid var(--s-border)",
                }}
              >
                <MethodMark method={entry.value} /> {entry.label}
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
              className="money w-full rounded-2xl border px-3 py-3 text-right text-xl outline-none"
              style={{
                background: "var(--s-panel-alt)",
                borderColor: "var(--s-border)",
                color: "var(--s-ink)",
              }}
            />
            <p className="mt-1.5 flex justify-between text-sm" style={{ color: "var(--s-ink-muted)" }}>
              <span>The rest on MoMo</span>
              <span className="money">{formatGHS(momoLeg)}</span>
            </p>
            {splitInvalid && splitCash !== "" && (
              <p className="mt-1 text-sm" style={{ color: "var(--s-bad)" }}>
                Both parts need to be more than zero.
              </p>
            )}
          </div>
        )}

        <ul
          className="rounded-2xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--s-border)", color: "var(--s-ink-muted)" }}
        >
          {ticket.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-0.5">
              <span className="min-w-0 truncate">
                {item.quantity}× {item.name}
              </span>
              <span className="money whitespace-nowrap">{formatGHS(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <SheetError message={error} />
      </div>
    </Sheet>
  );
}

const VOID_REASONS = Object.entries(VOID_REASON_LABELS);

/**
 * Voiding a ticket at the till. Manager roles only; the server checks again.
 * A reason is always recorded, and "Other" asks for a word of explanation.
 */
export function VoidSheet({
  ticket,
  onClose,
  onVoided,
}: {
  ticket: OrderView;
  onClose: () => void;
  onVoided: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const { run, busy, error } = usePosAction();
  const needsNote = reason === "OTHER" && note.trim().length < 3;

  async function confirm() {
    if (!reason || needsNote) return;
    const done = await run(() =>
      posRequest(`/api/pos/orders/${ticket.id}/void`, "POST", {
        reason,
        note: note.trim() || undefined,
      }),
    );
    if (done) onVoided();
  }

  return (
    <Sheet
      eyebrow={`Void ticket ${callNumber(ticket.orderNumber)}`}
      title={ticket.customerName?.trim() || "Walk-in"}
      subtitle={
        <span>
          <span className="money font-semibold">{formatGHS(ticket.total)}</span> leaves the
          day&apos;s takings. It stays on record with the reason.
        </span>
      }
      onClose={onClose}
      dismissible={!busy}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Keep it
          </Button>
          <Button tone="danger" busy={busy} disabled={!reason || needsNote} onClick={confirm}>
            <Ban className="w-4 h-4" /> Void ticket
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm font-medium">Why is it being voided?</p>
        <div className="grid gap-2">
          {VOID_REASONS.map(([value, label]) => {
            const selected = reason === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setReason(value)}
                aria-pressed={selected}
                className="rounded-2xl border px-4 py-3 text-left text-sm font-semibold"
                style={{
                  borderColor: selected ? "var(--s-bad)" : "var(--s-border)",
                  background: selected
                    ? "color-mix(in srgb, var(--s-bad) 12%, var(--s-panel))"
                    : "var(--s-panel-alt)",
                  color: "var(--s-ink)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={reason === "OTHER" ? "Say what happened (required)" : "Note (optional)"}
          rows={2}
          maxLength={300}
          className="w-full rounded-2xl border px-3 py-3 text-sm outline-none"
          style={{
            background: "var(--s-panel-alt)",
            borderColor: "var(--s-border)",
            color: "var(--s-ink)",
          }}
        />
        <SheetError message={error} />
      </div>
    </Sheet>
  );
}
