import { businessDay } from "@/lib/session-utils";

/**
 * Reporting periods.
 *
 * Every money screen in the back office takes the same `?from=&to=` (inclusive
 * business days, YYYY-MM-DD) or a `?period=` preset, so a link copied from one
 * screen means the same thing on another. Works on server and client.
 */

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "week"
  | "last-week"
  | "month"
  | "last-month"
  | "custom";

export interface Period {
  from: string;
  to: string;
  preset: PeriodPreset;
  label: string;
}

export const PRESET_LABELS: Record<Exclude<PeriodPreset, "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  "last-week": "Last week",
  month: "This month",
  "last-month": "Last month",
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function toUtc(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Inclusive count of days between two YYYY-MM-DD dates. */
export function dayCount(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000) + 1;
}

export function daysIn(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

function monthBounds(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

function presetRange(preset: Exclude<PeriodPreset, "custom">, today: string) {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case "week":
    case "last-week": {
      // Weeks start on Monday — the quiet day most kitchens plan around.
      const weekday = (toUtc(today).getUTCDay() + 6) % 7;
      const monday = addDays(today, -weekday - (preset === "last-week" ? 7 : 0));
      return { from: monday, to: preset === "week" ? today : addDays(monday, 6) };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "last-month": {
      const firstOfThis = toUtc(`${today.slice(0, 7)}-01`);
      firstOfThis.setUTCDate(0);
      return monthBounds(fromUtc(firstOfThis).slice(0, 7));
    }
  }
}

export function formatDay(day: string, withYear = false): string {
  return toUtc(day).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatRange(from: string, to: string): string {
  if (from === to) {
    return toUtc(from).toLocaleDateString("en-GB", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${formatDay(from, !sameYear)} – ${formatDay(to, true)}`;
}

/**
 * Reads a period from search params. Accepts `period`, `from`/`to`, and the
 * older `month=YYYY-MM` / `day=YYYY-MM-DD` links so bookmarks keep working.
 */
export function resolvePeriod(
  params: Record<string, string | string[] | undefined>,
  fallback: Exclude<PeriodPreset, "custom"> = "month",
  today: string = businessDay(),
): Period {
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const preset = get("period");
  if (preset && preset in PRESET_LABELS) {
    const key = preset as Exclude<PeriodPreset, "custom">;
    return { ...presetRange(key, today), preset: key, label: PRESET_LABELS[key] };
  }

  let from = get("from");
  let to = get("to");
  const month = get("month");
  const day = get("day");
  if (!from && month && MONTH_RE.test(month)) ({ from, to } = monthBounds(month));
  if (!from && day && DAY_RE.test(day)) from = to = day;

  if (from && DAY_RE.test(from)) {
    if (!to || !DAY_RE.test(to)) to = from;
    if (to < from) [from, to] = [to, from];
    // A year is plenty for one screen and keeps the queries bounded.
    if (dayCount(from, to) > 366) to = addDays(from, 365);
    return { from, to, preset: "custom", label: formatRange(from, to) };
  }

  return { ...presetRange(fallback, today), preset: fallback, label: PRESET_LABELS[fallback] };
}

/** The period of the same length immediately before. */
export function previousPeriod(period: { from: string; to: string }): { from: string; to: string } {
  const length = dayCount(period.from, period.to);
  const to = addDays(period.from, -1);
  return { from: addDays(to, -(length - 1)), to };
}

/** Query string for a period, for links and exports. */
export function periodQuery(period: Period): string {
  return period.preset === "custom"
    ? `from=${period.from}&to=${period.to}`
    : `period=${period.preset}`;
}
