/**
 * Rules for closing a shift and for taking sales against it.
 *
 * Pure functions, shared by the close endpoint, the order endpoint and the
 * close dialog, so the till can never let a cashier past a step the server
 * would then refuse.
 */
import { countedTotal, drawerDifference, type DenominationCount } from "./cash";
import { roundMoney } from "./money";
import { businessDay, isStaleSession } from "./session-utils";

/**
 * Why a new sale cannot be rung right now, or null when it can.
 *
 * A shift left open from an earlier day may still be settled and closed, but a
 * new sale on it would land today's takings in yesterday's books.
 */
export function saleBlockedReason(
  openedAt: Date | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!openedAt) return null;
  if (!isStaleSession(openedAt, now)) return null;
  return (
    `The shift from ${businessDay(openedAt)} is still open. ` +
    `Settle its tickets and close it before ringing new sales.`
  );
}

/**
 * The counted cash for a close.
 *
 * A note-by-note count wins over a typed total: the count is physical evidence,
 * the total is someone's arithmetic. Null means nothing was counted at all.
 */
export function resolveClosingCash(input: {
  cashCount?: DenominationCount | null;
  closingCash?: number | null;
}): number | null {
  if (input.cashCount && Object.keys(input.cashCount).length > 0) {
    return countedTotal(input.cashCount);
  }
  if (input.closingCash !== undefined && input.closingCash !== null) {
    return roundMoney(input.closingCash);
  }
  return null;
}

export const VARIANCE_NOTE_MIN = 5;

/**
 * Everything that stops a close, in the order the dialog walks through it.
 * Returns null when the shift may be closed.
 */
export function closeProblem(input: {
  unpaidCount: number;
  expectedCash: number;
  closingCash: number | null;
  notes?: string | null;
}): string | null {
  if (input.unpaidCount > 0) {
    return (
      `${input.unpaidCount} order(s) have not been paid for yet. Settle or void them ` +
      `before closing, or the shift's takings will not match what went out of the kitchen.`
    );
  }
  if (input.closingCash === null) {
    return "Count the drawer before closing the shift.";
  }
  const difference = drawerDifference(input.expectedCash, input.closingCash);
  if (difference !== null && difference !== 0) {
    const note = (input.notes ?? "").trim();
    if (note.length < VARIANCE_NOTE_MIN) {
      return "The drawer does not balance. Write a short note saying why before closing.";
    }
  }
  return null;
}
