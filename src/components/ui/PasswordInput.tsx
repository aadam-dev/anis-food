"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password field with a show/hide toggle.
 *
 * Shared by sign-in and the password change screen so the behaviour is
 * identical in both. Each field toggles on its own: revealing one is a
 * deliberate act, and revealing all three at once on the change screen would put
 * a staff member's new password on display to anyone near the counter.
 */
export default function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  hint,
  hintTone = "muted",
  required = true,
  id: providedId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  hintTone?: "muted" | "bad";
  required?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hint ? hintId : undefined}
          className="w-full rounded-lg border px-3 py-2.5 pr-12 outline-none focus:ring-2"
          style={{
            background: "var(--s-panel-alt)",
            borderColor: "var(--s-border)",
            color: "var(--s-ink)",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          // Full-height so it is comfortably tappable on a phone without
          // widening the field's visual padding.
          className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-md"
          style={{ color: "var(--s-ink-muted)" }}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          // Keeps the field focused, so toggling mid-typing does not lose the caret.
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && (
        <p
          id={hintId}
          className="mt-1.5 text-xs"
          style={{ color: hintTone === "bad" ? "var(--s-bad)" : "var(--s-ink-faint)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
