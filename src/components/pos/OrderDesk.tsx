"use client";

import { useMemo, useState } from "react";
import { Clock, Globe, MapPin, Pencil, Phone, Printer, Search, StickyNote } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { PAYMENT_LABELS } from "@/components/admin/labels";
import type { OrderView } from "./types";
import Button from "./ui/Button";
import { FieldInput } from "./ui/Field";
import { useNow, waitingMinutes, waitLabel } from "./OpenTickets";

/**
 * The till's Orders screen: everything waiting to be paid plus everything
 * sold this shift, with filters that all narrow the same list.
 *
 * Actions follow the server's rules exactly: an action that would be refused
 * is not shown at all, rather than shown and failing.
 */

type Status = "unpaid" | "paid" | "voided" | "all";
type Source = "all" | "POS" | "ONLINE" | "BOLT";
type Kind = "all" | "DINE_IN" | "TAKEAWAY" | "DELIVERY";

const STATUS: { value: Status; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "voided", label: "Voided" },
  { value: "all", label: "All" },
];
const SOURCES: { value: Source; label: string }[] = [
  { value: "all", label: "Any source" },
  { value: "POS", label: "Till" },
  { value: "ONLINE", label: "Online" },
  { value: "BOLT", label: "Bolt" },
];
const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "Any type" },
  { value: "DINE_IN", label: "Dine-in" },
  { value: "TAKEAWAY", label: "Takeaway" },
  { value: "DELIVERY", label: "Delivery" },
];
const KIND_LABEL: Record<string, string> = { DINE_IN: "Dine-in", TAKEAWAY: "Takeaway", DELIVERY: "Delivery" };

function statusOf(order: OrderView): Exclude<Status, "all"> {
  if (order.status === "CANCELLED" || order.paymentStatus === "REFUNDED") return "voided";
  if (order.paymentStatus === "PENDING") return "unpaid";
  return "paid";
}

function sourceOf(order: OrderView): Exclude<Source, "all"> {
  if (order.paymentMethod === "BOLT_FOOD" || order.source === "BOLT") return "BOLT";
  return order.source === "ONLINE" ? "ONLINE" : "POS";
}

