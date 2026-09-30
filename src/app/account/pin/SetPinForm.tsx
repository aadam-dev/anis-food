"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SetPinForm() {
  const router = useRouter();
  const [currentSecret, setCurrentSecret] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (pin !== confirm) {
      setError("The two PINs do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentSecret, pin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save that PIN.");
        setSubmitting(false);
        return;
      }
      router.push(data.redirectTo ?? "/pos");
      router.refresh();
    } catch {
      setError("No connection. Try again.");
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    background: "var(--s-panel-alt)",
    borderColor: "var(--s-border)",
    color: "var(--s-ink)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="current" className="block text-sm font-medium mb-1.5">
          Password or current PIN
        </label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          required
          value={currentSecret}
          onChange={(event) => setCurrentSecret(event.target.value)}
          className="w-full min-h-12 rounded-2xl border px-3.5 outline-none"
          style={fieldStyle}
        />
      </div>
      <div>
        <label htmlFor="pin" className="block text-sm font-medium mb-1.5">
          New 4-digit PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          required
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          className="w-full min-h-12 rounded-2xl border px-3.5 outline-none tracking-[0.4em] text-center text-lg"
          style={fieldStyle}
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">
          Confirm PIN
        </label>
        <input
          id="confirm"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))}
          className="w-full min-h-12 rounded-2xl border px-3.5 outline-none tracking-[0.4em] text-center text-lg"
          style={fieldStyle}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm rounded-lg px-3 py-2"
          style={{ background: "rgba(248,113,113,0.12)", color: "var(--s-bad)" }}
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || pin.length !== 4 || confirm.length !== 4}
        className="w-full rounded-2xl px-4 py-3.5 min-h-14 font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "var(--s-brand)" }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? "Saving…" : "Save PIN"}
      </button>
    </form>
  );
}
