"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />

      <PasswordInput
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        hint={
          tooShort
            ? "At least 10 characters."
            : "At least 10 characters. A short phrase you will remember beats a short scramble you will write down."
        }
        hintTone={tooShort ? "bad" : "muted"}
      />

      <PasswordInput
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        hint={mismatch ? "These two do not match." : undefined}
        hintTone="bad"
      />

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
