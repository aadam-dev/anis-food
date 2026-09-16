import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  DISABLED_TAX,
  GHANA_STANDARD_COMPONENTS,
  type TaxComponent,
  type TaxConfig,
} from "@/lib/tax";

/**
 * Key/value settings.
 *
 * Reads are cached and tagged so the layout can ask for the theme on every
 * request without that becoming a database round-trip per page view.
 */

export const SETTINGS_CACHE_TAG = "settings";

/** Every key the app will read. Anything else submitted to the API is ignored. */
export const SETTING_KEYS = [
  "business_name",
  "business_address",
  "business_phone",
  "business_whatsapp",
  "currency_symbol",
  "timezone",
  "tax_rate",
  "tax_label",
  "tax_enabled",
  "tax_pricing",
  "tax_components",
  "receipt_header",
  "receipt_footer",
  "default_opening_float",
  "pos_theme",
  "admin_theme",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export const SETTING_DEFAULTS: Record<SettingKey, string> = {
  business_name: "Anis Food and Drink",
  business_address: "Ashale Botwe Nmai Dzorn Road, Madina, Accra, Ghana",
  business_phone: "+233 50 160 0160",
  business_whatsapp: "+233 55 250 1280",
  currency_symbol: "GH₵",
  timezone: "Africa/Accra",
  tax_rate: "0",
  tax_label: "VAT",
  // Ghana VAT is built and pre-loaded but switched OFF until the VAT status is
  // confirmed. Flip tax_enabled to "true" in Settings and every total, receipt
  // and report starts showing the breakdown; nothing changes until then.
  tax_enabled: "false",
  tax_pricing: "inclusive", // menu prices already include tax; back it out for the receipt
  tax_components: JSON.stringify(GHANA_STANDARD_COMPONENTS),
  receipt_header: "Anis Food and Drink",
  receipt_footer: "Thank you. Please come again!",
  default_opening_float: "200",
  pos_theme: "dark",
  admin_theme: "light",
};

export type Theme = "light" | "dark";

export const getSettings = unstable_cache(
  async (): Promise<Record<SettingKey, string>> => {
    const rows = await prisma.setting.findMany();
    const stored = new Map(rows.map((row) => [row.key, row.value]));

    const settings = { ...SETTING_DEFAULTS };
    for (const key of SETTING_KEYS) {
      const value = stored.get(key);
      if (value !== undefined) settings[key] = value;
    }
    return settings;
  },
  ["settings"],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 60 },
);

export function revalidateSettings(): void {
  revalidateTag(SETTINGS_CACHE_TAG, "max");
}

/** Falls back to the sensible default rather than trusting whatever is stored. */
export function asTheme(value: string | undefined, fallback: Theme): Theme {
  return value === "light" || value === "dark" ? value : fallback;
}

/**
 * The tax rate as a decimal. Anis runs at 0; a stored value outside [0, 1) is
 * treated as 0 rather than being allowed to corrupt every total on the system.
 */
export function taxRateFrom(settings: Record<SettingKey, string>): number {
  const parsed = Number(settings.tax_rate);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1) return 0;
  return parsed;
}

function parseComponents(raw: string | undefined): TaxComponent[] {
  if (!raw) return GHANA_STANDARD_COMPONENTS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return GHANA_STANDARD_COMPONENTS;
    const clean = parsed.filter(
      (c): c is TaxComponent =>
        !!c &&
        typeof c === "object" &&
        typeof (c as TaxComponent).code === "string" &&
        typeof (c as TaxComponent).label === "string" &&
        typeof (c as TaxComponent).rate === "number" &&
        (c as TaxComponent).rate >= 0 &&
        (c as TaxComponent).rate < 1 &&
        typeof (c as TaxComponent).compound === "boolean",
    );
    return clean.length > 0 ? clean : GHANA_STANDARD_COMPONENTS;
  } catch {
    return GHANA_STANDARD_COMPONENTS;
  }
}

/**
 * The tax rules as the till and receipts need them. Disabled unless
 * `tax_enabled` is explicitly "true", so a misconfiguration fails safe (no tax)
 * rather than silently charging or mis-stating VAT.
 */
export function getTaxConfig(settings: Record<SettingKey, string>): TaxConfig {
  if (settings.tax_enabled !== "true") return DISABLED_TAX;
  return {
    enabled: true,
    inclusive: settings.tax_pricing !== "exclusive",
    components: parseComponents(settings.tax_components),
  };
}
