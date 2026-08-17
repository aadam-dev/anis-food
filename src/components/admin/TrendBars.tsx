"use client";

import { formatGHS } from "@/lib/money";

/**
 * A 14-day revenue trend as bars.
 *
 * Deliberately not a charting library: it is fourteen values, and a dependency
 * that ships a canvas renderer to draw fourteen rectangles is weight the till
 * does not need. Pure CSS heights, and a title attribute so the exact figure is
 * one hover away.
 */
export default function TrendBars({ data }: { data: { day: string; revenue: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const hasSales = data.some((d) => d.revenue > 0);

  if (!hasSales) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--s-ink-muted)" }}>
        No sales in the last two weeks yet.
      </p>
    );
  }

  return (
    <div className="flex items-end gap-1.5 h-40 pt-2">
      {data.map((entry) => {
        const heightPct = entry.revenue > 0 ? Math.max(4, (entry.revenue / max) * 100) : 2;
        const weekday = new Date(`${entry.day}T12:00:00Z`).toLocaleDateString("en-GB", {
          weekday: "short",
          timeZone: "Africa/Accra",
        });
        const dayNum = entry.day.slice(-2);
        return (
          <div key={entry.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${heightPct}%`,
                  background: entry.revenue > 0 ? "var(--s-brand)" : "var(--s-border)",
                }}
                title={`${weekday} ${dayNum} — ${formatGHS(entry.revenue)}`}
              />
            </div>
            <span className="text-[0.6rem] tabular-nums" style={{ color: "var(--s-ink-faint)" }}>
              {dayNum}
            </span>
          </div>
        );
      })}
    </div>
  );
}
