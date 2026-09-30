"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import Numpad, { applyNumpadKey } from "@/components/pos/Numpad";
import Button from "@/components/pos/ui/Button";

export interface TillCashier {
  id: string;
  name: string;
  initials: string;
  tint: string;
}

/**
 * Hand the till to another cashier: pick their avatar, punch their 4-digit PIN.
 * The open shift stays; only who punches the next sale changes.
 */
export default function CashierSwitchSheet({
  currentUserId,
  onClose,
  onSwitched,
}: {
  currentUserId: string;
  onClose: () => void;
  onSwitched: (user: { id: string; name: string; role: string }) => void;
}) {
  const [cashiers, setCashiers] = useState<TillCashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TillCashier | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pos/cashiers")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Could not load cashiers.");
        if (!cancelled) setCashiers(data.cashiers ?? []);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : "Could not load cashiers.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pin.length !== 4 || !selected || busy) return;
    void submitPin(selected, pin);
    // Auto-submit once four digits are in — same as a hardware PIN pad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submitPin(cashier: TillCashier, value: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/pos/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: cashier.id, pin: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not switch.");
        setPin("");
        setBusy(false);
        return;
      }
      onSwitched(data.user);
    } catch {
      setError("No connection. Try again.");
      setPin("");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Switch cashier"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border sm:rounded-3xl"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--s-border)" }}>
          <div>
            <p className="font-bold">{selected ? selected.name : "Who is on the till?"}</p>
            <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
              {selected ? "Enter their 4-digit PIN" : "Tap a profile, then punch the PIN"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl"
            aria-label="Close switcher"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--s-ink-faint)" }} />
            </div>
          )}
          {loadError && (
            <p className="text-sm" style={{ color: "var(--s-bad)" }}>
              {loadError}
            </p>
          )}
          {!loading && !loadError && !selected && (
            <ul className="grid grid-cols-2 gap-3">
              {cashiers.map((cashier) => {
                const current = cashier.id === currentUserId;
                return (
                  <li key={cashier.id}>
                    <button
                      type="button"
                      disabled={current}
                      onClick={() => {
                        setSelected(cashier);
                        setPin("");
                        setError(null);
                      }}
                      className="flex w-full flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center disabled:opacity-50"
                      style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
                    >
                      <span
                        className="grid h-14 w-14 place-items-center rounded-full text-base font-bold text-white"
                        style={{ background: cashier.tint }}
                      >
                        {cashier.initials}
                      </span>
                      <span className="text-sm font-semibold leading-tight">{cashier.name}</span>
                      {current && (
                        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--s-good)" }}>
                          On till
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {cashiers.length === 0 && (
                <li className="col-span-2 py-8 text-center text-sm" style={{ color: "var(--s-ink-faint)" }}>
                  No cashiers with a PIN are set up yet.
                </li>
              )}
            </ul>
          )}

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <span
                  className="grid h-16 w-16 place-items-center rounded-full text-lg font-bold text-white"
                  style={{ background: selected.tint }}
                >
                  {selected.initials}
                </span>
                <div
                  className="flex gap-2"
                  aria-label="PIN digits entered"
                >
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className="h-3 w-3 rounded-full border"
                      style={{
                        borderColor: "var(--s-border)",
                        background: pin.length > index ? "var(--s-ink)" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && (
                <p className="text-center text-sm" style={{ color: "var(--s-bad)" }}>
                  {error}
                </p>
              )}
              <Numpad
                value={pin}
                onChange={(next) => setPin(next.replace(/\D/g, "").slice(0, 4))}
                maxDigits={4}
                allowDecimal={false}
                shortcuts={[]}
              />
              <div className="flex gap-2">
                  <Button
                  tone="ghost"
                  className="flex-1"
                  onClick={() => {
                    setSelected(null);
                    setPin("");
                    setError(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={busy || pin.length !== 4}
                  onClick={() => void submitPin(selected, pin)}
                >
                  {busy ? "Switching…" : "Unlock"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Exported for tests that want to punch a PIN without the sheet. */
export { applyNumpadKey };
