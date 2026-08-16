/**
 * Cash drawer reconciliation.
 *
 * `expectedCash` is computed in exactly one place. The register, the shift-close
 * endpoint and the back-office report all import it, so they physically cannot
 * show three different answers to "how much should be in the drawer?" — which is
 * the failure mode that makes staff stop trusting a till.
 */
import { roundMoney, toMoney, formatGHS } from "./money";

/** Ghana cedi notes and coins, largest first — the order a person counts in. */
export const GHS_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1] as const;

export type DenominationCount = Record<string, number>;

export interface DrawerInput {
  openingFloat: number;
  /** Cash takings for the shift — cash legs of split payments included. */
  cashRevenue: number;
  /** Non-sale cash added to the drawer (float top-up, change run). */
  cashIn?: number;
  /** Non-sale cash removed (gas refill, supplier paid from the till, banking). */
  cashOut?: number;
}

/** The one true drawer formula. */
export function expectedCash({
  openingFloat,
  cashRevenue,
  cashIn = 0,
  cashOut = 0,
}: DrawerInput): number {
  return roundMoney(
    toMoney(openingFloat) + toMoney(cashRevenue) + toMoney(cashIn) - toMoney(cashOut),
  );
}

export interface WalletInput {
  /** Null means never recorded — not zero. The distinction survives to the UI. */
  openingMomo: number | null | undefined;
  momoRevenue: number;
}

export interface WalletTotals {
  opening: number | null;
  revenue: number;
  expected: number | null;
}

/**
 * MoMo has no drawer to count, so an unrecorded opening balance makes the
 * expected closing balance unknowable. Returning null rather than assuming zero
 * keeps "we never wrote it down" distinct from "it was empty".
 */
export function walletTotals({ openingMomo, momoRevenue }: WalletInput): WalletTotals {
  const revenue = toMoney(momoRevenue);
  const opening = openingMomo === null || openingMomo === undefined ? null : toMoney(openingMomo);
  return { opening, revenue, expected: opening === null ? null : roundMoney(opening + revenue) };
}

/**
 * Positive = more money than expected, negative = less.
 * Null = not counted yet, which is not the same as balancing perfectly.
 */
export function drawerDifference(
  expected: number | null | undefined,
  counted: number | null | undefined,
): number | null {
  if (expected === null || expected === undefined) return null;
  if (counted === null || counted === undefined) return null;
  return roundMoney(toMoney(counted) - toMoney(expected));
}

/**
 * Cashiers do not speak accountant. "Variance: -12.00" means nothing at 9pm at
 * the end of a long shift; "Short by GH₵12.00" means something immediately.
 */
export function differenceLabel(difference: number | null): string {
  if (difference === null) return "Not counted yet";
  if (difference === 0) return "Balanced";
  return difference > 0
    ? `Over by ${formatGHS(difference)}`
    : `Short by ${formatGHS(Math.abs(difference))}`;
}

/** Totals a denomination breakdown, e.g. { "50": 3, "20": 11 } → 370. */
export function countedTotal(counts: DenominationCount | null | undefined): number {
  if (!counts) return 0;
  let total = 0;
  for (const [denomination, quantity] of Object.entries(counts)) {
    const value = Number(denomination);
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Not a denomination: "${denomination}"`);
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new RangeError(`Count for ${denomination} must be a non-negative integer`);
    }
    total += value * quantity;
  }
  return roundMoney(total);
}

export interface CashMovementLike {
  direction: "IN" | "OUT";
  amount: number;
}

export function splitMovements(movements: CashMovementLike[]): { cashIn: number; cashOut: number } {
  let cashIn = 0;
  let cashOut = 0;
  for (const movement of movements) {
    if (movement.direction === "IN") cashIn += toMoney(movement.amount);
    else cashOut += toMoney(movement.amount);
  }
  return { cashIn: roundMoney(cashIn), cashOut: roundMoney(cashOut) };
}
