import { formatGHS } from "@/lib/money";

/**
 * Small, dependency-free visuals for the dashboard. Plain SVG and CSS so they
 * render on the server, cost nothing to load and follow the theme tokens.
 */

/** A tiny trend line. Last point is marked so "where are we now" is obvious. */
export function Sparkline({
  values,
  color = "var(--s-brand)",
  height = 36,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const width = 120;
  if (values.length < 2) return <div style={{ height }} />;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const y = (value: number) => height - 3 - (value / max) * (height - 6);
  const points = values.map((value, index) => `${(index * step).toFixed(1)},${y(value).toFixed(1)}`);
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
      <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill={color} opacity={0.12} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={width} cy={y(last)} r={3} fill={color} />
    </svg>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/**
 * When the money comes in: weekday × hour over the last four weeks. Darker is
 * busier. Answers "when do we need more hands and more prep" at a glance.
 */
export function BusyHeatmap({
  cells,
  fromHour = 7,
  toHour = 23,
}: {
  cells: { weekday: number; hour: number; revenue: number; orders: number }[];
  fromHour?: number;
  toHour?: number;
}) {
  const busy = cells.filter((cell) => cell.orders > 0).map((cell) => cell.hour);
  const first = Math.min(fromHour, ...busy);
  const last = Math.max(toHour, ...busy);
  const hours = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const lookup = new Map(cells.map((cell) => [`${cell.weekday}:${cell.hour}`, cell]));
  const max = Math.max(...cells.map((cell) => cell.revenue), 1);
  const peak = cells.reduce<(typeof cells)[number] | null>((top, cell) => (cell.revenue > (top?.revenue ?? 0) ? cell : top), null);

  return (
    <div>
      <div className="overflow-x-auto no-scrollbar">
        <div
          className="grid min-w-[30rem] gap-[3px]"
          style={{ gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(0, 1fr))` }}
        >
          <span />
          {hours.map((hour) => (
            <span key={hour} className="text-center text-[10px]" style={{ color: "var(--s-ink-faint)" }}>
              {hour % 3 === 0 ? hour : ""}
            </span>
          ))}
          {DAYS.map((day, weekday) => (
            <div key={day} className="contents">
              <span className="pr-1 text-[11px] font-semibold leading-6" style={{ color: "var(--s-ink-muted)" }}>
                {day}
              </span>
              {hours.map((hour) => {
                const cell = lookup.get(`${weekday}:${hour}`);
                const strength = cell ? cell.revenue / max : 0;
                return (
                  <span
                    key={hour}
                    className="h-6 rounded-[5px]"
                    title={`${day} ${String(hour).padStart(2, "0")}:00 · ${cell ? `${formatGHS(cell.revenue)}, ${cell.orders} orders` : "no sales"}`}
                    style={{
                      background:
                        strength > 0
                          ? `color-mix(in srgb, var(--s-brand) ${Math.round(12 + strength * 88)}%, var(--s-panel))`
                          : "var(--s-sunk)",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "var(--s-ink-faint)" }}>
        <span>
          {peak
            ? `Busiest: ${FULL_DAYS[peak.weekday]} around ${String(peak.hour).padStart(2, "0")}:00`
            : "Fills in as sales come in"}
        </span>
        <span className="flex items-center gap-1.5">
          Quiet
          {[0.15, 0.4, 0.7, 1].map((level) => (
            <span
              key={level}
              className="h-2.5 w-4 rounded-sm"
              style={{ background: `color-mix(in srgb, var(--s-brand) ${Math.round(level * 100)}%, var(--s-panel))` }}
            />
          ))}
          Busy
        </span>
      </div>
    </div>
  );
}

/**
 * Where each cedi of sales went: one bar, split into food cost, staff,
 * expenses and what is left. Readable by anyone, no accounting words needed.
 */
export function MoneyFlow({
  sales,
  food,
  foodKnown,
  staff,
  expenses,
}: {
  sales: number;
  food: number;
  foodKnown: boolean;
  staff: number;
  expenses: number;
}) {
  const kept = sales - (foodKnown ? food : 0) - staff - expenses;
  const parts = [
    { key: "food", label: "Food cost", value: foodKnown ? food : 0, color: "var(--s-accent)" },
    { key: "staff", label: "Staff", value: staff, color: "#7C3AED" },
    { key: "expenses", label: "Running costs", value: expenses, color: "#0F766E" },
    { key: "kept", label: foodKnown ? "Kept" : "Left before food cost", value: Math.max(0, kept), color: "var(--s-good)" },
  ];
  const base = Math.max(sales, parts.reduce((sum, part) => sum + part.value, 0), 1);

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full" style={{ background: "var(--s-sunk)" }}>
        {parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <span
              key={part.key}
              title={`${part.label}: ${formatGHS(part.value)}`}
              style={{ width: `${(part.value / base) * 100}%`, background: part.color }}
            />
          ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {parts.map((part) => (
          <div key={part.key}>
            <dt className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: part.color }} />
              {part.label}
            </dt>
            <dd className="money mt-0.5 font-bold">
              {part.key === "food" && !foodKnown ? "Not costed" : formatGHS(part.key === "kept" ? kept : part.value)}
            </dd>
            {sales > 0 && (part.key !== "food" || foodKnown) && (
              <dd className="text-[11px]" style={{ color: "var(--s-ink-faint)" }}>
                {Math.round(((part.key === "kept" ? kept : part.value) / sales) * 100)}c of every GH₵1
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
