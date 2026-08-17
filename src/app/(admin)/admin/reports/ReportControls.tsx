"use client";

import { useRouter } from "next/navigation";

const TABS: { id: string; label: string }[] = [
  { id: "pl", label: "Profit & loss" },
  { id: "sales", label: "Sales" },
  { id: "sessions", label: "Shifts" },
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
        className="inline-flex rounded-lg border p-0.5"
        style={{ borderColor: "var(--s-border)", background: "var(--s-panel-alt)" }}
      >
        {TABS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => go({ tab: entry.id })}
            className="rounded-md px-3 py-1.5 text-sm font-semibold"
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
        className="rounded-lg border px-3 py-2 text-sm min-h-11"
        style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
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
