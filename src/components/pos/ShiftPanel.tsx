"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  LockKeyhole,
  LogOut,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";
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
 * The till cannot take money into a drawer nobody has counted, so this is the
 * whole screen until a shift starts. The figure is punched on a numpad right
 * here; Mobile Money is optional and "not checking" stays distinct from zero.
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
  const [field, setField] = useState<"cash" | "momo">("cash");
  const [cash, setCash] = useState(defaultOpeningFloat > 0 ? String(defaultOpeningFloat) : "");
  const [momo, setMomo] = useState("");
  const [checkMomo, setCheckMomo] = useState(false);
  const { run, busy, error } = usePosAction();

  async function open() {
    const done = await run(() =>
      posRequest("/api/pos/sessions", "POST", {
        openingFloat: Number(cash) || 0,
        openingMomo: checkMomo && momo !== "" ? Number(momo) || 0 : null,
      }),
    );
    if (done) onOpened();
  }

  const firstName = userName.split(" ")[0] || userName;

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <AnisLogo className="h-9 w-auto" />
          <div className="flex items-center gap-1">
            {backOfficeHref && (
              <a
                href={backOfficeHref}
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ color: "var(--s-ink-muted)" }}
              >
                Back office
              </a>
            )}
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ color: "var(--s-ink-muted)" }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>

        <section className="rounded-3xl border p-5 shadow-xl" style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--s-ink-muted)" }}>
            Good to see you, {firstName}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold">Open the till</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Count the drawer before the first sale. Everything today is measured against it.
          </p>

          {loadError && (
            <div className="mt-3">
              <SheetError message="Could not check for an open shift. If one is open on another device, opening here will say so." />
            </div>
          )}

          <button
            type="button"
            onClick={() => setField("cash")}
            aria-pressed={field === "cash"}
            className="mt-5 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left"
            style={{
              borderColor: field === "cash" ? "var(--s-brand)" : "var(--s-border)",
              background: "var(--s-panel-alt)",
            }}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Banknote className="w-4 h-4" /> Cash in the drawer
            </span>
            <span className="money text-3xl font-bold">{formatGHS(Number(cash) || 0)}</span>
          </button>

          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              disabled={!checkMomo}
              onClick={() => setField("momo")}
              aria-pressed={field === "momo"}
              className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left disabled:opacity-60"
              style={{
                borderColor: field === "momo" && checkMomo ? "var(--s-brand)" : "var(--s-border)",
                background: "var(--s-panel-alt)",
              }}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Smartphone className="w-4 h-4" /> Mobile Money
              </span>
              <span className="money font-bold">
                {checkMomo ? formatGHS(Number(momo) || 0) : "Not checking"}
              </span>
            </button>
            <Button
              tone={checkMomo ? "secondary" : "primary"}
              onClick={() => {
                const next = !checkMomo;
                setCheckMomo(next);
                setField(next ? "momo" : "cash");
                if (!next) setMomo("");
              }}
            >
              {checkMomo ? "Skip" : "Add"}
            </Button>
          </div>

          <div className="mt-4">
            <Numpad
              value={field === "cash" ? cash : momo}
              onChange={field === "cash" ? setCash : setMomo}
              maxDigits={7}
              allowDecimal
              shortcuts={CASH_SHORTCUTS}
            />
          </div>

          <div className="mt-4 space-y-3">
            <SheetError message={error} />
            <Button size="lg" className="w-full" busy={busy} onClick={open}>
              Start the shift with {formatGHS(Number(cash) || 0)}
            </Button>
          </div>
        </section>
      </div>
    </div>
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
          <h1 className="text-2xl font-bold">
            <span className="money">{formatGHS(session.takings.gross)}</span> taken
          </h1>
        </div>
        <div className="flex gap-2">
          <Button tone="secondary" onClick={onCashMovement}>
            <ArrowLeftRight className="w-4 h-4" /> Cash in / out
          </Button>
          <Button onClick={onCloseShift}>
            <LockKeyhole className="w-4 h-4" /> Close shift
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Receipt} label="Orders" value={String(session.takings.orderCount)} />
        <Stat icon={Banknote} label="Cash sales" value={formatGHS(session.takings.cash)} />
        <Stat icon={Smartphone} label="MoMo sales" value={formatGHS(session.takings.momo)} />
        <Stat icon={Wallet} label="Drawer should hold" value={formatGHS(session.expectedCash)} strong />
      </div>

      <section className="rounded-3xl border p-4" style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}>
        <h2 className="font-semibold">The drawer</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label="Opening float" value={formatGHS(session.openingFloat)} />
          <Row label="Cash sales" value={`+${formatGHS(session.takings.cash)}`} />
          {session.cashIn > 0 && <Row label="Cash put in" value={`+${formatGHS(session.cashIn)}`} />}
          {session.cashOut > 0 && <Row label="Cash taken out" value={`−${formatGHS(session.cashOut)}`} />}
          <div className="flex justify-between border-t pt-2 mt-2 font-bold" style={{ borderColor: "var(--s-border)" }}>
            <dt>Should be in the drawer</dt>
            <dd className="money">{formatGHS(session.expectedCash)}</dd>
          </div>
          <Row
            label="Mobile Money should be"
            value={session.expectedMomo === null ? "Not recorded at opening" : formatGHS(session.expectedMomo)}
          />
        </dl>
      </section>

      <section className="rounded-3xl border p-4" style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}>
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
              const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
              return (
                <li key={movement.id} className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    style={{
                      color: incoming ? "var(--s-good)" : "var(--s-bad)",
                      background: `color-mix(in srgb, ${incoming ? "var(--s-good)" : "var(--s-bad)"} 14%, transparent)`,
                    }}
                  >
                    <Icon className="w-4 h-4" />
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
  icon: Icon,
  label,
  value,
  strong = false,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className="rounded-3xl border p-4"
      style={{
        background: strong ? "color-mix(in srgb, var(--s-brand) 10%, var(--s-panel))" : "var(--s-panel)",
        borderColor: strong ? "color-mix(in srgb, var(--s-brand) 40%, var(--s-border))" : "var(--s-border)",
      }}
    >
      <Icon className="w-4 h-4" style={{ color: "var(--s-ink-faint)" }} />
      <p className="mt-2 text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
        {label}
      </p>
      <p className="money mt-0.5 text-lg font-bold">{value}</p>
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
