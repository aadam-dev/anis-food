"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, History, MessageCircle, Pencil, Printer, Search, Wallet } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { editVerdict } from "@/lib/order-edit-rules";
import { getWhatsAppUrl, onlineOrderConfirmMessage, onlineOrderPaymentMessage } from "@/lib/utils";
import {
  AdminButton,
  Chip,
  Dialog,
  EmptyState,
  Field,
  Panel,
  Segmented,
  inputClass,
  inputStyle,
} from "@/components/admin/ui";
import { ORDER_SOURCE_LABELS, PAYMENT_LABELS, VOID_REASON_LABELS } from "@/components/admin/labels";
import ReceiptModal from "@/components/pos/ReceiptModal";
import EditOrderSheet from "@/components/pos/EditOrderSheet";
import type { OrderView, PosCategory, PosMenuItem } from "@/components/pos/types";

export interface AdminOrder extends OrderView {
  staff: string | null;
  voidReason: string | null;
  voidNote: string | null;
  /** Status of the order's shift; edits follow the till's rules. */
  shiftStatus: "OPEN" | "CLOSED" | null;
  /** Changed after it was rung. */
  edited: boolean;
  history: { at: string; by: string | null; text: string }[];
}

export type OrderFilter = "all" | "unpaid" | "paid" | "voided" | "edited";

const KIND_LABEL: Record<string, string> = { DINE_IN: "Dine-in", TAKEAWAY: "Takeaway", DELIVERY: "Delivery" };

function statusOf(order: AdminOrder): "unpaid" | "paid" | "voided" {
  if (order.status === "CANCELLED" || order.paymentStatus === "REFUNDED") return "voided";
  if (order.paymentStatus === "PENDING") return "unpaid";
  return "paid";
}