export default function OrderDesk({
  tickets,
  shiftOrders,
  canVoidPaid,
  canEditPaid,
  onTakePayment,
  onVoid,
  onPrint,
  onEdit,
}: {
  tickets: OrderView[];
  shiftOrders: OrderView[];
  canVoidPaid: boolean;
  canEditPaid: boolean;
  onTakePayment: (order: OrderView) => void;
  onVoid: (order: OrderView) => void;
  /** Bill for an unpaid order, receipt for a paid one; "invoice" either way. */
  onPrint: (order: OrderView, kind: "slip" | "invoice") => void;
  onEdit: (order: OrderView) => void;
}) {
  const [status, setStatus] = useState<Status>("unpaid");
  const [source, setSource] = useState<Source>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [method, setMethod] = useState<string>("all");
  const [query, setQuery] = useState("");
  const now = useNow();

  // Unpaid tickets can predate the shift (Pay later before opening), so they
  // are merged with this shift's orders rather than assumed to be in them.
  const orders = useMemo(() => {
    const byId = new Map<string, OrderView>();
    for (const order of [...shiftOrders, ...tickets]) byId.set(order.id, order);
    return [...byId.values()];
  }, [tickets, shiftOrders]);

  const counts = useMemo(() => {
    const result: Record<Status, number> = { unpaid: 0, paid: 0, voided: 0, all: orders.length };
    for (const order of orders) result[statusOf(order)] += 1;
    return result;
  }, [orders]);

  const methods = useMemo(
    () => [...new Set(orders.filter((order) => statusOf(order) === "paid").map((order) => order.paymentMethod))],
    [orders],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter((order) => status === "all" || statusOf(order) === status)
      .filter((order) => source === "all" || sourceOf(order) === source)
      .filter((order) => kind === "all" || order.deliveryType === kind)
      .filter((order) => method === "all" || order.paymentMethod === method)
      .filter((order) => {
        if (!needle) return true;
        return [
          order.customerName,
          order.customerPhone,
          order.customerAddress,
          order.tableLabel,
          order.orderNumber,
          callNumber(order.orderNumber),
          ...order.items.map((item) => `${item.name} ${item.sizeLabel ?? ""}`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) =>
        // Oldest unpaid first (they have waited longest); everything else newest first.
        statusOf(a) === "unpaid" && statusOf(b) === "unpaid"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
      );
  }, [orders, status, source, kind, method, query]);

  const owed = roundMoney(
    orders.filter((order) => statusOf(order) === "unpaid" && order.paymentMethod === "UNPAID").reduce((sum, order) => sum + order.total, 0),
  );
  const sold = roundMoney(orders.filter((order) => statusOf(order) === "paid").reduce((sum, order) => sum + order.total, 0));
  const filtered = source !== "all" || kind !== "all" || method !== "all" || query.trim() !== "";

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-4 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Orders</h1>
            <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
              This shift and anything still unpaid
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Figure label="To collect" value={formatGHS(owed)} tone="var(--s-warn)" />
            <Figure label="Sold this shift" value={formatGHS(sold)} tone="var(--s-good)" />
          </div>
        </div>

        <div className="mb-2 grid grid-cols-4 gap-1 rounded-2xl p-1" style={{ background: "var(--s-panel-alt)" }} role="tablist">
          {STATUS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={status === entry.value}
              onClick={() => setStatus(entry.value)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold"
              style={{
                background: status === entry.value ? "var(--s-panel)" : "transparent",
                color: status === entry.value ? "var(--s-ink)" : "var(--s-ink-muted)",
                boxShadow: status === entry.value ? "var(--s-shadow)" : undefined,
              }}
            >
              {entry.label}
              <span className="money text-xs" style={{ color: "var(--s-ink-faint)" }}>
                {counts[entry.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--s-ink-faint)" }} />
            <FieldInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, phone, number, table or dish"
              aria-label="Search orders"
              className="pl-10"
            />
          </div>
          <Choice label="Source" value={source} onChange={(value) => setSource(value as Source)} options={SOURCES} />
          <Choice label="Order type" value={kind} onChange={(value) => setKind(value as Kind)} options={KINDS} />
          <Choice
            label="Paid with"
            value={method}
            onChange={setMethod}
            options={[{ value: "all", label: "Any payment" }, ...methods.map((value) => ({ value, label: PAYMENT_LABELS[value] ?? value }))]}
          />
        </div>

        {visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-bold">Nothing here</p>
            <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
              {filtered
                ? "No order matches these filters."
                : status === "unpaid"
                  ? "Orders sent with Pay later, and online orders, wait here until they are paid."
                  : "No orders yet."}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setSource("all");
                  setKind("all");
                  setMethod("all");
                  setQuery("");
                }}
                className="mt-3 text-sm font-bold"
                style={{ color: "var(--s-brand)" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                now={now}
                canVoidPaid={canVoidPaid}
                canEditPaid={canEditPaid}
                onTakePayment={() => onTakePayment(order)}
                onVoid={() => onVoid(order)}
                onPrint={(kind) => onPrint(order, kind)}
                onEdit={() => onEdit(order)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl px-3 py-2 text-right" style={{ background: "var(--s-panel-alt)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--s-ink-faint)" }}>
        {label}
      </p>
      <p className="money font-extrabold" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-12 w-full appearance-none rounded-2xl border px-3.5 pr-9 text-sm font-semibold outline-none sm:w-auto"
      style={{
        backgroundColor: value === "all" ? "var(--s-panel-alt)" : "color-mix(in srgb, var(--s-brand) 10%, var(--s-panel))",
        borderColor: value === "all" ? "var(--s-border)" : "color-mix(in srgb, var(--s-brand) 40%, transparent)",
        color: "var(--s-ink)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
        backgroundSize: "1rem",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide"
      style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
    >
      {children}
    </span>
  );
}

function OrderCard({
  order,
  now,
  canVoidPaid,
  canEditPaid,
  onTakePayment,
  onVoid,
  onPrint,
  onEdit,
}: {
  order: OrderView;
  now: number;
  canVoidPaid: boolean;
  canEditPaid: boolean;
  onTakePayment: () => void;
  onVoid: () => void;
  onPrint: (kind: "slip" | "invoice") => void;
  onEdit: () => void;
}) {
  const state = statusOf(order);
  const unpaidTicket = state === "unpaid" && order.paymentMethod === "UNPAID";
  const onBolt = state === "unpaid" && order.paymentMethod === "BOLT_FOOD";
  const online = order.source === "ONLINE";
  const minutes = waitingMinutes(order.createdAt, now);
  const canEdit = state !== "voided" && (unpaidTicket || canEditPaid);
  const canVoid = state !== "voided" && (unpaidTicket || canVoidPaid);
  const who = order.customerName?.trim() || (order.tableLabel ? `Table ${order.tableLabel}` : "Walk-in");

  return (
    <section
      className="flex flex-col rounded-[1.25rem] border p-4"
      style={{
        background: "var(--s-panel)",
        borderColor: unpaidTicket && minutes >= 30 ? "color-mix(in srgb, var(--s-warn) 50%, var(--s-border))" : "var(--s-border)",
        boxShadow: "var(--s-shadow)",
        opacity: state === "voided" ? 0.7 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className="money text-2xl font-extrabold leading-none">{callNumber(order.orderNumber)}</span>
            <span className="truncate font-bold">{who}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {online && (
              <Tag tone="var(--s-accent)">
                <Globe className="h-3 w-3" /> Online
              </Tag>
            )}
            <Tag tone="var(--s-ink-muted)">{KIND_LABEL[order.deliveryType] ?? order.deliveryType}</Tag>
            {state === "unpaid" && <Tag tone="var(--s-warn)">{onBolt ? "On Bolt" : "Unpaid"}</Tag>}
            {state === "paid" && <Tag tone="var(--s-good)">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</Tag>}
            {state === "voided" && <Tag tone="var(--s-bad)">{order.paymentStatus === "REFUNDED" ? "Refunded" : "Voided"}</Tag>}
            {(order.editCount ?? 0) > 0 && <Tag tone="#7C3AED">Edited</Tag>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="money text-lg font-extrabold" style={state === "voided" ? { textDecoration: "line-through" } : undefined}>
            {formatGHS(order.total)}
          </p>
          <p className="flex items-center justify-end gap-1 text-xs" style={{ color: state === "unpaid" && minutes >= 30 ? "var(--s-warn)" : "var(--s-ink-faint)" }}>
            <Clock className="h-3 w-3" />
            {state === "unpaid"
              ? waitLabel(minutes)
              : new Date(order.createdAt).toLocaleTimeString("en-GB", { timeZone: "Africa/Accra", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {(online || order.customerPhone || order.customerAddress || order.notes) && (
        <div className="mt-3 space-y-1 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--s-panel-alt)", color: "var(--s-ink-muted)" }}>
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--s-ink)" }}>
              <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
            </a>
          )}
          {order.customerAddress && (
            <p className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {order.customerAddress}
            </p>
          )}
          {order.notes && (
            <p className="flex items-start gap-1.5">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {order.notes}
            </p>
          )}
        </div>
      )}

      <ul className="mt-3 flex-1 space-y-1 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="font-bold">{item.quantity}×</span> {item.name}
              {item.sizeLabel && <span style={{ color: "var(--s-brand)" }}> · {item.sizeLabel}</span>}
              {item.notes && (
                <span className="block text-xs" style={{ color: "var(--s-ink-faint)" }}>
                  {item.notes}
                </span>
              )}
            </span>
            <span className="money whitespace-nowrap" style={{ color: "var(--s-ink-muted)" }}>
              {formatGHS(item.lineTotal)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: "var(--s-border)" }}>
        {unpaidTicket && (
          <Button size="sm" onClick={onTakePayment}>
            Take payment
          </Button>
        )}
        <Button tone="secondary" size="sm" onClick={() => onPrint("slip")}>
          <Printer className="h-3.5 w-3.5" /> {state === "unpaid" ? "Print bill" : "Reprint"}
        </Button>
        {state !== "voided" && (
          <Button tone="secondary" size="sm" onClick={() => onPrint("invoice")}>
            Invoice
          </Button>
        )}
        {canEdit && (
          <Button tone="secondary" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
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
