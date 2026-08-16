import bcrypt from "bcryptjs";

/**
 * Cost 12: roughly a quarter-second per hash on modest hardware. Slow enough to
 * make offline cracking expensive, fast enough that a cashier tapping a PIN at
 * the counter does not notice.
 */
const BCRYPT_COST = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/** Exactly four digits. Leading zeros are meaningful, so PINs stay strings. */
export const PIN_PATTERN = /^\d{4}$/;

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) throw new Error("A PIN must be exactly four digits.");
  return bcrypt.hash(pin, BCRYPT_COST);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * PINs are only four digits, so the obvious ones are worth refusing outright —
 * a till that anyone can unlock with 1234 attributes sales to the wrong person.
 */
const WEAK_PINS = new Set([
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "4321", "1122", "1212", "2580", "0123",
]);

export function isWeakPin(pin: string): boolean {
  return WEAK_PINS.has(pin);
}