function time(iso: string, withDate: boolean) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Accra",
    ...(withDate ? { day: "numeric", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersClient({
  orders,
  cashiers,
  menu,
  canEditPaid,
  multiDay,
  truncated,
  initialFilter = "all",
  initialQuery = "",
  business,
}: {
  orders: AdminOrder[];
  cashiers: { id: string; name: string }[];
  menu: { categories: PosCategory[]; items: PosMenuItem[] };
  canEditPaid: boolean;
  /** The list spans more than one day, so rows show the date too. */
  multiDay: boolean;
  /** The query hit its row limit; say so rather than imply this is everything. */
  truncated: boolean;
  initialFilter?: OrderFilter;
  initialQuery?: string;
  business: { header: string; address: string; phone: string; footer: string; taxLabel: string; whatsapp: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<AdminOrder | null>(null);
  const [printing, setPrinting] = useState<{ order: AdminOrder; kind: "receipt" | "invoice" } | null>(null);
  const [editing, setEditing] = useState<AdminOrder | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<OrderFilter>(initialFilter);
  const [source, setSource] = useState("all");
  const [method, setMethod] = useState("all");
  const [cashierId, setCashierId] = useState("all");

  // Everything except the status tab, so each tab's count reflects the other filters.
  const narrowed = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (source !== "all" && (order.source ?? "POS") !== source) return false;
      if (method !== "all" && order.paymentMethod !== method) return false;
      if (cashierId !== "all" && order.staffId !== cashierId) return false;
      if (!needle) return true;
      return [
        order.orderNumber,
        callNumber(order.orderNumber),
        order.customerName,
        order.customerPhone,
        order.customerAddress,
        order.tableLabel,
        order.staff,
        order.paymentReference,
        ...order.items.map((item) => `${item.name} ${item.sizeLabel ?? ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [orders, query, source, method, cashierId]);

  const counts = useMemo(() => {
    const result: Record<OrderFilter, number> = { all: narrowed.length, unpaid: 0, paid: 0, voided: 0, edited: 0 };
    for (const order of narrowed) {
      result[statusOf(order)] += 1;
      if (order.edited) result.edited += 1;
    }
    return result;
  }, [narrowed]);

  const visible = useMemo(
    () =>
      narrowed.filter((order) =>
        filter === "all" ? true : filter === "edited" ? order.edited : statusOf(order) === filter,
      ),
    [narrowed, filter],
  );

  const takings = roundMoney(visible.filter((order) => statusOf(order) === "paid").reduce((sum, order) => sum + order.total, 0));
  const owed = roundMoney(visible.filter((order) => statusOf(order) === "unpaid").reduce((sum, order) => sum + order.total, 0));
  const methods = useMemo(() => [...new Set(orders.map((order) => order.paymentMethod))].sort(), [orders]);
  const sources = useMemo(() => [...new Set(orders.map((order) => order.source ?? "POS"))].sort(), [orders]);
  const filtered = source !== "all" || method !== "all" || cashierId !== "all" || query.trim() !== "";

  const select = (label: string, value: string, onChange: (value: string) => void, options: [string, string][]) => (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${inputClass} w-full text-sm sm:w-auto`}
      style={{ ...inputStyle, ...(value !== "all" ? { borderColor: "var(--s-brand)" } : {}) }}
      aria-label={label}
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <div className="mb-4 space-y-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "unpaid", label: "Unpaid", count: counts.unpaid },
            { value: "paid", label: "Paid", count: counts.paid },
            { value: "voided", label: "Voided & refunded", count: counts.voided },
            { value: "edited", label: "Edited", count: counts.edited },
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--s-ink-faint)" }} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, phone, number, table, address or dish"
              aria-label="Search orders"
              className={`${inputClass} pl-10 text-sm`}
              style={inputStyle}
            />
          </div>
          {select("Source", source, setSource, [["all", "Any source"], ...sources.map((value) => [value, ORDER_SOURCE_LABELS[value] ?? value] as [string, string])])}
          {select("Payment", method, setMethod, [["all", "Any payment"], ...methods.map((value) => [value, PAYMENT_LABELS[value] ?? value] as [string, string])])}
          {select("Cashier", cashierId, setCashierId, [["all", "All staff"], ...cashiers.map((cashier) => [cashier.id, cashier.name] as [string, string])])}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Chip>
            {visible.length} order{visible.length === 1 ? "" : "s"}
          </Chip>
          <Chip tone="good">{formatGHS(takings)} paid</Chip>
          {owed > 0 && <Chip tone="warn">{formatGHS(owed)} unpaid</Chip>}
          {filtered && (
            <button
              type="button"
              className="font-bold"
              style={{ color: "var(--s-brand)" }}
              onClick={() => {
                setSource("all");
                setMethod("all");
                setCashierId("all");
                setQuery("");
              }}
            >
              Clear filters
            </button>
          )}
          {truncated && <Chip tone="warn">Latest 500 only. Narrow the dates to see all.</Chip>}
        </div>
      </div>

      <Panel>
        {visible.length === 0 ? (
          <EmptyState title={orders.length === 0 ? "No orders in this period" : "Nothing matches"} hint="Try another period or filter." />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {visible.map((order) => {
              const state = statusOf(order);
              const isOpen = open === order.id;
              const verdict = editVerdict(
                { status: order.status, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod, shiftStatus: order.shiftStatus },
                canEditPaid,
              );
              const unpaidTicket = state === "unpaid" && order.paymentMethod === "UNPAID";
              const canVoid = state !== "voided" && (unpaidTicket || canEditPaid);
              return (
                <li key={order.id} style={{ borderColor: "var(--s-border)" }}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : order.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--s-hover)] sm:px-5"
                    aria-expanded={isOpen}
                  >
                    <span className="money w-12 shrink-0 text-lg font-extrabold" style={{ color: state === "voided" ? "var(--s-ink-faint)" : "var(--s-ink)" }}>
                      {callNumber(order.orderNumber)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold">{time(order.createdAt, multiDay)}</span>
                        {state === "voided" ? (
                          <Chip tone="bad">{order.paymentStatus === "REFUNDED" ? "Refunded" : "Voided"}</Chip>
                        ) : state === "unpaid" ? (
                          <Chip tone="warn">{order.paymentMethod === "BOLT_FOOD" ? "On Bolt" : "Unpaid"}</Chip>
                        ) : (
                          <Chip tone="good">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</Chip>
                        )}
                        {order.source && order.source !== "POS" && (
                          <Chip tone={order.source === "ONLINE" ? "accent" : "neutral"}>{ORDER_SOURCE_LABELS[order.source] ?? order.source}</Chip>
                        )}
                        {order.edited && <Chip tone="brand">Edited</Chip>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--s-ink-faint)" }}>
                        {[order.customerName?.trim(), order.customerPhone?.trim()].filter(Boolean).join(" · ") ||
                          (order.tableLabel ? `Table ${order.tableLabel}` : "Walk-in")}
                        {" · "}
                        {KIND_LABEL[order.deliveryType] ?? order.deliveryType}
                        {order.staff ? ` · ${order.staff}` : ""}
                      </span>
                    </span>
                    <span className="money whitespace-nowrap font-bold" style={state === "voided" ? { textDecoration: "line-through", color: "var(--s-ink-faint)" } : undefined}>
                      {formatGHS(order.total)}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--s-ink-faint)" }} />
                  </button>

                  {isOpen && (
                    <div className="grid gap-4 border-t px-4 py-4 sm:px-5 lg:grid-cols-[1.4fr_1fr]" style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}>
                      <div>
                        <ul className="space-y-1.5 text-sm">
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
                              <span className="money whitespace-nowrap">{formatGHS(item.lineTotal)}</span>
                            </li>
                          ))}
                        </ul>
                        <dl className="mt-3 space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--s-border)" }}>
                          {order.discountAmount > 0 && <Pair label="Discount" value={`−${formatGHS(order.discountAmount)}`} />}
                          {order.taxAmount > 0 && <Pair label={business.taxLabel || "Tax"} value={formatGHS(order.taxAmount)} />}
                          <Pair label="Total" value={formatGHS(order.total)} strong />
                          {order.splitPayments?.map((leg, index) => (
                            <Pair key={index} label={PAYMENT_LABELS[leg.method] ?? leg.method} value={formatGHS(leg.amount)} />
                          ))}
                          {order.paymentReference && <Pair label="Reference" value={order.paymentReference} />}
                          {order.tenderedAmount !== null && <Pair label="Cash given" value={formatGHS(order.tenderedAmount)} />}
                        </dl>
                        {(order.customerAddress || order.notes || order.voidReason) && (
                          <div className="mt-3 space-y-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                            {order.customerAddress && <p>Deliver to: {order.customerAddress}</p>}
                            {order.notes && <p>Note: {order.notes}</p>}
                            {order.voidReason && (
                              <p style={{ color: "var(--s-bad)" }}>
                                Void reason: {VOID_REASON_LABELS[order.voidReason] ?? order.voidReason}
                                {order.voidNote ? ` — ${order.voidNote}` : ""}
                              </p>
                            )}
                          </div>
                        )}
                        <p className="mt-2 text-xs" style={{ color: "var(--s-ink-faint)" }}>
                          {order.orderNumber}
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--s-ink-faint)" }}>
                          <History className="h-3.5 w-3.5" /> History
                        </p>
                        {order.history.length === 0 ? (
                          <p className="text-sm" style={{ color: "var(--s-ink-faint)" }}>
                            No changes recorded.
                          </p>
                        ) : (
                          <ol className="space-y-2 border-l-2 pl-3" style={{ borderColor: "var(--s-border)" }}>
                            {order.history.map((entry, index) => (
                              <li key={index} className="text-sm">
                                <p>{entry.text}</p>
                                <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                                  {time(entry.at, true)}
                                  {entry.by ? ` · ${entry.by}` : ""}
                                </p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:col-span-2">
                        {order.source === "ONLINE" && order.customerPhone?.trim() && state !== "voided" && (
                          <>
                            <a
                              href={getWhatsAppUrl(
                                order.customerPhone,
                                onlineOrderConfirmMessage({
                                  customerName: order.customerName?.trim() || "there",
                                  orderNumber: order.orderNumber,
                                  total: order.total,
                                  deliveryType: order.deliveryType,
                                }),
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="s-card inline-flex min-h-12 items-center gap-2 px-4 text-sm font-bold"
                            >
                              <MessageCircle className="h-4 w-4" /> Confirm on WhatsApp
                            </a>
                            {state === "unpaid" && (
                              <a
                                href={getWhatsAppUrl(
                                  order.customerPhone,
                                  onlineOrderPaymentMessage({
                                    customerName: order.customerName?.trim() || "there",
                                    orderNumber: order.orderNumber,
                                    total: order.total,
                                    payToPhone: business.whatsapp || business.phone,
                                  }),
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="s-card inline-flex min-h-12 items-center gap-2 px-4 text-sm font-bold"
                              >
                                <Wallet className="h-4 w-4" /> Ask for payment
                              </a>
                            )}
                          </>
                        )}
                        <AdminButton onClick={() => setPrinting({ order, kind: "receipt" })}>
                          <Printer className="h-4 w-4" /> {state === "unpaid" ? "Print bill" : "Reprint"}
                        </AdminButton>
                        {state !== "voided" && <AdminButton onClick={() => setPrinting({ order, kind: "invoice" })}>Invoice</AdminButton>}
                        {verdict.ok && (
                          <AdminButton onClick={() => setEditing(order)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </AdminButton>
                        )}
                        {!verdict.ok && state !== "voided" && order.shiftStatus === "CLOSED" && (
                          <span className="self-center text-xs" style={{ color: "var(--s-ink-faint)" }}>
                            Shift closed: void and re-ring to change it.
                          </span>
                        )}
                        {canVoid && (
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

      {printing && (
        <ReceiptModal
          order={printing.order}
          business={business}
          soldBy={printing.order.staff ?? "Anis"}
          kind={printing.kind}
          onClose={() => setPrinting(null)}
        />
      )}

      {editing && (
        <EditOrderSheet
          order={editing}
          menu={menu}
          endpoint={`/api/admin/orders/${editing.id}`}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

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

function Pair({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`}>
      <dt style={{ color: strong ? "var(--s-ink)" : "var(--s-ink-muted)" }}>{label}</dt>
      <dd className="money">{value}</dd>
    </div>
  );
}

function VoidDialog({ order, onClose, onDone }: { order: AdminOrder; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("MISTAKE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsNote = reason === "OTHER" && !note.trim();

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
    <Dialog
      open
      title={`Void order ${callNumber(order.orderNumber)}?`}
      description={`${formatGHS(order.total)}. It stays on record with your reason but stops counting as a sale.`}
      onClose={onClose}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Keep it
          </AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={busy} disabled={needsNote} style={{ background: "var(--s-bad)" }}>
            Void order
          </AdminButton>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Why?">
          <select value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} style={inputStyle}>
            {Object.entries(VOID_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note" hint={reason === "OTHER" ? "Required for Other" : "Optional"}>
          <input value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        {error && (
          <p role="alert" className="text-sm" style={{ color: "var(--s-bad)" }}>
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
