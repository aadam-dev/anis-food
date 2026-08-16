"use client";

import { useState } from "react";
import { Loader2, LogOut, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { countedTotal, drawerDifference, differenceLabel, type DenominationCount } from "@/lib/cash";
import DenominationCounter from "./DenominationCounter";
import type { SessionView } from "./types";

/**
 * Opening, running and closing the drawer.
 *
 * Doubles as the gate: when no shift is open (or one was left open from a
 * previous day) this is the only screen the till will show, because taking money
 * into a drawer nobody has counted is how a day ends unreconcilable.
 */
export default function ShiftPanel({
  session,
  gate,
  defaultOpeningFloat,
  onChanged,
  onSignOut,
}: {
  session: SessionView | null;
  gate: "none" | "stale" | "active" | "error";
  defaultOpeningFloat: number;
  onChanged: () => void;
  onSignOut: () => void;
}) {
  const [float, setFloat] = useState(String(defaultOpeningFloat));
  const [openingMomo, setOpeningMomo] = useState("");
  const [counts, setCounts] = useState<DenominationCount>({});
  const [closingMomo, setClosingMomo] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementDirection, setMovementDirection] = useState<"IN" | "OUT">("OUT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, method: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "That did not work.");
        return false;
      }
      onChanged();
      return true;
    } catch {
      setError("No connection. The shift can only be changed online.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const panelStyle = { background: "var(--s-panel)", borderColor: "var(--s-border)" };
  const fieldStyle = {
    background: "var(--s-panel-alt)",
    borderColor: "var(--s-border)",
    color: "var(--s-ink)",
  };

  // ---- No shift open -------------------------------------------------------
  if (gate === "none" || gate === "error") {
    return (
      <Centered>
        <div className="rounded-2xl border p-5" style={panelStyle}>
          <h1 className="text-xl font-bold">Open the till</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Count what is in the drawer before the first sale. Everything today is
            measured against this number.
          </p>

          <label className="mt-5 block text-sm font-medium mb-1.5">Cash in the drawer</label>
          <input
            type="text"
            inputMode="decimal"
            value={float}
            onChange={(event) => setFloat(event.target.value.replace(/[^\d.]/g, ""))}
            className="money w-full rounded-xl border px-3 py-3 text-right text-xl outline-none focus:ring-2"
            style={fieldStyle}
          />

          <label className="mt-4 block text-sm font-medium mb-1.5">
            Mobile Money balance{" "}
            <span style={{ color: "var(--s-ink-faint)" }}>(optional)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={openingMomo}
            onChange={(event) => setOpeningMomo(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Leave blank if you are not checking it"
            className="money w-full rounded-xl border px-3 py-3 text-right outline-none focus:ring-2"
            style={fieldStyle}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--s-ink-faint)" }}>
            Left blank means &quot;not recorded&quot; — which the reports will say plainly,
            rather than pretending it was zero.
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm" style={{ color: "var(--s-bad)" }}>
              {error}
            </p>
          )}

          <button
            disabled={busy}
            onClick={() =>
              post("/api/pos/sessions", "POST", {
                openingFloat: Number(float) || 0,
                openingMomo: openingMomo.trim() === "" ? null : Number(openingMomo) || 0,
              })
            }
            className="mt-5 w-full rounded-xl px-4 py-4 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--s-brand)" }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Start the shift
          </button>

          <button
            onClick={onSignOut}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2"
            style={{ color: "var(--s-ink-muted)" }}
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </Centered>
    );
  }

  if (!session) return null;

  const counted = Object.keys(counts).length > 0 ? countedTotal(counts) : null;
  const projected = drawerDifference(session.expectedCash, counted);

  // ---- A shift left open from a previous day -------------------------------
  if (gate === "stale") {
    return (
      <Centered>
        <div className="rounded-2xl border p-5" style={panelStyle}>
          <h1 className="text-xl font-bold" style={{ color: "var(--s-warn)" }}>
            Yesterday&apos;s till is still open
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            {session.openedBy.name} opened this on {session.businessDay} and it was never
            closed. Close it now so that day&apos;s takings stay on that day — today&apos;s
            sales cannot start until it is done.
          </p>
          <CloseForm />
        </div>
      </Centered>
    );
  }

  // ---- Running shift -------------------------------------------------------
  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 pb-24 max-w-lg mx-auto w-full space-y-4">
      <section className="rounded-2xl border p-4" style={panelStyle}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold">This shift</h1>
            <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
              Opened by {session.openedBy.name} ·{" "}
              {new Date(session.openedAt).toLocaleTimeString("en-GB", {
                timeZone: "Africa/Accra",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span className="money text-sm" style={{ color: "var(--s-ink-faint)" }}>
            {session.takings.orderCount} order{session.takings.orderCount === 1 ? "" : "s"}
          </span>
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Opening float" value={formatGHS(session.openingFloat)} />
          <Row label="Cash taken" value={formatGHS(session.takings.cash)} />
          {session.cashIn > 0 && <Row label="Cash in" value={`+${formatGHS(session.cashIn)}`} />}
          {session.cashOut > 0 && (
            <Row label="Cash out" value={`−${formatGHS(session.cashOut)}`} />
          )}
          <div
            className="flex justify-between pt-2 mt-2 border-t font-bold"
            style={{ borderColor: "var(--s-border)" }}
          >
            <dt>Should be in the drawer</dt>
            <dd className="money">{formatGHS(session.expectedCash)}</dd>
          </div>
        </dl>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Mobile Money taken" value={formatGHS(session.takings.momo)} />
          <Row
            label="Mobile Money should be"
            value={
              session.expectedMomo === null
                ? "Not recorded at opening"
                : formatGHS(session.expectedMomo)
            }
          />
          <Row label="Everything taken" value={formatGHS(session.takings.gross)} />
        </dl>
      </section>

      <section className="rounded-2xl border p-4" style={panelStyle}>
        <h2 className="font-semibold">Money in or out</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          Anything that is not a sale — buying gas, fetching change, paying a supplier
          from the till.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMovementDirection("OUT")}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold"
            style={{
              background: movementDirection === "OUT" ? "var(--s-brand)" : "var(--s-panel-alt)",
              color: movementDirection === "OUT" ? "#fff" : "var(--s-ink-muted)",
            }}
          >
            <ArrowUpRight className="w-4 h-4" /> Took out
          </button>
          <button
            onClick={() => setMovementDirection("IN")}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold"
            style={{
              background: movementDirection === "IN" ? "var(--s-brand)" : "var(--s-panel-alt)",
              color: movementDirection === "IN" ? "#fff" : "var(--s-ink-muted)",
            }}
          >
            <ArrowDownLeft className="w-4 h-4" /> Put in
          </button>
        </div>

        <input
          type="text"
          inputMode="decimal"
          value={movementAmount}
          onChange={(event) => setMovementAmount(event.target.value.replace(/[^\d.]/g, ""))}
          placeholder="Amount"
          className="money mt-2 w-full rounded-xl border px-3 py-3 text-right outline-none focus:ring-2"
          style={fieldStyle}
        />
        <input
          type="text"
          value={movementReason}
          onChange={(event) => setMovementReason(event.target.value)}
          placeholder="What was it for?"
          className="mt-2 w-full rounded-xl border px-3 py-3 outline-none focus:ring-2"
          style={fieldStyle}
        />
        <button
          disabled={busy || !movementAmount || movementReason.trim().length < 3}
          onClick={async () => {
            const done = await post("/api/pos/cash-movements", "POST", {
              direction: movementDirection,
              amount: Number(movementAmount) || 0,
              reason: movementReason.trim(),
            });
            if (done) {
              setMovementAmount("");
              setMovementReason("");
            }
          }}
          className="mt-2 w-full rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
          style={{ background: "var(--s-panel-alt)", color: "var(--s-ink)" }}
        >
          Record it
        </button>

        {session.movements.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {session.movements.map((movement) => (
              <li key={movement.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate" style={{ color: "var(--s-ink-muted)" }}>
                  {movement.reason}
                </span>
                <span
                  className="money whitespace-nowrap"
                  style={{
                    color: movement.direction === "IN" ? "var(--s-good)" : "var(--s-bad)",
                  }}
                >
                  {movement.direction === "IN" ? "+" : "−"}
                  {formatGHS(movement.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border p-4" style={panelStyle}>
        <h2 className="font-semibold">Close the shift</h2>
        <CloseForm />
      </section>
    </div>
  );

  function CloseForm() {
    return (
      <>
        <p className="mt-1 mb-3 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          Count what is actually in the drawer.
        </p>

        <DenominationCounter counts={counts} onChange={setCounts} />

        <label className="mt-4 block text-sm font-medium mb-1.5">
          Mobile Money balance now{" "}
          <span style={{ color: "var(--s-ink-faint)" }}>(optional)</span>
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={closingMomo}
          onChange={(event) => setClosingMomo(event.target.value.replace(/[^\d.]/g, ""))}
          className="money w-full rounded-xl border px-3 py-3 text-right outline-none focus:ring-2"
          style={fieldStyle}
        />

        {counted !== null && (
          <div
            className="mt-4 rounded-xl px-3 py-3"
            style={{ background: "var(--s-hover)" }}
          >
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--s-ink-muted)" }}>Should be</span>
              <span className="money">{formatGHS(session!.expectedCash)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span style={{ color: "var(--s-ink-muted)" }}>Counted</span>
              <span className="money">{formatGHS(counted)}</span>
            </div>
            <div className="flex justify-between font-bold mt-2 pt-2 border-t" style={{ borderColor: "var(--s-border)" }}>
              <span>Difference</span>
              <span
                className="money"
                style={{
                  color:
                    projected === 0
                      ? "var(--s-good)"
                      : projected === null
                        ? "var(--s-ink-muted)"
                        : "var(--s-warn)",
                }}
              >
                {differenceLabel(projected)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm" style={{ color: "var(--s-bad)" }}>
            {error}
          </p>
        )}

        <button
          disabled={busy || counted === null}
          onClick={() =>
            post("/api/pos/sessions", "PATCH", {
              sessionId: session!.id,
              cashCount: counts,
              closingMomo: closingMomo.trim() === "" ? null : Number(closingMomo) || 0,
            })
          }
          className="mt-4 w-full rounded-xl px-4 py-4 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "var(--s-brand)" }}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {counted === null ? "Count the drawer first" : "Close the shift"}
        </button>
      </>
    );
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
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
