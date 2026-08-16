/**
 * Site-wide config: business details, nav links, social and delivery URLs.
 * Update phone, address, hours, and social handles here.
 */
export const BUSINESS_INFO = {
  name: "Anis Food and Drink",
  tagline: "Authentic Ghanaian Cuisine at Affordable Prices",
  /** Primary contact (call) */
  phone: "+233 50 160 0160",
  /** WhatsApp line (orders, contact, reservations) */
  phoneSecondary: "+233 55 250 1280",
  address: "Ashale Botwe Nmai Dzorn Road, Madina, Accra, Ghana",
  location: {
    lat: 5.681335700000001,
    lng: -0.1284039,
  },
  socialMedia: {
    instagram: "https://www.instagram.com/anisfooddrink/",
    facebook: "https://www.facebook.com/anisfooddrink/",
    whatsapp: "https://wa.me/233552501280",
    x: null as string | null,
    tiktok: "https://www.tiktok.com/@anis_food_drink",
  },
  // Delivery platforms
  deliveryPlatforms: {
    boltFood: "https://food.bolt.eu/en-us/137-accra/p/37879-anis-food-and-drink",
    glovoApp: null, // Update with GlovoApp link if available
  },
  // Operating hours (display strings)
  hours: {
    weekdays: "8:00 AM - 10:00 PM",
    saturday: "9:00 AM - 11:00 PM",
    sunday: "12:00 PM - 10:00 PM",
  },
  // Timezone for live Open/Closed (IANA)
  timezone: "Africa/Accra",
  // Machine-readable hours for live status (24h "HH:mm")
  hoursStructured: {
    weekdays: { open: "08:00", close: "22:00" }, // Mon–Fri
    saturday: { open: "09:00", close: "23:00" },
    sunday: { open: "12:00", close: "22:00" }, // 12 PM – 10 PM
  },
  // Optional hero video path (e.g. "/videos/hero.mp4"). Set to enable video background; image used as poster and fallback.
  heroVideoPath: null as string | null,
} as const;

/**
 * Order & tax.
 *
 * Anis does not show VAT: the price on the menu is the price the customer pays,
 * on the website and at the till alike. The rate stays here at 0 rather than
 * being deleted, so registering for VAT later is this one line plus the matching
 * `tax_rate` setting — not a hunt through every receipt component. Every place
 * that displays a tax line already hides it while the rate is 0.
 */
export const ORDER_CONFIG = {
  /** VAT rate as decimal (e.g. 0.125 = 12.5%). Zero = no VAT shown anywhere. */
  VAT_RATE: 0,
  /** If true, item prices are VAT-inclusive; we derive subtotal and VAT from total. */
  VAT_INCLUSIVE: true,
} as const;

/** Config-driven Instagram grid. Add image paths and optional links; replace with API later if needed. */
export const SOCIAL_FEED_IMAGES: { src: string; alt: string; href?: string }[] = [
  { src: "/images/hero/jollof-hero.png", alt: "Jollof rice" },
  { src: "/images/story-spread.png", alt: "Ghanaian feast" },
  { src: "/images/hero/jollof-hero.png", alt: "Signature dish" },
  { src: "/images/story-spread.png", alt: "Our food" },
  { src: "/images/hero/jollof-hero.png", alt: "Fresh meal" },
  { src: "/images/story-spread.png", alt: "Dining at Anis" },
];

export const NAVIGATION_ITEMS = [
  { name: "Home", href: "/" },
  { name: "Menu", href: "/menu" },
  { name: "Reservations", href: "/reservations" },
  { name: "Services", href: "/services" },
  { name: "About", href: "/about" },
  { name: "Gallery", href: "/gallery" },
  { name: "Contact", href: "/contact" },
] as const;

