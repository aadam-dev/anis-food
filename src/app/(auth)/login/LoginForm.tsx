"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";

interface LoginResponse {
  redirectTo?: string;
  error?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not sign in. Try again.");
        setSubmitting(false);
        return;
      }

      // Only follow a relative path. An attacker who can craft the link a
      // cashier taps must not be able to bounce them to a lookalike site.
      const requested = searchParams.get("next");
      const safeRequested =
        requested && requested.startsWith("/") && !requested.startsWith("//")
          ? requested
          : null;

      router.push(safeRequested ?? data.redirectTo ?? "/app");
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
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2"
          style={fieldStyle}
        />
      </div>

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
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
        disabled={submitting}
        className="w-full rounded-lg px-4 py-3 font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "var(--s-brand)" }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
