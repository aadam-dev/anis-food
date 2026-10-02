import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Handles conflicts and conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a price value as Ghana Cedis (GHS)
 * @param price - The price value to format
 * @returns Formatted price string (e.g., "GHS 50.00")
 */
export function formatPrice(price: number): string {
  return `GHS ${price.toFixed(2)}`;
}

/** Order totals: subtotal (ex-VAT), VAT amount, and total (VAT-inclusive). */
export interface OrderTotals {
  subtotal: number;
  vat: number;
  total: number;
  vatRate: number;
}

/**
 * Compute order totals from items. When VAT is inclusive:
 * total = sum of (price * qty), subtotal = total / (1 + rate), vat = total - subtotal.
 */
export function getOrderTotals(
  items: Array<{ price: number; quantity: number }>,
  vatRate: number,
  vatInclusive: boolean
): OrderTotals {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (total === 0) {
    return { subtotal: 0, vat: 0, total: 0, vatRate };
  }
  if (vatInclusive) {
    const subtotal = total / (1 + vatRate);
    const vat = total - subtotal;
    return { subtotal, vat, total, vatRate };
  }
  const subtotal = total;
  const vat = subtotal * vatRate;
  return { subtotal, vat, total: subtotal + vat, vatRate };
}

/**
 * Generate a short order reference for display and tracking (client-side only until backend exists).
 */
export function generateOrderReference(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${t}-${r}`;
}

/**
 * Removes all non-digit characters from a phone number string
 * @param phone - The phone number string to format
 * @returns Phone number with only digits
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits;
}

/**
 * Validates phone number for order form. Prioritises Ghana numbers (strict format);
 * allows other international numbers (10–15 digits).
 * @param value - Raw input (e.g. "050 160 0160", "+44 20 7123 4567")
 * @returns true if valid; otherwise an error message string
 */
export function validateOrderPhone(value: string): true | string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "Phone number is required";
  }
  if (!/^[0-9+\s()-]+$/.test(trimmed)) {
    return "Use only digits and + ( ) -";
  }
  const digits = trimmed.replace(/\D/g, "");
  const len = digits.length;

  // Ghana: 10 digits starting with 0 (e.g. 0501600160), or 12 digits starting with 233
  if (len === 10 && digits.startsWith("0")) {
    return true;
  }
  if (len === 12 && digits.startsWith("233")) {
    return true;
  }

  // International: 10–15 digits (covers most country codes + national number)
  if (len >= 10 && len <= 15) {
    return true;
  }

  if (len < 10) {
    return "Phone number is too short (e.g. Ghana: 050 160 0160)";
  }
  return "Phone number is too long";
}

/**
 * Generates a formatted WhatsApp message for order submission.
 * Includes customer details, order items, VAT breakdown (if provided), and total.
 */
export function generateWhatsAppOrderMessage(
  name: string,
  phone: string,
  address: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  deliveryType: "pickup" | "delivery",
  total: number,
  notes?: string,
  options?: { orderRef?: string; subtotal?: number; vat?: number; vatRate?: number }
): string {
  const itemList = items
    .map((item) => `${item.quantity}x ${item.name} - GHS ${(item.price * item.quantity).toFixed(2)}`)
    .join("\n");

  let message = `🍽️ *New Order${options?.orderRef ? ` ${options.orderRef}` : ""} from ${name}*\n\n`;
  message += `📞 Phone: ${phone}\n`;
  message += `📍 ${deliveryType === "delivery" ? "Delivery" : "Pickup"}: ${address}\n\n`;
  message += `*Order Details:*\n${itemList}\n\n`;
  // Anis charges no VAT, so the message the kitchen receives is just a total.
  // The rate is read from config rather than hardcoded, so these lines come back
  // correctly labelled if VAT is ever switched on.
  if (options?.subtotal != null && options?.vat != null && (options.vatRate ?? 0) > 0) {
    message += `Subtotal (ex-VAT): GHS ${options.subtotal.toFixed(2)}\n`;
    message += `VAT (${(options.vatRate! * 100).toFixed(1)}%): GHS ${options.vat.toFixed(2)}\n`;
  }
  message += `💰 *Total: GHS ${total.toFixed(2)}*\n\n`;
  if (notes) {
    message += `📝 Notes: ${notes}\n\n`;
  }
  message += `Please confirm this order. Thank you! 🙏`;

  return encodeURIComponent(message);
}

/**
 * Build WhatsApp URL for reservation requests. Opens chat with pre-filled message.
 */
export function getWhatsAppReservationUrl(
  phone: string,
  data: {
    date: string;
    time: string;
    partySize: number;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  }
): string {
  let message = `📅 *Reservation Request*\n\n`;
  message += `Name: ${data.name}\n`;
  message += `Phone: ${data.phone}\n`;
  if (data.email) message += `Email: ${data.email}\n`;
  message += `Date: ${data.date}\n`;
  message += `Time: ${data.time}\n`;
  message += `Party size: ${data.partySize}\n`;
  if (data.notes) message += `Notes: ${data.notes}\n`;
  message += `\nPlease confirm availability. Thank you!`;
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp URL for contact/message. Opens chat with pre-filled message.
 */
export function getWhatsAppContactUrl(
  phone: string,
  data: { name: string; email: string; phone: string; message: string }
): string {
  let message = `💬 *Message from website*\n\n`;
  message += `Name: ${data.name}\n`;
  message += `Email: ${data.email}\n`;
  message += `Phone: ${data.phone}\n\n`;
  message += `Message:\n${data.message}`;
  return getWhatsAppUrl(phone, message);
}

/** Ghana numbers starting with 0 become 233… so wa.me opens the right chat. */
export function whatsappDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) digits = `233${digits.slice(1)}`;
  return digits;
}

export function getWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${whatsappDigits(phone)}?text=${encodeURIComponent(message)}`;
}

