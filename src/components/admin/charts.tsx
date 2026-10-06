"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatGHS } from "@/lib/money";
import { formatDay } from "@/lib/period";

/**
 * Back-office charts. Colours are the surface tokens, so they follow the
 * light/dark theme with no extra wiring. Money axes are abbreviated (1.2k);
 * the tooltip always shows the exact figure.
 */

const BRAND = "var(--s-brand)";
const ACCENT = "var(--s-accent)";
const GRID = "var(--s-border)";
const AXIS = "var(--s-ink-faint)";

/** Categorical colours for the payment donut, in a fixed order. */
export const SERIES = [
  "var(--s-brand)",
  "var(--s-accent)",
  "#0F766E",
  "#7C3AED",
  "#2563EB",
  "var(--s-ink-faint)",
];

function compact(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

function TooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs"
      style={{
        background: "var(--s-panel)",
        borderColor: "var(--s-border)",
        color: "var(--s-ink)",
        boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.25)",
      }}
    >
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: "var(--s-ink-muted)" }}>
            {row.color && (
              <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
            )}
            {row.label}
          </span>
          <span className="money">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

export interface TrendPoint {
  day: string;
  revenue: number;
  /** Same position in the previous period, for the ghost line. */
  previous?: number;
  orders?: number;
}

/** Daily sales as an area, with the previous period as a dashed ghost line. */
export function TrendChart({
  data,
  height = 220,
  currentLabel = "This period",
  previousLabel = "Previous period",
}: {
  data: TrendPoint[];
  height?: number;
  currentLabel?: string;
  previousLabel?: string;
}) {
  const hasPrevious = data.some((point) => point.previous !== undefined);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickFormatter={(day: string) => formatDay(day)}
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: GRID }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as TrendPoint;
              return (
                <TooltipCard
                  title={formatDay(point.day, true)}
                  rows={[
                    { label: currentLabel, value: formatGHS(point.revenue), color: BRAND },
                    ...(point.previous !== undefined
                      ? [{ label: previousLabel, value: formatGHS(point.previous), color: AXIS }]
                      : []),
                    ...(point.orders !== undefined
                      ? [{ label: "Orders", value: String(point.orders) }]
                      : []),
                  ]}
                />
              );
            }}
          />
          {hasPrevious && (
            <Area
              type="monotone"
              dataKey="previous"
              stroke={AXIS}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={BRAND}
            strokeWidth={2.25}
            fill="url(#trendFill)"
            dot={false}
            activeDot={{ r: 4, fill: BRAND, stroke: "var(--s-panel)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Payment mix as a donut, with the total in the hole. */
export function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 168,
}: {
  data: { label: string; value: number }[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={total > 0 ? data : [{ label: "None", value: 1 }]}
            dataKey="value"
            nameKey="label"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={total > 0 && data.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {(total > 0 ? data : [{ label: "None", value: 1 }]).map((row, index) => (
              <Cell key={row.label} fill={total > 0 ? SERIES[index % SERIES.length] : GRID} />
            ))}
          </Pie>
          {total > 0 && (
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as { label: string; value: number };
                return (
                  <TooltipCard
                    title={row.label}
                    rows={[
                      { label: "Amount", value: formatGHS(row.value) },
                      { label: "Share", value: `${Math.round((row.value / total) * 100)}%` },
                    ]}
                  />
                );
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[0.7rem]" style={{ color: "var(--s-ink-faint)" }}>
          {centerLabel}
        </span>
        <span className="money text-base font-bold">{centerValue}</span>
      </div>
    </div>
  );
}

/** Simple vertical bars, e.g. sales by hour of day. */
export function ColumnChart({
  data,
  height = 180,
  valueLabel = "Sales",
}: {
  data: { label: string; value: number }[];
  height?: number;
  valueLabel?: string;
}) {
  const max = Math.max(...data.map((row) => row.value), 0);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tickFormatter={compact} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "var(--s-hover)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { label: string; value: number };
              return <TooltipCard title={row.label} rows={[{ label: valueLabel, value: formatGHS(row.value) }]} />;
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.map((row) => (
              <Cell key={row.label} fill={row.value === max && max > 0 ? BRAND : ACCENT} fillOpacity={row.value === max ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
