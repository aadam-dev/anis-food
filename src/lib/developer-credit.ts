/**
 * Developer credit.
 *
 * One module so the wording and the URL change in exactly one place, rather than
 * drifting between the footer, the receipt and the sign-in screen.
 */

export const DEVELOPER_CREDIT = {
  name: "Aadam",
  url: "https://aadambuilds.dev",
  /** Used where a link works — the site footer, the sign-in screen. */
  label: "Powered by Aadam",
  /** Used on printed receipts, where a link is useless and the URL must be readable. */
  printLines: ["Powered by Aadam", "aadambuilds.dev"] as const,
} as const;
