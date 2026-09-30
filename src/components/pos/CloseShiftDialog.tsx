"use client";

import { useMemo, useState } from "react";
import { Check, CircleAlert, CircleCheck } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { countedTotal, drawerDifference, differenceLabel, type DenominationCount } from "@/lib/cash";
import { closeProblem, VARIANCE_NOTE_MIN } from "@/lib/shift-close";
import { PAYMENT_LABELS } from "@/components/admin/labels";
import { callNumber } from "@/lib/session-utils";
import DenominationCounter from "./DenominationCounter";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import { SettleSheet, TicketCard, VoidSheet, useNow } from "./OpenTickets";
import Sheet, { SheetError } from "./ui/Sheet";
import Button from "./ui/Button";
import { PosRequestError, posRequest, usePosAction } from "./usePosAction";
import type { OrderView, SessionView } from "./types";

/**
 * Closing the shift, one step at a time.
 *
 * Unpaid tickets first (settle or void them right here — the close refuses to
 * run while any remain), then the drawer count, then Mobile Money, then a review
 * that shows exactly what will be written before anything is. A drawer that
 * does not balance needs a note, and the server checks the same rules again.
 */
type Step = "unpaid" | "count" | "momo" | "review" | "done";

const STEP_LABELS: Record<Exclude<Step, "done">, string> = {
  unpaid: "Unpaid",
  count: "Count cash",
  momo: "MoMo",
  review: "Review",
};

