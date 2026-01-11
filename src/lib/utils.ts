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
 * Generates a formatted WhatsApp message for order submission
 * The message includes customer details, order items, and total
 * @param name - Customer name
 * @param phone - Customer phone number
 * @param address - Delivery or pickup address
 * @param items - Array of ordered items with quantity and price
 * @param deliveryType - "pickup" or "delivery"
 * @param total - Total order amount
 * @param notes - Optional additional notes from customer
 * @returns URL-encoded WhatsApp message string
 */
export function generateWhatsAppOrderMessage(
  name: string,
  phone: string,
  address: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  deliveryType: "pickup" | "delivery",
  total: number,
  notes?: string
): string {
  const itemList = items
    .map((item) => `${item.quantity}x ${item.name} - GHS ${item.price.toFixed(2)}`)
    .join("\n");

  let message = `🍽️ *New Order from ${name}*\n\n`;
  message += `📞 Phone: ${phone}\n`;
  message += `📍 ${deliveryType === "delivery" ? "Delivery" : "Pickup"} Address: ${address}\n\n`;
  message += `*Order Details:*\n${itemList}\n\n`;
  message += `💰 *Total: GHS ${total.toFixed(2)}*\n\n`;
  
  if (notes) {
    message += `📝 Notes: ${notes}\n\n`;
  }
  
  message += `Please confirm this order. Thank you! 🙏`;

  return encodeURIComponent(message);
}

