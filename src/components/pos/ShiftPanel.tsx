"use client";

import { useState } from "react";
import { Banknote, LogOut, Smartphone } from "lucide-react";
import AnisLogo from "@/components/brand/AnisLogo";
import { formatGHS } from "@/lib/money";
import Numpad, { CASH_SHORTCUTS } from "./Numpad";
import Button from "./ui/Button";
import { SheetError } from "./ui/Sheet";
import { posRequest, usePosAction } from "./usePosAction";
import type { SessionView } from "./types";

/**
 * Opening the drawer when no shift is open.
 *
 * One clear amount at a time. The big figure is a readout, not a text box —
 * every digit comes from the pad below. Mobile Money is optional and stays on
 * its own step so the cashier never wonders which field the pad is writing to.
 */
export function OpenShiftCard({
  userName,
  defaultOpeningFloat,
  loadError,
  onOpened,
  onSignOut,
  backOfficeHref,
}: {
  userName: string;
  defaultOpeningFloat: number;
  loadError?: boolean;
  onOpened: () => void;
  onSignOut: () => void;
  backOfficeHref?: string;
}) {
  const [step, setStep] = useState<"cash" | "momo">("cash");
  const [cash, setCash] = useState(defaultOpeningFloat > 0 ? String(defaultOpeningFloat) : "");
  const [momo, setMomo] = useState("");
  const [includeMomo, setIncludeMomo] = useState(false);
  const [replaceFirst, setReplaceFirst] = useState(defaultOpeningFloat > 0);
  const { run, busy, error } = usePosAction();

  function goCash() {
    setStep("cash");
    setReplaceFirst(cash !== "");
  }
  function goMomo() {
    setIncludeMomo(true);
    setStep("momo");
    setReplaceFirst(momo !== "");
  }

  async function open() {
    const done = await run(() =>
      posRequest("/api/pos/sessions", "POST", {
        openingFloat: Number(cash) || 0,
        openingMomo: includeMomo && momo !== "" ? Number(momo) || 0 : null,
      }),
    );
    if (done) onOpened();
  }

  const firstName = userName.split(" ")[0] || userName;
  const editingCash = step === "cash";
  const display = editingCash ? cash : momo;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background:
          "radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--s-brand) 18%, transparent), transparent 55%), var(--s-bg)",
      }}
    >
      <header
        className="flex items-center justify-between px-5 pt-5 pb-2"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <AnisLogo className="h-8 w-auto" />
        <div className="flex items-center gap-1">
          {backOfficeHref && (
            <a
              href={backOfficeHref}
              className="rounded-full px-3 py-2 text-sm font-semibold"
              style={{ color: "var(--s-ink-muted)" }}
            >
              Back office
            </a>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold"
            style={{ color: "var(--s-ink-muted)" }}
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <section
          className="w-full max-w-md overflow-hidden rounded-[1.75rem] border shadow-2xl"
          style={{
            background: "var(--s-panel)",
            borderColor: "var(--s-border)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div className="px-5 pt-6 pb-4">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--s-ink-faint)" }}
            >
              Welcome, {firstName}
            </p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight leading-tight">
              Open the till
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--s-ink-muted)" }}>
              Punch what is in the drawer. Today&apos;s sales are measured against this number.
            </p>
            {loadError && (
              <div className="mt-3">
                <SheetError message="Could not check for an open shift. If one is open on another device, opening here will say so." />
              </div>
            )}
          </div>

          {/* Segmented control: one field at a time, no competing cursors. */}
          <div className="px-5">
            <div
              className="grid grid-cols-2 gap-1 rounded-2xl p-1"
              style={{ background: "var(--s-panel-alt)" }}
              role="tablist"
              aria-label="What to enter"
            >
              <SegmentTab
                active={editingCash}
                onClick={goCash}
                icon={Banknote}
                label="Cash"
              />
              <SegmentTab
                active={!editingCash}
                onClick={goMomo}
                icon={Smartphone}
                label="Mobile Money"
              />
            </div>
          </div>

          <div className="px-5 pt-5 pb-2 text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--s-ink-muted)" }}>
              {editingCash ? "Cash in the drawer" : "Mobile Money balance"}
            </p>
            <p
              className="money mt-1 text-[2.75rem] font-bold tracking-tight leading-none tabular-nums"
              aria-live="polite"
            >
              {formatGHS(Number(display) || 0)}
            </p>
            {!editingCash && (
              <button
                type="button"
                onClick={() => {
                  setIncludeMomo(false);
                  setMomo("");
                  goCash();
                }}
                className="mt-3 text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--s-ink-muted)" }}
              >
                Skip Mobile Money
              </button>
            )}
          </div>

          <div className="px-4 pb-2">
            <Numpad
              value={display}
              onChange={editingCash ? setCash : setMomo}
              maxDigits={7}
              allowDecimal
              shortcuts={CASH_SHORTCUTS}
              replaceFirst={replaceFirst}
              onReplaceConsumed={() => setReplaceFirst(false)}
            />
          </div>

          <div
            className="space-y-2 border-t px-5 pt-4"
            style={{
              borderColor: "var(--s-border)",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            }}
          >
            <SheetError message={error} />
            <Button size="lg" className="w-full" busy={busy} onClick={open}>
              Start with {formatGHS(Number(cash) || 0)} cash
              {includeMomo && momo !== "" ? ` · MoMo ${formatGHS(Number(momo) || 0)}` : ""}
            </Button>
            {editingCash && !includeMomo && (
              <p className="text-center text-xs" style={{ color: "var(--s-ink-faint)" }}>
                MoMo left blank means &quot;not checked&quot; — not zero.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SegmentTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Banknote;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors"
      style={{
        background: active ? "var(--s-panel)" : "transparent",
        color: active ? "var(--s-ink)" : "var(--s-ink-muted)",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.25)" : undefined,
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

/**
 * The running shift: what has been taken, what the drawer should hold, and the
 * two things a cashier does here — move cash in or out, and close.
 */
export default function ShiftPanel({
  session,
  onCashMovement,
  onCloseShift,
}: {
  session: SessionView;
  onCashMovement: () => void;
  onCloseShift: () => void;
}) {
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", {
      timeZone: "Africa/Accra",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 pb-24 max-w-3xl mx-auto w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            {session.isStale ? `Shift from ${session.businessDay}` : "This shift"} · opened by{" "}
            {session.openedBy.name} at {time(session.openedAt)}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="money">{formatGHS(session.takings.gross)}</span> taken
          </h1>
        </div>
        <div className="flex gap-2">
          <Button tone="secondary" onClick={onCashMovement}>
            Cash in / out
          </Button>
          <Button onClick={onCloseShift}>Close shift</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Orders" value={String(session.takings.orderCount)} />
        <Stat label="Cash sales" value={formatGHS(session.takings.cash)} />
        <Stat label="MoMo sales" value={formatGHS(session.takings.momo)} />
        <Stat label="Drawer should hold" value={formatGHS(session.expectedCash)} strong />
      </div>

      <section
        className="rounded-[1.5rem] border p-5"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <h2 className="font-semibold">The drawer</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label="Opening float" value={formatGHS(session.openingFloat)} />
          <Row label="Cash sales" value={`+${formatGHS(session.takings.cash)}`} />
          {session.cashIn > 0 && <Row label="Cash put in" value={`+${formatGHS(session.cashIn)}`} />}
          {session.cashOut > 0 && (
            <Row label="Cash taken out" value={`−${formatGHS(session.cashOut)}`} />
          )}
          <div
            className="flex justify-between border-t pt-2 mt-2 font-bold"
            style={{ borderColor: "var(--s-border)" }}
          >
            <dt>Should be in the drawer</dt>
            <dd className="money">{formatGHS(session.expectedCash)}</dd>
          </div>
          <Row
            label="Mobile Money should be"
            value={
              session.expectedMomo === null
                ? "Not recorded at opening"
                : formatGHS(session.expectedMomo)
            }
          />
        </dl>
      </section>

      <section
        className="rounded-[1.5rem] border p-5"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Cash in and out</h2>
          <button
            type="button"
            onClick={onCashMovement}
            className="text-sm font-semibold"
            style={{ color: "var(--s-brand)" }}
          >
            Record one
          </button>
        </div>
        {session.movements.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--s-ink-faint)" }}>
            Nothing yet. Buying gas or fetching change from the till goes here.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {session.movements.map((movement) => {
              const incoming = movement.direction === "IN";
              return (
                <li key={movement.id} className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
                    style={{
                      color: incoming ? "var(--s-good)" : "var(--s-bad)",
                      background: `color-mix(in srgb, ${incoming ? "var(--s-good)" : "var(--s-bad)"} 14%, transparent)`,
                    }}
                  >
                    {incoming ? "+" : "−"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{movement.reason}</p>
                    <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      {movement.by} · {time(movement.at)}
                    </p>
                  </div>
                  <span
                    className="money whitespace-nowrap text-sm font-bold"
                    style={{ color: incoming ? "var(--s-good)" : "var(--s-bad)" }}
                  >
                    {incoming ? "+" : "−"}
                    {formatGHS(movement.amount)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className="rounded-[1.25rem] border p-4"
      style={{
        background: strong
          ? "color-mix(in srgb, var(--s-brand) 10%, var(--s-panel))"
          : "var(--s-panel)",
        borderColor: strong
          ? "color-mix(in srgb, var(--s-brand) 40%, var(--s-border))"
          : "var(--s-border)",
      }}
    >
      <p className="text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
        {label}
      </p>
      <p className="money mt-1 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: "var(--s-ink-muted)" }}>{label}</dt>
      <dd className="money">{value}</dd>
    </div>
  );
}
