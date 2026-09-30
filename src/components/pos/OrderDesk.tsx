"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { PAYMENT_LABELS } from "@/components/admin/labels";
import type { CartLine, OrderView } from "./types";
import Button from "./ui/Button";
import { FieldInput } from "./ui/Field";
import { posRequest, usePosAction } from "./usePosAction";
import { useNow, waitingMinutes, waitLabel } from "./OpenTickets";

type DeskTab = "unpaid" | "held" | "shift";

export interface HeldDraft {
  id: string;
  label: string;
  lines: CartLine[];
  discount: number;
  itemCount: number;
  staffName: string;
  createdAt: string;
  customerName: string | null;
}

/**
 * The cashier's order desk for this shift.
 * Unpaid tickets can change. Paid mistakes are voided, not quietly rewritten.
 */
export default function OrderDesk({
  tickets,
  shiftOrders,
  drafts,
  seesAll,
  canVoidPaid,
  onTakePayment,
  onVoid,
  onReprint,
  onInvoice,
  onCorrect,
  onChanged,
  onResume,
}: {
  tickets: OrderView[];
  shiftOrders: OrderView[];
  drafts: HeldDraft[];
  seesAll: boolean;
  canVoidPaid: boolean;
  onTakePayment: (order: OrderView) => void;
  onVoid: (order: OrderView) => void;
  onReprint: (order: OrderView) => void;
  onInvoice: (order: OrderView) => void;
  onCorrect: (order: OrderView) => void;
  onChanged: () => void;
  onResume: (id: string) => void;
}) {
  const [tab, setTab] = useState<DeskTab>("unpaid");
  const [query, setQuery] = useState("");
  const now = useNow();
  const visible = useMemo(() => {
    const list = tab === "unpaid" ? tickets : tab === "shift" ? shiftOrders : [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((order) => {
      const haystack = [
        order.customerName,
        order.customerPhone,
        order.orderNumber,
        callNumber(order.orderNumber),
        ...order.items.map((item) => item.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [tab, tickets, shiftOrders, query]);

  const owed = roundMoney(tickets.reduce((sum, ticket) => sum + ticket.total, 0));

  return (
    <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4 pb-24">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Orders</h1>
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            {seesAll ? "Every ticket on this shift." : "Your tickets only."}
            {tickets.length === 0
              ? " Nothing waiting to be paid."
              : ` ${tickets.length} unpaid · ${formatGHS(owed)} to collect`}
          </p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl p-1" style={{ background: "var(--s-panel-alt)" }}>
        {(
          [
            ["unpaid", "Unpaid"],
            ["held", drafts.length > 0 ? `Held ${drafts.length}` : "Held"],
            ["shift", "This shift"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="min-h-11 rounded-xl text-sm font-bold"
            style={{
              background: tab === id ? "var(--s-panel)" : "transparent",
              color: tab === id ? "var(--s-ink)" : "var(--s-ink-muted)",
              boxShadow: tab === id ? "var(--s-shadow)" : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <FieldInput
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, phone, number or dish"
        aria-label="Search orders"
        className="mb-3"
      />

      {tab === "held" ? (
        drafts.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Hold an order from the bill when a customer steps away. It stays here until you bring it back.
          </p>
        ) : (
          <div className="grid gap-3">
            {drafts.map((draft) => (
              <article
                key={draft.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--s-border)", background: "var(--s-panel)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{draft.label}</p>
                    <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
                      {draft.itemCount} item{draft.itemCount === 1 ? "" : "s"}
                      {seesAll ? ` · ${draft.staffName}` : ""}
                    </p>
                  </div>
                  <Button onClick={() => onResume(draft.id)}>Resume</Button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-muted)" }}>
          {tab === "unpaid"
            ? "Anything sent with Pay later shows up here."
            : seesAll
              ? "No sales on this shift yet."
              : "You have not rung a sale on this shift yet."}
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((order) => (
            <DeskRow
              key={order.id}
              order={order}
              now={now}
              canVoidPaid={canVoidPaid}
              onTakePayment={() => onTakePayment(order)}
              onVoid={() => onVoid(order)}
              onReprint={() => onReprint(order)}
              onInvoice={() => onInvoice(order)}
              onCorrect={() => onCorrect(order)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeskRow({
  order,
  now,
  canVoidPaid,
  onTakePayment,
  onVoid,
  onReprint,
  onInvoice,
  onCorrect,
  onChanged,
}: {
  order: OrderView;
  now: number;
  canVoidPaid: boolean;
  onTakePayment: () => void;
  onVoid: () => void;
  onReprint: () => void;
  onInvoice: () => void;
  onCorrect: () => void;
  onChanged: () => void;
}) {
  const unpaid = order.paymentStatus === "PENDING" && order.paymentMethod === "UNPAID";
  const bolt = order.paymentMethod === "BOLT_FOOD" && order.paymentStatus === "PENDING";
  const voided = order.status === "CANCELLED";
  const canVoid = !voided && (unpaid || canVoidPaid);
  const [editing, setEditing] = useState(false);

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            {callNumber(order.orderNumber)} · {order.customerName?.trim() || "Walk-in"}
          </p>
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            {unpaid ? " · Unpaid" : ""}
            {bolt ? " · On Bolt" : ""}
            {voided ? " · Voided" : ""}
            {unpaid ? ` · ${waitLabel(waitingMinutes(order.createdAt, now))}` : ""}
          </p>
        </div>
        <p className="money text-lg font-bold">{formatGHS(order.total)}</p>
      </div>

      <ul className="mt-3 space-y-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">
              {item.quantity}× {item.name}
            </span>
            <span className="money">{formatGHS(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      {unpaid && !voided && (
        <button
          type="button"
          className="mt-2 text-sm font-bold"
          style={{ color: "var(--s-brand)" }}
          onClick={() => setEditing((open) => !open)}
        >
          {editing ? "Hide lines" : "Change lines"}
        </button>
      )}
      {editing && unpaid && <LineEditor order={order} onSaved={onChanged} />}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="secondary" size="sm" onClick={onReprint}>
          Reprint
        </Button>
        <Button tone="secondary" size="sm" onClick={onInvoice}>
          Invoice
        </Button>
        {unpaid && !voided && <Button size="sm" onClick={onTakePayment}>Take payment</Button>}
        {!unpaid && !voided && (
          <Button tone="secondary" size="sm" onClick={onCorrect}>
            Fix payment
          </Button>
        )}
        {canVoid && (
          <Button tone="danger" size="sm" onClick={onVoid}>
            Void
          </Button>
        )}
      </div>
    </section>
  );
}

function LineEditor({ order, onSaved }: { order: OrderView; onSaved: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((item) => [item.id, item.quantity])),
  );
  const { run, busy, error } = usePosAction();

  async function save() {
    const data = await run(() =>
      posRequest(`/api/pos/orders/${order.id}`, "PATCH", {
        action: "lines",
        lines: order.items.map((item) => ({ id: item.id, quantity: quantities[item.id] ?? 0 })),
      }),
    );
    if (data) onSaved();
  }

  return (
    <div className="mt-3 space-y-2">
      {order.items.map((item) => {
        const quantity = quantities[item.id] ?? 0;
        return (
          <div key={item.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: "var(--s-panel-alt)" }}
              aria-label={`Less ${item.name}`}
              onClick={() =>
                setQuantities((current) => ({
                  ...current,
                  [item.id]: Math.max(0, (current[item.id] ?? 0) - 1),
                }))
              }
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="money w-8 text-center font-bold">{quantity}</span>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: "var(--s-panel-alt)" }}
              aria-label={`More ${item.name}`}
              onClick={() =>
                setQuantities((current) => ({
                  ...current,
                  [item.id]: Math.min(999, (current[item.id] ?? 0) + 1),
                }))
              }
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      {error && (
        <p className="text-sm" style={{ color: "var(--s-bad)" }}>
          {error}
        </p>
      )}
      <Button size="sm" busy={busy} onClick={save}>
        Save lines
      </Button>
    </div>
  );
}
