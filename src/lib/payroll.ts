import { roundMoney } from "./money";

/**
 * Pay arithmetic, shared by the pay-run screen (for the live preview) and the
 * server (for what is saved), so the two can never disagree.
 *
 * SSNIT: the employee's share is 5.5% of basic pay, deducted from their wage.
 * The employer's 13% is on top and is not taken from the worker. Whether to
 * deduct it is a choice on each run — not every Anis worker is registered.
 */
export const SSNIT_EMPLOYEE_RATE = 0.055;
export const SSNIT_EMPLOYER_RATE = 0.13;

export type SalaryType = "MONTHLY" | "DAILY" | "HOURLY";

export const SALARY_UNITS: Record<SalaryType, { per: string; unit: string | null }> = {
  MONTHLY: { per: "a month", unit: null },
  DAILY: { per: "a day", unit: "days" },
  HOURLY: { per: "an hour", unit: "hours" },
};

export interface PayInput {
  salaryType: SalaryType;
  rate: number;
  /** Days or hours worked; ignored for monthly pay. */
  units: number;
  bonuses?: number;
  otherDeductions?: number;
  ssnit?: boolean;
}

export function payLine(input: PayInput) {
  const base = roundMoney(input.salaryType === "MONTHLY" ? input.rate : input.rate * input.units);
  const bonuses = roundMoney(input.bonuses ?? 0);
  const ssnit = input.ssnit ? roundMoney(base * SSNIT_EMPLOYEE_RATE) : 0;
  const other = roundMoney(input.otherDeductions ?? 0);
  const deductions = roundMoney(ssnit + other);
  const net = roundMoney(base + bonuses - deductions);
  return {
    base,
    bonuses,
    ssnit,
    other,
    deductions,
    net,
    /** The record's note: how base was worked out and what was deducted. */
    note(extra?: string) {
      const parts: string[] = [];
      if (input.salaryType !== "MONTHLY") {
        parts.push(`${input.units} ${SALARY_UNITS[input.salaryType].unit} × ${input.rate.toFixed(2)}`);
      }
      if (ssnit > 0) parts.push(`SSNIT 5.5%: ${ssnit.toFixed(2)}`);
      if (other > 0) parts.push(`Other deductions: ${other.toFixed(2)}`);
      if (extra) parts.push(extra);
      return parts.join(" · ") || null;
    },
  };
}
