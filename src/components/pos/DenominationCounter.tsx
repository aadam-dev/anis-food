"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { GHS_DENOMINATIONS, countedTotal, type DenominationCount } from "@/lib/cash";
import { formatGHS } from "@/lib/money";
import Numpad from "./Numpad";
import Sheet from "./ui/Sheet";
import Button from "./ui/Button";

/**
 * Counting the drawer, note by note.
 *
 * Asking for a single total invites arithmetic done in someone's head at the end
 * of a twelve-hour shift. Counting by denomination is what people physically do
 * anyway, and it leaves a breakdown worth looking at when a drawer is short.
 *
 * Each row is punched with − and +, or the count is tapped to type a stack in
 * one go ("37 twenties") on the numpad.
 */
function denominationLabel(denomination: number) {
  return denomination >= 1 ? `GH₵${denomination}` : `${Math.round(denomination * 100)}p`;
}

export default function DenominationCounter({
  counts,
  onChange,
}: {
  counts: DenominationCount;
  onChange: (counts: DenominationCount) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const total = countedTotal(counts);

  function set(denomination: number, value: number) {
    const next = { ...counts };
    const quantity = Math.max(0, Math.min(9999, Math.trunc(value)));
    if (quantity === 0) delete next[String(denomination)];
    else next[String(denomination)] = quantity;
    onChange(next);
  }

  const notes = GHS_DENOMINATIONS.filter((denomination) => denomination >= 1);
  const coins = GHS_DENOMINATIONS.filter((denomination) => denomination < 1);

  return (
    <div>
      <Group label="Notes and GH₵1–2 coins">
        {notes.map((denomination) => (
          <Row
            key={denomination}
            denomination={denomination}
            quantity={counts[String(denomination)] ?? 0}
            onSet={(value) => set(denomination, value)}
            onEdit={() => setEditing(denomination)}
          />
        ))}
      </Group>
      <Group label="Pesewa coins">
        {coins.map((denomination) => (
          <Row
            key={denomination}
            denomination={denomination}
            quantity={counts[String(denomination)] ?? 0}
            onSet={(value) => set(denomination, value)}
            onEdit={() => setEditing(denomination)}
          />
        ))}
      </Group>

      <div
        className="sticky bottom-0 mt-3 flex items-baseline justify-between rounded-2xl px-4 py-3"
        style={{ background: "var(--s-panel-alt)", border: "1px solid var(--s-border)" }}
      >
        <span className="font-semibold">Counted</span>
        <span className="money text-2xl font-bold">{formatGHS(total)}</span>
      </div>

      {editing !== null && (
        <CountSheet
          label={denominationLabel(editing)}
          denomination={editing}
          initial={counts[String(editing)] ?? 0}
          onConfirm={(value) => set(editing, value)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-3">
      <p
        className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--s-ink-faint)" }}
      >
        {label}
      </p>
      <div
        className="divide-y overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--s-border)" }}
      >
        {children}
      </div>
    </section>
  );
}

function Row({
  denomination,
  quantity,
  onSet,
  onEdit,
}: {
  denomination: number;
  quantity: number;
  onSet: (value: number) => void;
  onEdit: () => void;
}) {
  const active = quantity > 0;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        borderColor: "var(--s-border)",
        background: active ? "color-mix(in srgb, var(--s-brand) 7%, var(--s-panel))" : "var(--s-panel)",
      }}
    >
      <span className="money w-16 shrink-0 font-bold">{denominationLabel(denomination)}</span>
      <div className="flex flex-1 items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onSet(quantity - 1)}
          disabled={quantity === 0}
          className="h-11 w-11 shrink-0 grid place-items-center rounded-xl border disabled:opacity-30"
          style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
          aria-label={`One less ${denominationLabel(denomination)}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="money h-11 min-w-16 rounded-xl border px-3 text-lg font-bold"
          style={{
            borderColor: active ? "var(--s-brand)" : "var(--s-border)",
            background: "var(--s-panel-alt)",
            color: active ? "var(--s-ink)" : "var(--s-ink-faint)",
          }}
          aria-label={`${quantity} × ${denominationLabel(denomination)}. Tap to type a count`}
        >
          {quantity}
        </button>
        <button
          type="button"
          onClick={() => onSet(quantity + 1)}
          className="h-11 w-11 shrink-0 grid place-items-center rounded-xl border"
          style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
          aria-label={`One more ${denominationLabel(denomination)}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <span
        className="money w-20 shrink-0 text-right text-sm"
        style={{ color: active ? "var(--s-ink)" : "var(--s-ink-faint)" }}
      >
        {active ? formatGHS(denomination * quantity) : "—"}
      </span>
    </div>
  );
}

function CountSheet({
  label,
  denomination,
  initial,
  onConfirm,
  onClose,
}: {
  label: string;
  denomination: number;
  initial: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState(initial > 0 ? String(initial) : "");
  const quantity = Math.trunc(Number(raw) || 0);
  return (
    <Sheet
      eyebrow="How many"
      title={label}
      onClose={onClose}
      size="sm"
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            onConfirm(quantity);
            onClose();
          }}
        >
          Set {quantity} · {formatGHS(denomination * quantity)}
        </Button>
      }
    >
      <div
        className="mb-4 rounded-2xl border px-4 py-3 text-right"
        style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
      >
        <span className="money text-4xl font-bold">{raw || "0"}</span>
      </div>
      <Numpad value={raw} onChange={setRaw} maxDigits={4} shortcuts={[]} />
    </Sheet>
  );
}
