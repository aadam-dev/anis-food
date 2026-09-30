/**
 * Ghana mobile numbers on the till.
 *
 * Local form is ten digits starting with 0 (e.g. 0241234567). Display groups
 * them as 024 XXX XXXX. Storage keeps the compact digits so receipts and
 * lookups stay consistent.
 */

/** Digits only, at most ten (local Ghana mobile length). */
export function digitsOnly(raw: string, max = 10): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/**
 * Formats a Ghana local mobile for the field: `024 XXX XXXX`.
 * Incomplete values still group as the cashier types.
 */
export function formatGhanaPhone(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Compact digits for the database. Empty input stays empty. */
export function storeGhanaPhone(raw: string): string {
  return digitsOnly(raw);
}

/** True when empty (optional) or a complete ten-digit local number. */
export function isValidGhanaPhone(raw: string, { required = false } = {}): boolean {
  const digits = digitsOnly(raw);
  if (!digits) return !required;
  return digits.length === 10 && digits.startsWith("0");
}

export const GHANA_PHONE_PLACEHOLDER = "024 XXX XXXX";
export const GHANA_PHONE_HINT = "Ghana mobile · 024 XXX XXXX";
