/**
 * Developer / product credit — Pronaj everywhere the customer or staff might
 * click through from a receipt, the site footer, or the till.
 *
 * The URL always opens Pronaj's web / systems page so a curious owner lands on
 * the right offer, not a personal portfolio.
 */

const PRONAJ_SYSTEMS_URL = "https://pronajgh.com/digital/web-development";

export const DEVELOPER_CREDIT = {
  name: "Pronaj",
  url: PRONAJ_SYSTEMS_URL,
  label: "Powered by Pronaj",
  printLines: ["Powered by Pronaj", "pronajgh.com"] as const,
} as const;

/** Printed on the thermal receipt. Local phone form — the reader is in Accra. */
export const RECEIPT_CREDIT = {
  name: "Pronaj",
  site: "pronajgh.com",
  siteUrl: PRONAJ_SYSTEMS_URL,
  phoneDisplay: "0263039818",
  tagline: "Retail & POS systems for Ghana",
  /** Kept short — thermal paper is precious. */
  printLines: ["Powered by Pronaj", "pronajgh.com · 0263039818"] as const,
} as const;

/**
 * Shown on the public QR receipt-verification page. Same Pronaj destination as
 * the site footer, with a soft CTA for owners who like the system.
 */
export const VERIFY_CREDIT = {
  name: "Pronaj",
  site: "pronajgh.com",
  siteUrl: PRONAJ_SYSTEMS_URL,
  label: "Powered by Pronaj",
  tagline: "Need a system like this?",
  cta: "Contact Pronaj for retail and POS systems built for Ghana.",
} as const;
