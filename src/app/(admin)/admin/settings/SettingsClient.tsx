"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Panel, Field, AdminButton, inputClass, inputStyle } from "@/components/admin/ui";
import type { SettingKey } from "@/lib/settings";

export default function SettingsClient({ settings }: { settings: Record<SettingKey, string> }) {
  const router = useRouter();
  const [values, setValues] = useState(settings);
  // What the server last confirmed, so "unsaved changes" means exactly that.
  const [savedValues, setSavedValues] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: SettingKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  const changed = (Object.keys(values) as SettingKey[]).filter((key) => values[key] !== savedValues[key]);
  const dirty = changed.length > 0;

  // Leaving with unsaved settings asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Only what changed, so two people saving different sections never undo each other.
        body: JSON.stringify(Object.fromEntries(changed.map((key) => [key, values[key]]))),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save.");
        setSaving(false);
        return;
      }
      setSavedValues(values);
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
    <form onSubmit={save} className="space-y-4 max-w-2xl pb-24">
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
        <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
          Customer receipts and invoices print on 80mm till paper, the same slip the cashier hands over.
        </p>
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

      <Panel title="Bolt Food" className="p-5 space-y-3">
        <Field
          label="Bolt commission (%)"
          hint="What Bolt keeps from each order. Recorded as a cost on every Bolt sale, so profit shows what you actually receive."
        >
          <PercentInput value={values.bolt_commission_rate} onChange={(value) => set("bolt_commission_rate", value)} />
        </Field>
      </Panel>

      <Panel title="Payroll" className="p-5 space-y-4">
        <Segmented
          label="Deduct SSNIT"
          hint="Off until the business registers staff with SSNIT. Turning it on shows SSNIT on staff records and deducts 5.5% from the wages of those marked as registered."
          value={values.ssnit_enabled === "true" ? "on" : "off"}
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
          ]}
          onChange={(v) => set("ssnit_enabled", v === "on" ? "true" : "false")}
        />
      </Panel>

      <Panel title="Tax (Ghana VAT)" className="p-5 space-y-4">
        <Segmented
          label="Charge VAT & levies"
          hint="Off until your VAT status is confirmed. Turning it on adds the tax breakdown to every receipt and report."
          value={values.tax_enabled === "true" ? "on" : "off"}
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
          ]}
          onChange={(v) => set("tax_enabled", v === "on" ? "true" : "false")}
        />
        {values.tax_enabled === "true" && (
          <>
            <Segmented
              label="Menu prices"
              hint="Inclusive: the price already contains the tax (Anis default). Exclusive: tax is added on top at the till."
              value={values.tax_pricing === "exclusive" ? "exclusive" : "inclusive"}
              options={[
                { value: "inclusive", label: "Include tax" },
                { value: "exclusive", label: "Add on top" },
              ]}
              onChange={(v) => set("tax_pricing", v)}
            />
            <Field label="Tax name on receipts" hint="The word printed next to the tax line, for example VAT.">
              <input
                value={values.tax_label}
                onChange={(e) => set("tax_label", e.target.value)}
                maxLength={20}
                className={`${inputClass} max-w-48`}
                style={inputStyle}
              />
            </Field>
            <div
              className="rounded-lg border p-3 text-xs space-y-1"
              style={{ borderColor: "var(--s-border)", color: "var(--s-ink-muted)" }}
            >
              <p className="font-medium" style={{ color: "var(--s-ink)" }}>
                Applied: NHIL 2.5% · GETFund 2.5% · COVID-19 1% · VAT 15%
              </p>
              <p>VAT is charged on the value plus the three levies — the GRA standard method (effective 21.9%).</p>
              <p>Confirm your registration and rates with your accountant or the GRA before filing.</p>
            </div>
          </>
        )}
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

      <div
        className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "var(--s-panel)", boxShadow: "var(--s-shadow)" }}
      >
        <AdminButton type="submit" variant="primary" loading={saving} disabled={!dirty}>
          Save changes
        </AdminButton>
        {dirty && (
          <AdminButton type="button" variant="ghost" onClick={() => { setValues(savedValues); setError(null); }} disabled={saving}>
            Undo
          </AdminButton>
        )}
        <span className="text-sm" aria-live="polite" style={{ color: error ? "var(--s-bad)" : "var(--s-ink-muted)" }}>
          {error ??
            (dirty ? (
              `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`
            ) : saved ? (
              <span className="inline-flex items-center gap-1" style={{ color: "var(--s-good)" }}>
                <Check className="h-4 w-4" /> Saved
              </span>
            ) : (
              "Everything is saved"
            ))}
        </span>
      </div>
    </form>
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
    <Segmented
      label={label}
      hint={hint}
      value={value}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
      onChange={onChange}
    />
  );
}

function Segmented({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  options: { value: string; label: string }[];
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
        role="group"
        aria-label={label}
        className="inline-flex rounded-2xl border p-1 shrink-0"
        style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className="rounded-xl px-3 py-1.5 text-sm font-semibold whitespace-nowrap"
            style={{
              background: value === option.value ? "var(--s-brand)" : "transparent",
              color: value === option.value ? "#fff" : "var(--s-ink-muted)",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A rate stored as a fraction ("0.2"), typed as a percentage ("20"). */
function PercentInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const toPercent = (fraction: string) => {
    const number = Number(fraction);
    return Number.isFinite(number) ? String(Math.round(number * 10000) / 100) : "";
  };
  const [text, setText] = useState(() => toPercent(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (Number(text) / 100 !== Number(value)) setText(toPercent(value));
  }
  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const next = event.target.value.replace(/[^\d.]/g, "");
        setText(next);
        const percent = Number(next);
        if (next !== "" && Number.isFinite(percent) && percent < 100) onChange(String(Math.round(percent * 100) / 10000));
      }}
      className={`${inputClass} money max-w-32`}
      style={inputStyle}
      aria-label="Bolt commission percent"
    />
  );
}
