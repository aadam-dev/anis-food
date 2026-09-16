/**
 * Ghana consumption tax, built to be switched on the day Anis's VAT status is
 * confirmed — not a day sooner.
 *
 * The standard GRA computation on a food-and-beverage sale stacks four charges:
 * three flat levies on the net value (NHIL 2.5%, GETFund 2.5%, COVID-19 1%),
 * and then VAT (15%) charged on the net *plus* those levies — so VAT compounds
 * on the levies, not on the bare net. On a GH₵100 net that is GH₵6 of levies
 * and GH₵15.90 of VAT: GH₵121.90 gross, an effective 21.9%.
 *
 * Two things make this safe to ship turned off:
 *  - `enabled: false` means every total behaves exactly as it does today. No tax
 *    line appears, nothing is backed out, the customer pays the menu price.
 *  - Menu prices at Anis already include whatever tax applies ("the price is the
 *    price"), so when it is switched on we back the tax *out* of the price for
 *    the receipt rather than adding it on top and surprising anyone at the till.
 *
 * Every rate lives in Settings, so turning it on — or moving to the 3% flat-rate
 * scheme, or adding the tourism levy — is a settings change, never a code change.
 */

import { roundMoney, sumMoney } from "./money";

/** One charge in the stack — a levy or the VAT itself. */
export interface TaxComponent {
  /** Stable machine code, e.g. "VAT", "NHIL". */
  code: string;
  /** What prints on the receipt, e.g. "VAT (15%)". */
  label: string;
  /** Decimal rate, e.g. 0.15 for 15%. */
  rate: number;
  /**
   * false → charged on the net value (the levies).
   * true  → charged on the net value plus every non-compound charge (VAT, which
   *          sits on top of the levies).
   */
  compound: boolean;
}

export interface TaxConfig {
  enabled: boolean;
  /** true → menu prices already include tax; false → tax is added on top. */
  inclusive: boolean;
  components: TaxComponent[];
}

export interface TaxLine {
  code: string;
  label: string;
  rate: number;
  amount: number;
}

export interface TaxBreakdown {
  /** The tax-exclusive value. */
  net: number;
  lines: TaxLine[];
  /** Sum of every line — the total tax within (inclusive) or added to (exclusive) the sale. */
  taxTotal: number;
  /** What the customer pays. */
  gross: number;
}

/**
 * The GRA standard-rated stack for food and beverage. Pre-loaded so it is ready
 * to switch on; `enabled` stays false until someone confirms the VAT status.
 */
export const GHANA_STANDARD_COMPONENTS: TaxComponent[] = [
  { code: "NHIL", label: "NHIL (2.5%)", rate: 0.025, compound: false },
  { code: "GETFUND", label: "GETFund (2.5%)", rate: 0.025, compound: false },
  { code: "COVID", label: "COVID-19 Levy (1%)", rate: 0.01, compound: false },
  { code: "VAT", label: "VAT (15%)", rate: 0.15, compound: true },
];

/** The 3% VAT Flat Rate Scheme, as a one-line alternative. */
export const GHANA_FLAT_RATE_COMPONENTS: TaxComponent[] = [
  { code: "VFRS", label: "VAT Flat Rate (3%)", rate: 0.03, compound: false },
];

export const DISABLED_TAX: TaxConfig = {
  enabled: false,
  inclusive: true,
  components: [],
};

function lineAmounts(net: number, config: TaxConfig): TaxLine[] {
  const leviesBase = config.components
    .filter((component) => !component.compound)
    .reduce((sum, component) => sum + component.rate * net, 0);

  return config.components.map((component) => {
    const base = component.compound ? net + leviesBase : net;
    return {
      code: component.code,
      label: component.label,
      rate: component.rate,
      amount: roundMoney(component.rate * base),
    };
  });
}

/** Builds the breakdown for a tax-exclusive net value (tax added on top). */
export function taxFromNet(net: number, config: TaxConfig): TaxBreakdown {
  const clean = roundMoney(net);
  if (!config.enabled || config.components.length === 0) {
    return { net: clean, lines: [], taxTotal: 0, gross: clean };
  }
  const lines = lineAmounts(clean, config);
  const taxTotal = sumMoney(lines.map((line) => line.amount));
  return { net: clean, lines, taxTotal, gross: roundMoney(clean + taxTotal) };
}

/**
 * Builds the breakdown for a tax-inclusive gross value (tax already inside the
 * price). The total tax is linear in the net, so the net is recovered exactly by
 * dividing out the combined factor; the net then absorbs any rounding residual
 * so `net + taxTotal` always equals the gross to the pesewa.
 */
export function taxFromGross(gross: number, config: TaxConfig): TaxBreakdown {
  const clean = roundMoney(gross);
  if (!config.enabled || config.components.length === 0) {
    return { net: clean, lines: [], taxTotal: 0, gross: clean };
  }

  const leviesRate = config.components
    .filter((component) => !component.compound)
    .reduce((sum, component) => sum + component.rate, 0);
  const compoundRate = config.components
    .filter((component) => component.compound)
    .reduce((sum, component) => sum + component.rate, 0);

  // gross = net · (1 + leviesRate + compoundRate·(1 + leviesRate))
  const factor = 1 + leviesRate + compoundRate * (1 + leviesRate);
  const netEstimate = clean / factor;

  const lines = lineAmounts(netEstimate, config);
  const taxTotal = sumMoney(lines.map((line) => line.amount));
  const net = roundMoney(clean - taxTotal);
  return { net, lines, taxTotal, gross: clean };
}

/** Whichever direction the pricing runs. */
export function taxBreakdown(amount: number, config: TaxConfig): TaxBreakdown {
  return config.inclusive ? taxFromGross(amount, config) : taxFromNet(amount, config);
}
