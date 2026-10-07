"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { computeOrderTotals, formatGHS, roundMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { settleDifference } from "@/lib/order-edit-rules";
import { lineKey } from "./cartReducer";
import MethodMark from "./MethodMark";
import SizePickerSheet from "./SizePickerSheet";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { FieldInput, FieldLabel, FieldSelect } from "./ui/Field";
import { posRequest, usePosAction } from "./usePosAction";
import type { OrderView, PosCategory, PosMenuItem, PosMenuSize } from "./types";

/**
 * Change an order after it was rung: add dishes, change quantities, take lines
 * off, change the discount and — for a paid order — say how the new total is
 * paid. The same sheet runs on the till and in the back office; the server
 * applies one set of rules (lib/order-edit-rules) for both.
 *
 * Existing lines keep the price they were sold at. New lines are priced from
 * today's menu by the server, never from this screen.
 */

type Method = "CASH" | "MOMO" | "CARD" | "BOLT_FOOD" | "SPLIT";
const METHODS: { value: Method; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "CARD", label: "Card" },
  { value: "BOLT_FOOD", label: "Bolt" },
  { value: "SPLIT", label: "Split" },
];
const SPLIT_METHODS = ["CASH", "MOMO", "CARD"] as const;
const SPLIT_LABELS = { CASH: "Cash", MOMO: "MoMo", CARD: "Card" } as const;

interface DraftLine {
  key: string;
  /** Set for a line already on the order. */
  id?: string;
  menuItemId?: string | null;
  sizeId?: string | null;
  sizeLabel?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string | null;
}