/** Staff → customer: confirm an online order landed. */
export function onlineOrderConfirmMessage(input: {
  customerName: string;
  orderNumber: string;
  total: number;
  deliveryType: string;
}): string {
  const place =
    input.deliveryType === "DELIVERY"
      ? " for delivery"
      : input.deliveryType === "TAKEAWAY"
        ? " for pickup"
        : "";
  return [
    `Hello ${input.customerName.trim() || "there"},`,
    "",
    `This is Anis Food and Drink. We have your online order ${input.orderNumber}${place}.`,
    `Total: GHS ${input.total.toFixed(2)}.`,
    "",
    "Please reply to confirm this order. Thank you.",
  ].join("\n");
}

/** Staff → customer: ask for MoMo / transfer payment (no card gateway yet). */
export function onlineOrderPaymentMessage(input: {
  customerName: string;
  orderNumber: string;
  total: number;
  payToPhone: string;
}): string {
  return [
    `Hello ${input.customerName.trim() || "there"},`,
    "",
    `Please pay GHS ${input.total.toFixed(2)} for order ${input.orderNumber}.`,
    `MoMo / transfer to ${input.payToPhone}.`,
    "",
    "Send the name on the payment and a screenshot when done so we can mark it paid. Thank you.",
  ].join("\n");
}

/** Staff → customer: share a till receipt over WhatsApp with the verify link. */
export function receiptShareMessage(input: {
  businessName: string;
  customerName?: string | null;
  orderNumber: string;
  callNumber?: string;
  total: number;
  items: { quantity: number; name: string }[];
  verifyUrl: string;
}): string {
  const who = input.customerName?.trim() || "there";
  const lines = input.items
    .slice(0, 8)
    .map((item) => `• ${item.quantity}× ${item.name}`)
    .join("\n");
  const more =
    input.items.length > 8 ? `\n• …and ${input.items.length - 8} more` : "";
  const call = input.callNumber ? ` (#${input.callNumber})` : "";
  return [
    `Hello ${who},`,
    "",
    `Here is your receipt from ${input.businessName} — order ${input.orderNumber}${call}.`,
    `Total: GHS ${input.total.toFixed(2)}.`,
    "",
    lines + more,
    "",
    "View or save your receipt:",
    input.verifyUrl,
    "",
    "Thank you — please come again!",
  ].join("\n");
}

/** Open WhatsApp with a prefilled message. Blank phone opens the contact picker. */
export function getWhatsAppShareUrl(phone: string | null | undefined, message: string): string {
  const digits = phone ? whatsappDigits(phone) : "";
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

