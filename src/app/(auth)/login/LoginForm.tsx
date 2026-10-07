"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Delete, Loader2 } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";

interface LoginResponse {
  redirectTo?: string;
  error?: string;
}

const STAFF_DOMAIN = "@anis.com";
const NAME_KEY = "anis_last_name";
const PIN_LENGTH = 4;

/** Staff type a name. A pasted full address is left as-is. */
function staffEmail(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!value || value.includes("@")) return value;
  return `${value}${STAFF_DOMAIN}`;
}

/**
 * First name, then a 4-digit PIN on a big keypad (or the keyboard). Signs in
 * the moment the fourth digit lands. Owners and the accountant can switch to
 * their password. The name is remembered on this device, never shown to others.
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Prefill the last name used on this device.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(NAME_KEY);
    } catch {
      /* storage blocked */
    }
    const timer = window.setTimeout(() => {
      if (saved) setName(saved);
      else nameRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function signIn(secret: string) {
    if (submitting) return;
    if (!name.trim()) {
      setError("Enter your first name first.");
      nameRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: staffEmail(name), password: secret }),
      });
      const data: LoginResponse = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not sign in. Try again.");
        setPin("");
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
        setSubmitting(false);
        return;
      }
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* storage blocked */
      }
      // Only follow a relative path. A crafted link must not bounce a cashier
      // to a lookalike site.
      const requested = searchParams.get("next");
      const safe = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : null;
      router.push(safe ?? data.redirectTo ?? "/app");
      router.refresh();
    } catch {
      setError("No connection. Check the network and try again.");
      setSubmitting(false);
    }
  }

  function press(key: string) {
    if (submitting) return;
    setError(null);
    if (key === "back") return setPin((current) => current.slice(0, -1));
    if (key === "clear") return setPin("");
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) void signIn(next);
  }

  // The keyboard works on the PIN pad too, for tills with one.
  useEffect(() => {
    if (usePassword) return;
    const onKey = (event: KeyboardEvent) => {
      if (document.activeElement === nameRef.current) return;
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") press("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const typedAddress = name.includes("@");

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
          First name
        </label>
        <div className="flex min-h-14 items-center rounded-2xl border" style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}>
          <input
            ref={nameRef}
            id="name"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. maxwell"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                (event.currentTarget as HTMLInputElement).blur();
              }
            }}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg outline-none"
          />
          {!typedAddress && name && (
            <span className="shrink-0 pr-4 text-sm" style={{ color: "var(--s-ink-faint)" }}>
              {STAFF_DOMAIN}
            </span>
          )}
        </div>
      </div>

      {usePassword ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signIn(password);
          }}
          className="space-y-4"
        >
          <PasswordInput id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
          <button
            type="submit"
            disabled={submitting || !password}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white disabled:opacity-60"
            style={{ background: "var(--s-brand)" }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <div>
          <p className="mb-2 text-sm font-semibold">PIN</p>
          <div
            className={`flex justify-center gap-4 py-2 ${shake ? "animate-[pin-shake_0.4s_ease-in-out]" : ""}`}
            aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}
            role="status"
          >
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <span
                key={index}
                className="h-4 w-4 rounded-full transition-colors"
                style={{
                  background: index < pin.length ? "var(--s-brand)" : "transparent",
                  boxShadow: `inset 0 0 0 2px ${index < pin.length ? "var(--s-brand)" : "var(--s-border-strong, #c9c3bb)"}`,
                }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                disabled={submitting}
                aria-label={key === "back" ? "Delete last digit" : key === "clear" ? "Clear PIN" : key}
                className="flex h-14 items-center justify-center rounded-2xl text-2xl font-bold transition-transform active:scale-95 disabled:opacity-50 sm:h-16"
                style={{
                  background: key === "clear" || key === "back" ? "transparent" : "var(--s-panel)",
                  boxShadow: key === "clear" || key === "back" ? undefined : "var(--s-shadow)",
                  color: "var(--s-ink)",
                }}
              >
                {key === "back" ? <Delete className="h-6 w-6" /> : key === "clear" ? <span className="text-sm font-semibold">Clear</span> : key}
              </button>
            ))}
          </div>
          {submitting && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--s-ink-muted)" }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--s-bad-soft)", color: "var(--s-bad)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setUsePassword((value) => !value);
          setError(null);
          setPin("");
        }}
        className="w-full text-center text-sm font-semibold"
        style={{ color: "var(--s-brand)" }}
      >
        {usePassword ? "Use my PIN instead" : "Use a password instead"}
      </button>
    </div>
  );
}
