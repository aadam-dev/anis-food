import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `GHS ${price.toFixed(2)}`;
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  return digits;
}

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

