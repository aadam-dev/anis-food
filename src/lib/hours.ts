/**
 * Live Open/Closed status based on business hours and timezone.
 */

export type HoursStructured = {
  weekdays: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
};

export type HoursDisplay = {
  weekdays: string;
  saturday: string;
  sunday: string;
};

function getHoursForDay(
  dayOfWeek: number,
  hoursStructured: HoursStructured
): { open: string; close: string } {
  if (dayOfWeek === 0) return hoursStructured.sunday;
  if (dayOfWeek === 6) return hoursStructured.saturday;
  return hoursStructured.weekdays;
}

export interface OpenStatus {
  isOpen: boolean;
  nextOpen?: string; // e.g. "9:00 AM"
  nextClose?: string; // e.g. "10:00 PM"
  todayLabel?: string; // e.g. "8:00 AM - 10:00 PM"
}

/**
 * Get current date/time in a given IANA timezone (hour, minute, day of week).
 */
function getLocalTimeInZone(timezone: string): {
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const dayStr = dayFormatter.format(new Date());
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[dayStr] ?? 0;

  return { hour, minute, dayOfWeek };
}

function parseTimeHHmm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  const hours = h ?? 0;
  const mins = m ?? 0;
  return (hours === 24 ? 24 * 60 : hours * 60) + mins;
}

function formatMinutesToDisplay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24; // 24:00 → 0 for display
  const m = totalMinutes % 60;
  if (h === 0) return `12:${String(m).padStart(2, "0")} AM`;
  if (h < 12) return `${h}:${String(m).padStart(2, "0")} AM`;
  if (h === 12) return `12:${String(m).padStart(2, "0")} PM`;
  return `${h - 12}:${String(m).padStart(2, "0")} PM`;
}

/**
 * Returns live open/closed status for the business in the given timezone.
 */
export function getOpenStatus(
  timezone: string,
  hoursDisplay: HoursDisplay,
  hoursStructured: HoursStructured
): OpenStatus {
  const { hour, minute, dayOfWeek } = getLocalTimeInZone(timezone);
  const currentMinutes = hour * 60 + minute;

  const { open, close } = getHoursForDay(dayOfWeek, hoursStructured);
  const openMinutes = parseTimeHHmm(open);
  const closeMinutes = parseTimeHHmm(close);

  let isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  if (closeMinutes < openMinutes) {
    // e.g. open 22:00, close 02:00 next day
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
  const todayLabel =
    dayOfWeek === 0
      ? hoursDisplay.sunday
      : dayOfWeek === 6
        ? hoursDisplay.saturday
        : hoursDisplay.weekdays;

  return {
    isOpen,
    nextClose: isOpen ? formatMinutesToDisplay(closeMinutes) : undefined,
    nextOpen: !isOpen ? formatMinutesToDisplay(openMinutes) : undefined,
    todayLabel,
  };
}
