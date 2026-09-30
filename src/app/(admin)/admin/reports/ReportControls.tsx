"use client";

import { useRouter } from "next/navigation";
import { inputClass, inputStyle } from "@/components/admin/ui";

const TABS: { id: string; label: string }[] = [
  { id: "pl", label: "Profit & loss" },
  { id: "sales", label: "Sales" },
  { id: "sessions", label: "Shifts" },
  { id: "vat", label: "VAT" },
];

export default function ReportControls({
  months,
  month,
  tab,
}: {
  months: string[];
  month: string;
  tab: string;
}) {
  const router = useRouter();

  function go(next: { month?: string; tab?: string }) {
    const params = new URLSearchParams({ month, tab, ...next });
    router.push(`/admin/reports?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div
        className="inline-flex rounded-2xl p-1"
        style={{ background: "var(--s-panel)", boxShadow: "var(--s-shadow)" }}
      >
        {TABS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => go({ tab: entry.id })}
            className="rounded-xl px-3 py-2 text-sm font-bold"
            style={{
              background: tab === entry.id ? "var(--s-panel)" : "transparent",
              color: tab === entry.id ? "var(--s-brand)" : "var(--s-ink-muted)",
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <select
        value={month}
        onChange={(event) => go({ month: event.target.value })}
        className={`${inputClass} max-w-xs`}
        style={inputStyle}
        aria-label="Month"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {new Date(`${m}-01T12:00:00Z`).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
              timeZone: "Africa/Accra",
            })}
          </option>
        ))}
      </select>
    </div>
  );
}