export default function CloseShiftDialog({
  session,
  tickets,
  canVoid,
  onRefresh,
  onClose,
  onFinished,
}: {
  session: SessionView;
  tickets: OrderView[];
  canVoid: boolean;
  /** Reload the shift and tickets after a settle or void. */
  onRefresh: () => Promise<void> | void;
  onClose: () => void;
  /** Leave the dialog after a successful close. */
  onFinished: () => void;
}) {
  const unpaid = useMemo(
    () => tickets.filter((ticket) => ticket.sessionId === session.id),
    [tickets, session.id],
  );
  const [hadUnpaid] = useState(unpaid.length > 0);
  const steps: Exclude<Step, "done">[] = hadUnpaid
    ? ["unpaid", "count", "momo", "review"]
    : ["count", "momo", "review"];

  const [step, setStep] = useState<Step>(steps[0]);
  const [mode, setMode] = useState<"notes" | "total">("notes");
  const [counts, setCounts] = useState<DenominationCount>({});
  const [typedTotal, setTypedTotal] = useState("");
  const [momo, setMomo] = useState("");
  const [momoChecked, setMomoChecked] = useState(session.openingMomo !== null);
  const [note, setNote] = useState("");
  const [settling, setSettling] = useState<OrderView | null>(null);
  const [voiding, setVoiding] = useState<OrderView | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [closed, setClosed] = useState<SessionView | null>(null);
  const { run, busy, error, setError } = usePosAction();
  const now = useNow();

  const hasNotes = Object.keys(counts).length > 0;
  const counted =
    mode === "notes"
      ? hasNotes
        ? countedTotal(counts)
        : null
      : typedTotal === ""
        ? null
        : Number(typedTotal) || 0;
  const difference = drawerDifference(session.expectedCash, counted);
  const momoValue = momoChecked && momo !== "" ? Number(momo) || 0 : null;
  const momoDifference =
    session.expectedMomo !== null && momoValue !== null
      ? drawerDifference(session.expectedMomo, momoValue)
      : null;
  const problem = closeProblem({
    unpaidCount: unpaid.length,
    expectedCash: session.expectedCash,
    closingCash: counted,
    notes: note,
  });

  const index = step === "done" ? steps.length : steps.indexOf(step);

  function canLeave(current: Step): boolean {
    if (current === "unpaid") return unpaid.length === 0;
    if (current === "count") return counted !== null;
    if (current === "momo") return !momoChecked || momo !== "";
    return true;
  }

  function next() {
    setError(null);
    const at = steps.indexOf(step as Exclude<Step, "done">);
    if (at >= 0 && at < steps.length - 1) setStep(steps[at + 1]);
  }

  function back() {
    setError(null);
    const at = steps.indexOf(step as Exclude<Step, "done">);
    if (at > 0) setStep(steps[at - 1]);
  }

  async function confirmClose() {
    if (problem) {
      setError(problem);
      return;
    }
    const data = await run(async () => {
      try {
        return await posRequest<{ session: SessionView }>("/api/pos/sessions", "PATCH", {
          sessionId: session.id,
          cashCount: mode === "notes" ? counts : undefined,
          closingCash: mode === "total" ? counted ?? undefined : undefined,
          closingMomo: momoValue,
          notes: note.trim() || undefined,
        });
      } catch (caught) {
        // A ticket raised on another device since this dialog opened: reload
        // so it shows up, and send the cashier back to deal with it.
        if (caught instanceof PosRequestError) {
          const detail = caught.detail as { unpaid?: number } | undefined;
          if (detail?.unpaid && detail.unpaid > 0) {
            await onRefresh();
            setStep(steps.includes("unpaid") ? "unpaid" : "review");
          }
        }
        throw caught;
      }
    });
    if (data) {
      setClosed(data.session);
      setStep("done");
    }
  }

  const openedAt = new Date(session.openedAt).toLocaleString("en-GB", {
    timeZone: "Africa/Accra",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const differenceTone =
    difference === null ? "var(--s-ink-muted)" : difference === 0 ? "var(--s-good)" : "var(--s-warn)";

  const footer =
    step === "done" ? (
      <Button size="lg" className="w-full" onClick={onFinished}>
        Open the next shift
      </Button>
    ) : (
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button
          tone="secondary"
          onClick={index === 0 ? onClose : back}
          disabled={busy}
          className="min-w-24"
        >
          {index === 0 ? "Cancel" : "Back"}
        </Button>
        {step === "review" ? (
          <Button size="lg" busy={busy} disabled={!!problem} onClick={confirmClose}>
            Close shift
          </Button>
        ) : (
          <Button size="lg" disabled={!canLeave(step)} onClick={next}>
            {step === "unpaid" && unpaid.length > 0
              ? `${unpaid.length} still unpaid`
              : step === "count" && counted === null
                ? "Count the drawer first"
                : "Next"}
          </Button>
        )}
      </div>
    );

  return (
    <>
      <Sheet
        eyebrow={session.isStale ? `Shift from ${session.businessDay}` : "Close the shift"}
        title={step === "done" ? "Shift closed" : `${session.openedBy.name}'s shift`}
        subtitle={step === "done" ? undefined : `Opened ${openedAt}`}
        onClose={step === "done" ? onFinished : onClose}
        dismissible={!busy}
        size="lg"
        fullOnMobile
        footer={footer}
      >
        {step !== "done" && <Stepper steps={steps} current={index} />}

        {step === "unpaid" && (
          <div className="space-y-3">
            {unpaid.length === 0 ? (
              <Callout tone="good" title="Every ticket is settled">
                Nothing is holding the close. Carry on to count the drawer.
              </Callout>
            ) : (
              <Callout tone="warn" title={`${unpaid.length} ticket${unpaid.length === 1 ? "" : "s"} not paid`}>
                Take payment or {canVoid ? "void them" : "ask a manager to void them"} before
                the shift can close — otherwise the takings will not match what left the kitchen.
              </Callout>
            )}
            {flash && (
              <p className="text-sm font-medium" style={{ color: "var(--s-good)" }}>
                {flash}
              </p>
            )}
            <div className="grid gap-3">
              {unpaid.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  now={now}
                  canVoid={canVoid}
                  onTakePayment={() => setSettling(ticket)}
                  onVoid={() => setVoiding(ticket)}
                />
              ))}
            </div>
          </div>
        )}

        {step === "count" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">What is in the drawer?</p>
                <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
                  Should be <span className="money font-semibold">{formatGHS(session.expectedCash)}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-xl p-1 text-xs" style={{ background: "var(--s-panel-alt)" }}>
                {(
                  [
                    ["notes", "By note"],
                    ["total", "Total"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                    className="rounded-lg px-3 py-2 font-bold"
                    style={{
                      background: mode === value ? "var(--s-panel)" : "transparent",
                      color: mode === value ? "var(--s-ink)" : "var(--s-ink-muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "notes" ? (
              <>
                <DenominationCounter counts={counts} onChange={setCounts} />
                {hasNotes && (
                  <button
                    type="button"
                    onClick={() => setCounts({})}
                    className="text-sm font-semibold underline"
                    style={{ color: "var(--s-ink-muted)" }}
                  >
                    Reset count
                  </button>
                )}
              </>
            ) : (
              <>
                <div
                  className="money rounded-2xl border px-4 py-3 text-right text-4xl font-bold"
                  style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
                >
                  {formatGHS(Number(typedTotal) || 0)}
                </div>
                <Numpad
                  value={typedTotal}
                  onChange={setTypedTotal}
                  maxDigits={7}
                  allowDecimal
                  shortcuts={CASH_SHORTCUTS}
                />
                <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                  A note-by-note count is better evidence if the drawer is ever questioned.
                </p>
              </>
            )}

            {counted !== null && (
              <div
                className="flex items-center justify-between rounded-2xl px-4 py-3 font-bold"
                style={{ background: `color-mix(in srgb, ${differenceTone} 12%, transparent)`, color: differenceTone }}
              >
                <span>{difference === 0 ? "Balanced" : "Difference"}</span>
                <span className="money">{differenceLabel(difference)}</span>
              </div>
            )}
          </div>
        )}

        {step === "momo" && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Mobile Money balance</p>
              <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {session.expectedMomo === null
                  ? "Not recorded at opening, so it cannot be checked against anything — record it now anyway for the report."
                  : `Should be ${formatGHS(session.expectedMomo)}.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button tone={momoChecked ? "primary" : "secondary"} onClick={() => setMomoChecked(true)}>
                Enter balance
              </Button>
              <Button
                tone={!momoChecked ? "primary" : "secondary"}
                onClick={() => {
                  setMomoChecked(false);
                  setMomo("");
                }}
              >
                Not checked
              </Button>
            </div>
            {momoChecked && (
              <>
                <div
                  className="money rounded-2xl border px-4 py-3 text-right text-4xl font-bold"
                  style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)" }}
                >
                  {formatGHS(Number(momo) || 0)}
                </div>
                <Numpad value={momo} onChange={setMomo} maxDigits={7} allowDecimal shortcuts={[]} />
              </>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div
              className="rounded-2xl px-4 py-4 text-center"
              style={{ background: `color-mix(in srgb, ${differenceTone} 12%, transparent)` }}
            >
              <p className="text-sm font-semibold" style={{ color: differenceTone }}>
                Drawer
              </p>
              <p className="money mt-1 text-3xl font-bold" style={{ color: differenceTone }}>
                {differenceLabel(difference)}
              </p>
            </div>

            <Summary
              rows={[
                ["Opening float", formatGHS(session.openingFloat)],
                ["Cash sales", formatGHS(session.takings.cash)],
                ...(session.cashIn > 0 ? ([["Cash put in", `+${formatGHS(session.cashIn)}`]] as const) : []),
                ...(session.cashOut > 0 ? ([["Cash taken out", `−${formatGHS(session.cashOut)}`]] as const) : []),
              ]}
              total={["Should be in the drawer", formatGHS(session.expectedCash)]}
              extra={["Counted", counted === null ? "—" : formatGHS(counted)]}
            />

            <Summary
              rows={Object.entries(session.takings.byMethod).map(
                ([method, amount]) => [PAYMENT_LABELS[method] ?? method, formatGHS(amount)] as const,
              )}
              total={[
                `Takings · ${session.takings.orderCount} order${session.takings.orderCount === 1 ? "" : "s"}`,
                formatGHS(session.takings.gross),
              ]}
            />

            {momoValue !== null && (
              <Summary
                rows={[
                  ["MoMo should be", session.expectedMomo === null ? "Not recorded" : formatGHS(session.expectedMomo)],
                  ["MoMo balance now", formatGHS(momoValue)],
                ]}
                total={["MoMo", momoDifference === null ? "Not comparable" : differenceLabel(momoDifference)]}
              />
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Note{" "}
                <span style={{ color: difference ? "var(--s-warn)" : "var(--s-ink-faint)" }}>
                  {difference ? "(required — the drawer does not balance)" : "(optional)"}
                </span>
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder={difference ? "e.g. Paid the gas man GH₵20 and forgot to record it" : "Anything the manager should know"}
                className="w-full rounded-2xl border px-3 py-3 text-sm outline-none"
                style={{
                  background: "var(--s-panel-alt)",
                  borderColor: difference && note.trim().length < VARIANCE_NOTE_MIN ? "var(--s-warn)" : "var(--s-border)",
                  color: "var(--s-ink)",
                }}
              />
            </div>

            <SheetError message={error} />
          </div>
        )}

        {step === "done" && closed && (
          <div className="space-y-4">
            <div className="grid place-items-center py-4 text-center">
              <span
                className="grid h-14 w-14 place-items-center rounded-full"
                style={{ background: "color-mix(in srgb, var(--s-good) 18%, transparent)", color: "var(--s-good)" }}
              >
                <Check className="w-7 h-7" />
              </span>
              <p className="mt-3 text-lg font-bold">The till is closed</p>
              <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {closed.businessDay} · {closed.takings.orderCount} order
                {closed.takings.orderCount === 1 ? "" : "s"} · {formatGHS(closed.takings.gross)}
              </p>
            </div>
            <Summary
              rows={[
                ["Should be in the drawer", formatGHS(closed.expectedCash)],
                ["Counted", closed.closingCash === null ? "—" : formatGHS(closed.closingCash)],
              ]}
              total={["Drawer", closed.differenceLabel]}
            />
          </div>
        )}
      </Sheet>

      {settling && (
        <SettleSheet
          ticket={settling}
          onClose={() => setSettling(null)}
          onSettled={async (order) => {
            setSettling(null);
            setFlash(`Ticket ${callNumber(order.orderNumber)} paid.`);
            await onRefresh();
          }}
        />
      )}
      {voiding && (
        <VoidSheet
          ticket={voiding}
          onClose={() => setVoiding(null)}
          onVoided={async () => {
            setVoiding(null);
            setFlash("Ticket voided.");
            await onRefresh();
          }}
        />
      )}
    </>
  );
}

function Stepper({ steps, current }: { steps: Exclude<Step, "done">[]; current: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2" aria-label="Steps">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className="flex flex-1 items-center gap-2 min-w-0">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
              style={{
                background: done || active ? "var(--s-brand)" : "var(--s-panel-alt)",
                color: done || active ? "#fff" : "var(--s-ink-faint)",
              }}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="w-4 h-4" /> : index + 1}
            </span>
            <span
              className="hidden sm:block truncate text-xs font-semibold"
              style={{ color: active ? "var(--s-ink)" : "var(--s-ink-faint)" }}
            >
              {STEP_LABELS[step]}
            </span>
            {index < steps.length - 1 && (
              <span className="h-px flex-1" style={{ background: done ? "var(--s-brand)" : "var(--s-border)" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "good" | "warn";
  title: string;
  children: React.ReactNode;
}) {
  const color = tone === "good" ? "var(--s-good)" : "var(--s-warn)";
  const Icon = tone === "good" ? CircleCheck : CircleAlert;
  return (
    <div
      className="flex gap-3 rounded-2xl px-4 py-3"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <Icon className="mt-0.5 w-5 h-5 shrink-0" style={{ color }} />
      <div>
        <p className="font-bold" style={{ color }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
          {children}
        </p>
      </div>
    </div>
  );
}

function Summary({
  rows,
  total,
  extra,
}: {
  rows: readonly (readonly [string, string])[];
  total: readonly [string, string];
  extra?: readonly [string, string];
}) {
  return (
    <dl className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--s-border)" }}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 py-0.5">
          <dt style={{ color: "var(--s-ink-muted)" }}>{label}</dt>
          <dd className="money">{value}</dd>
        </div>
      ))}
      <div
        className="mt-2 flex justify-between gap-3 border-t pt-2 font-bold"
        style={{ borderColor: "var(--s-border)" }}
      >
        <dt>{total[0]}</dt>
        <dd className="money">{total[1]}</dd>
      </div>
      {extra && (
        <div className="flex justify-between gap-3 pt-1 font-bold">
          <dt>{extra[0]}</dt>
          <dd className="money">{extra[1]}</dd>
        </div>
      )}
    </dl>
  );
}
