/**
 * Developer credit — three separate identities, on purpose.
 *
 * `DEVELOPER_CREDIT` is the public-facing one (site footer, sign-in screen):
 * the product brand, Pronaj, linking to its web-development page.
 *
 * `RECEIPT_CREDIT` is what prints on the thermal slip: Pronaj, the product name
 * the restaurant's customers and staff see on paper every day. A shopfront brand
 * for the point-of-sale, distinct from the developer's personal site.
 *
 * `VERIFY_CREDIT` is what shows on the public receipt-verification page a
 * customer reaches by scanning the QR — back to aadambuilds.dev.
 *
 * They are three constants rather than one with overrides so a later edit to the
 * receipt footer can never silently change what the footer or the verify page
 * advertises, or the reverse. This mirrors al-boyut's split.
 */

export const DEVELOPER_CREDIT = {
  name: "Pronaj",
  url: "https://pronajgh.com/digital/web-development",
  /** Used where a link works — the site footer, the sign-in screen. */
  label: "Powered by Pronaj",
  /** Kept for any text-only surface; the public site uses the linked label above. */
  printLines: ["Powered by Pronaj", "pronajgh.com"] as const,
} as const;

/** Printed on the thermal receipt. Local phone form — the reader is in Accra. */
export const RECEIPT_CREDIT = {
  name: "Pronaj",
  site: "pronajgh.com",
  siteUrl: "https://pronajgh.com",
  phoneDisplay: "0263039818",
  tagline: "POS & retail systems for Ghana",
  printLines: ["Powered by Pronaj", "pronajgh.com · 0263039818"] as const,
} as const;

/** Shown on the public QR receipt-verification page only. */
export const VERIFY_CREDIT = {
  name: "Aadam",
  site: "aadambuilds.dev",
  siteUrl: "https://aadambuilds.dev",
  label: "Built by Aadam",
  tagline: "POS & retail systems for Ghana",
} as const;
