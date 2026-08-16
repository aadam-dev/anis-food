"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 10;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mismatch || tooShort) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not change your password.");
        setSubmitting(false);
        return;
      }

      router.push(data.redirectTo ?? "/app");
      router.refresh();
    } catch {
      setError("No connection. Check the network and try again.");
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
          Current password
        </label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2"
          style={fieldStyle}
        />
      </div>

      <div>
        <label htmlFor="next" className="block text-sm font-medium mb-1.5">
          New password
        </label>
        <input
          id="next"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2"
          style={fieldStyle}
          aria-describedby="password-hint"
        />
        <p
          id="password-hint"
          className="mt-1.5 text-xs"
          style={{ color: tooShort ? "var(--s-bad)" : "var(--s-ink-faint)" }}
        >
          At least 10 characters. A short phrase you will remember beats a short
          scramble you will write down.
        </p>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2"
          style={fieldStyle}
        />
        {mismatch && (
          <p className="mt-1.5 text-xs" style={{ color: "var(--s-bad)" }}>
            These two do not match.
          </p>
        )}
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
        disabled={submitting || mismatch || tooShort}
        className="w-full rounded-lg px-4 py-3 font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "var(--s-brand)" }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