export default function EditOrderSheet({
  order,
  menu,
  endpoint,
  onClose,
  onSaved,
}: {
  order: OrderView;
  menu: { categories: PosCategory[]; items: PosMenuItem[] };
  /** PATCH target: the till's or the back office's order route. */
  endpoint: string;
  onClose: () => void;
  onSaved: (order: OrderView) => void;
}) {
  const paid = !(order.paymentStatus === "PENDING" && order.paymentMethod === "UNPAID");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    order.items.map((item) => ({
      key: `existing:${item.id}`,
      id: item.id,
      menuItemId: item.menuItemId,
      sizeId: item.sizeId,
      sizeLabel: item.sizeLabel,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      notes: item.notes,
    })),
  );
  const [discount, setDiscount] = useState(order.discountAmount ? order.discountAmount.toFixed(2) : "");
  const [method, setMethod] = useState<Method>(
    (METHODS.some((entry) => entry.value === order.paymentMethod) ? order.paymentMethod : "CASH") as Method,
  );
  const [legs, setLegs] = useState<{ method: (typeof SPLIT_METHODS)[number]; amount: string }[]>(() =>
    order.splitPayments?.length
      ? order.splitPayments
          .filter((leg) => (SPLIT_METHODS as readonly string[]).includes(leg.method))
          .map((leg) => ({ method: leg.method as (typeof SPLIT_METHODS)[number], amount: leg.amount.toFixed(2) }))
      : [
          { method: "CASH", amount: "" },
          { method: "MOMO", amount: "" },
        ],
  );
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sizeFor, setSizeFor] = useState<PosMenuItem | null>(null);
  const { run, busy, error } = usePosAction();

  // ---- Totals as they will be ------------------------------------------------
  const discountValue = Number(discount) || 0;
  const totals = computeOrderTotals({
    lines: lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    discountAmount: discountValue,
  });
  // Tax-exclusive pricing adds tax on top server-side; the preview follows the
  // inclusive default and the saved order is always the server's figure.
  const newTotal = totals.total;
  const difference = settleDifference(order.total, newTotal);

  const legAmounts = legs.map((leg, index) => {
    if (index === legs.length - 1) {
      const prior = legs.slice(0, -1).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      return roundMoney(Math.max(0, newTotal - prior));
    }
    return roundMoney(Number(leg.amount) || 0);
  });
  const splitInvalid = paid && method === "SPLIT" && (legs.length < 2 || legAmounts.some((amount) => amount <= 0));

  // ---- Adding dishes ----------------------------------------------------------
  const choices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return menu.items.filter(
      (item) =>
        (category === "all" || item.categoryId === category) && (!needle || item.name.toLowerCase().includes(needle)),
    );
  }, [menu.items, query, category]);

  function add(item: PosMenuItem, size?: PosMenuSize) {
    const key = `new:${lineKey(item.id, size?.id)}`;
    setLines((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) => (line.key === key ? { ...line, quantity: Math.min(999, line.quantity + 1) } : line));
      }
      return [
        ...current,
        {
          key,
          menuItemId: item.id,
          sizeId: size?.id ?? null,
          sizeLabel: size?.label ?? null,
          name: item.name,
          unitPrice: size ? size.price : item.price,
          quantity: 1,
        },
      ];
    });
  }

  function pick(item: PosMenuItem) {
    if (item.sizes && item.sizes.length > 0) setSizeFor(item);
    else add(item);
  }

  const setQuantity = (key: string, quantity: number) =>
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) => (line.key === key ? { ...line, quantity: Math.min(999, quantity) } : line)),
    );

  async function save() {
    const data = await run(() =>
      posRequest<{ order: OrderView }>(endpoint, "PATCH", {
        action: "edit",
        lines: lines.map((line) =>
          line.id
            ? { id: line.id, quantity: line.quantity, notes: line.notes ?? null }
            : { menuItemId: line.menuItemId, sizeId: line.sizeId ?? null, quantity: line.quantity, notes: line.notes ?? null },
        ),
        discountAmount: discountValue,
        ...(paid && {
          payment:
            method === "SPLIT"
              ? { paymentMethod: "SPLIT", splitPayments: legs.map((leg, index) => ({ method: leg.method, amount: legAmounts[index] })) }
              : { paymentMethod: method },
        }),
        reason: reason.trim() || undefined,
      }),
    );
    if (data?.order) onSaved(data.order);
  }

  const empty = lines.length === 0;

  return (
    <>
      <Sheet
        eyebrow={paid ? "Paid order · manager edit" : "Unpaid order"}
        title={`Edit order ${callNumber(order.orderNumber)}`}
        subtitle={order.customerName?.trim() || order.tableLabel || undefined}
        onClose={onClose}
        dismissible={!busy}
        size="lg"
        fullOnMobile
        footer={
          <div className="space-y-2">
            <SheetError message={error ?? (empty ? "An order needs at least one item. Void it instead." : null)} />
            <Button size="lg" className="w-full" onClick={save} busy={busy} disabled={empty || splitInvalid}>
              {difference.kind === "collect"
                ? `Save · collect ${formatGHS(difference.amount)}`
                : difference.kind === "refund"
                  ? `Save · give back ${formatGHS(difference.amount)}`
                  : "Save changes"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ---- Lines ---------------------------------------------------- */}
          <section>
            <FieldLabel>On the order</FieldLabel>
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.key}
                  className="flex items-center gap-2 rounded-2xl border px-3 py-2"
                  style={{ borderColor: "var(--s-border)", background: line.id ? "var(--s-panel)" : "color-mix(in srgb, var(--s-good) 8%, var(--s-panel))" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {line.name}
                      {line.sizeLabel && <span style={{ color: "var(--s-brand)" }}> · {line.sizeLabel}</span>}
                      {!line.id && (
                        <span className="ml-1.5 text-[11px] font-bold uppercase" style={{ color: "var(--s-good)" }}>
                          new
                        </span>
                      )}
                    </p>
                    <p className="money text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      {formatGHS(line.unitPrice)} each · {formatGHS(roundMoney(line.unitPrice * line.quantity))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.key, line.quantity - 1)}
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: "var(--s-panel-alt)" }}
                    aria-label={`One less ${line.name}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="money w-8 text-center font-bold">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.key, line.quantity + 1)}
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: "var(--s-panel-alt)" }}
                    aria-label={`One more ${line.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.key, 0)}
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ color: "var(--s-bad)" }}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Add dishes ----------------------------------------------- */}
          <section>
            <FieldLabel>Add dishes</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--s-ink-faint)" }} />
              <FieldInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the menu"
                aria-label="Search the menu"
                className="pl-10"
              />
            </div>
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
              {[{ id: "all", name: "All" }, ...menu.categories].map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setCategory(entry.id)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold !min-h-9"
                  style={
                    category === entry.id
                      ? { background: "var(--s-ink)", color: "var(--s-panel)" }
                      : { background: "var(--s-panel-alt)", color: "var(--s-ink-muted)" }
                  }
                >
                  {entry.name}
                </button>
              ))}
            </div>
            <div className="mt-2 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
              {choices.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item)}
                  className="flex flex-col items-start rounded-xl border px-2.5 py-2 text-left"
                  style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
                >
                  <span className="line-clamp-2 text-xs font-bold leading-snug">{item.name}</span>
                  <span className="money mt-1 text-xs" style={{ color: "var(--s-ink-muted)" }}>
                    {item.sizes?.length ? "from " : ""}
                    {formatGHS(item.price)}
                  </span>
                </button>
              ))}
              {choices.length === 0 && (
                <p className="col-span-full py-4 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
                  No dish matches that.
                </p>
              )}
            </div>
          </section>

          {/* ---- Discount and totals -------------------------------------- */}
          <section className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div>
              <FieldLabel htmlFor="edit-discount" hint="Optional">
                Discount
              </FieldLabel>
              <FieldInput
                id="edit-discount"
                inputMode="decimal"
                value={discount}
                onChange={(event) => setDiscount(event.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className="money text-right"
              />
            </div>
            <div className="rounded-2xl px-4 py-2.5 text-right" style={{ background: "var(--s-panel-alt)" }}>
              <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                Was <span className="money">{formatGHS(order.total)}</span>
              </p>
              <p className="money text-xl font-extrabold">{formatGHS(newTotal)}</p>
            </div>
          </section>

          {paid && difference.kind !== "none" && (
            <p
              className="rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{
                background: `color-mix(in srgb, var(${difference.kind === "collect" ? "--s-good" : "--s-warn"}) 12%, var(--s-panel))`,
                color: difference.kind === "collect" ? "var(--s-good)" : "var(--s-warn)",
              }}
            >
              {difference.kind === "collect"
                ? `The customer pays ${formatGHS(difference.amount)} more.`
                : `Give the customer ${formatGHS(difference.amount)} back.`}{" "}
              The drawer follows the new total.
            </p>
          )}

          {/* ---- Payment (paid orders) ------------------------------------ */}
          {paid && (
            <section>
              <FieldLabel>Paid with</FieldLabel>
              <div className="grid grid-cols-5 gap-1.5">
                {METHODS.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setMethod(entry.value)}
                    className="flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 text-xs font-bold"
                    style={
                      method === entry.value
                        ? { background: "var(--s-brand)", color: "#fff", borderColor: "transparent" }
                        : { background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }
                    }
                  >
                    <MethodMark method={entry.value} />
                    {entry.label}
                  </button>
                ))}
              </div>
              {method === "SPLIT" && (
                <div className="mt-2 space-y-2">
                  {legs.map((leg, index) => {
                    const last = index === legs.length - 1;
                    return (
                      <div key={index} className="grid grid-cols-[1fr_8rem] gap-2">
                        <FieldSelect
                          aria-label={`Part ${index + 1} method`}
                          value={leg.method}
                          onChange={(event) => {
                            const value = event.target.value as (typeof SPLIT_METHODS)[number];
                            setLegs((current) => current.map((entry, i) => (i === index ? { ...entry, method: value } : entry)));
                          }}
                        >
                          {SPLIT_METHODS.map((option) => (
                            <option key={option} value={option}>
                              {SPLIT_LABELS[option]}
                            </option>
                          ))}
                        </FieldSelect>
                        <FieldInput
                          aria-label={`Part ${index + 1} amount`}
                          inputMode="decimal"
                          value={last ? legAmounts[index].toFixed(2) : leg.amount}
                          readOnly={last}
                          onChange={(event) => {
                            const amount = event.target.value.replace(/[^\d.]/g, "");
                            setLegs((current) => current.map((entry, i) => (i === index ? { ...entry, amount } : entry)));
                          }}
                          className="money text-right"
                        />
                      </div>
                    );
                  })}
                  {legs.length < 3 && (
                    <button
                      type="button"
                      className="text-sm font-bold"
                      style={{ color: "var(--s-brand)" }}
                      onClick={() => setLegs((current) => [...current, { method: "CARD", amount: "" }])}
                    >
                      Add another tender
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          <section>
            <FieldLabel htmlFor="edit-reason" hint="Optional">
              Why
            </FieldLabel>
            <FieldInput
              id="edit-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Customer added a drink"
              maxLength={200}
            />
          </section>
        </div>
      </Sheet>

      {sizeFor && (
        <SizePickerSheet
          item={sizeFor}
          onPick={(size) => {
            add(sizeFor, size);
            setSizeFor(null);
          }}
          onClose={() => setSizeFor(null)}
        />
      )}
    </>
  );
}
