/**
 * Business-day rules for shifts.
 *
 * Anis trades late — Saturday runs to 11pm — so "today" at the till is not the
 * same as "today" in UTC, and a shift opened at 22:00 Accra time is still the
 * same trading day at 23:30. Everything here works in Africa/Accra, which is
 * UTC+0 with no daylight saving, but the calculations go through the timezone
 * rather than assuming that, so the code stays correct if Anis ever opens
 * somewhere else.
 */

export const BUSINESS_TIMEZONE = "Africa/Accra";

/** Returns the YYYY-MM-DD business day for an instant, in Accra time. */
export function businessDay(at: Date = new Date(), timeZone = BUSINESS_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * A shift belonging to an earlier business day.
 *
 * This is the "someone went home without closing the till" case. It must not be
 * silently continued: the next day's takings would land in yesterday's Z-report
 * and both days would be wrong. The cashier is made to close it first.
 */
export function isStaleSession(openedAt: Date, now: Date = new Date()): boolean {
  return businessDay(openedAt) !== businessDay(now);
}

/** Start and end instants of a business day, for querying orders. */
export function businessDayRange(
  day: string,
  timeZone = BUSINESS_TIMEZONE,
): { start: Date; end: Date } {
  const offsetMinutes = timezoneOffsetMinutes(new Date(`${day}T12:00:00Z`), timeZone);
  const start = new Date(`${day}T00:00:00.000Z`);
  start.setUTCMinutes(start.getUTCMinutes() - offsetMinutes);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Minutes a timezone is ahead of UTC at a given instant. */
function timezoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Generates the order number: ANIS-YYYYMMDD-NNNN.
 *
 * The last block is what the customer is called by — "number 14, your jollof is
 * ready" — so it restarts each business day and stays short enough to shout
 * across a busy room.
 */
export function formatOrderNumber(day: string, sequence: number): string {
  return `ANIS-${day.replace(/-/g, "")}-${String(sequence).padStart(4, "0")}`;
}

/** The shoutable part of an order number. */
export function callNumber(orderNumber: string): string {
  const last = orderNumber.split("-").pop() ?? orderNumber;
  return String(Number(last));
}
