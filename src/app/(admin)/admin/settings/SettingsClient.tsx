"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Panel, Field, inputClass, inputStyle } from "@/components/admin/ui";
import type { SettingKey } from "@/lib/settings";

export default function SettingsClient({ settings }: { settings: Record<SettingKey, string> }) {
  const router = useRouter();
  const [values, setValues] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: SettingKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save.");
        setSaving(false);
        return;
      }
      setSaved(true);
      setSaving(false);
      // The theme is applied by the layouts on the server, so a refresh repaints
      // the whole back office in the newly chosen scheme.
      router.refresh();
    } catch {
      setError("No connection. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Panel title="Business" className="p-5 space-y-3">
        <Field label="Name">
          <input value={values.business_name} onChange={(e) => set("business_name", e.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Address">
          <input value={values.business_address} onChange={(e) => set("business_address", e.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input value={values.business_phone} onChange={(e) => set("business_phone", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="WhatsApp">
            <input value={values.business_whatsapp} onChange={(e) => set("business_whatsapp", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
        </div>
      </Panel>

      <Panel title="Receipt" className="p-5 space-y-3">
        <Field label="Header">
          <input value={values.receipt_header} onChange={(e) => set("receipt_header", e.target.value)} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Footer" hint="The thank-you line at the bottom of every receipt.">
          <input value={values.receipt_footer} onChange={(e) => set("receipt_footer", e.target.value)} className={inputClass} style={inputStyle} />
        </Field>
      </Panel>

      <Panel title="Till" className="p-5 space-y-3">
        <Field label="Default opening float" hint="Pre-filled when a cashier opens a shift.">
          <input
            inputMode="decimal"
            value={values.default_opening_float}
            onChange={(e) => set("default_opening_float", e.target.value.replace(/[^\d.]/g, ""))}
            className={`${inputClass} money`}
            style={inputStyle}
          />
        </Field>
      </Panel>

      <Panel title="Appearance" className="p-5 space-y-4">
        <ThemeToggle
          label="Till"
          hint="Dark is easier on the eyes across a long shift."
          value={values.pos_theme}
          onChange={(value) => set("pos_theme", value)}
        />
        <ThemeToggle
          label="Back office"
          hint="Light is calmer for reading reports."
          value={values.admin_theme}
          onChange={(value) => set("admin_theme", value)}
        />
      </Panel>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-white min-h-11 disabled:opacity-50"
          style={{ background: "var(--s-brand)" }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </button>
        {error && (
          <span className="text-sm" style={{ color: "var(--s-bad)" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

function ThemeToggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
          {hint}
        </p>
      </div>
      <div
        className="inline-flex rounded-lg border p-0.5 shrink-0"
        style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
      >
        {["light", "dark"].map((theme) => (
          <button
            key={theme}
            onClick={() => onChange(theme)}
            className="rounded-md px-3 py-1.5 text-sm font-semibold capitalize"
            style={{
              background: value === theme ? "var(--s-brand)" : "transparent",
              color: value === theme ? "#fff" : "var(--s-ink-muted)",
            }}
          >
            {theme}
          </button>
        ))}
      </div>
    </div>
  );
}
