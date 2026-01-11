export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  image?: string;
  popular?: boolean;
  available?: boolean;
}

export type MenuCategory = "rice" | "noodles" | "sandwiches" | "sides" | "drinks";

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

export interface OrderFormData {
  name: string;
  phone: string;
  email?: string;
  address: string;
  deliveryType: "pickup" | "delivery";
  items: OrderItem[];
  notes?: string;
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

