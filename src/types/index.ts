/**
 * Shared types for menu items, orders, testimonials, and gallery.
 */
export type DietaryTag = "vegetarian" | "spicy";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  image?: string;
  popular?: boolean;
  available?: boolean;
  tags?: DietaryTag[];
}

export type MenuCategory = "rice" | "noodles" | "sandwiches" | "sides" | "drinks" | "local";

export interface MenuCategoryData {
  id: MenuCategory;
  name: string;
  description: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

/** How the customer will pay. Paystack = card/online; pay_on_pickup = cash/card at pickup/delivery. */
export type PaymentMethod = "pay_on_pickup" | "paystack";

export interface OrderFormData {
  name: string;
  phone: string;
  email?: string;
  address: string;
  deliveryType: "pickup" | "delivery";
  items: OrderItem[];
  notes?: string;
  /** Payment method for receipt display (e.g. pay_on_pickup). */
  paymentMethod?: PaymentMethod;
  /** Order reference (e.g. ORD-xxx) for receipt and WhatsApp. */
  orderRef?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  image?: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: "food" | "interior" | "events" | "staff";
}

