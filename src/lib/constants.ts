export const BUSINESS_INFO = {
  name: "Anis Food and Drink",
  tagline: "Authentic Ghanaian Cuisine at Affordable Prices",
  phone: "+233 50 160 0160",
  address: "Ashale Botwe Nmai Dzorn Road, Madina, Accra, Ghana",
  location: {
    lat: 5.681335700000001,
    lng: -0.1284039,
  },
  // Social media handles - update with actual handles when available
  socialMedia: {
    instagram: null, // Update with actual Instagram handle (e.g., "https://instagram.com/anisfoodanddrink")
    facebook: null, // Update with actual Facebook page URL
    whatsapp: "https://wa.me/233501600160",
    twitter: null, // Update if Twitter account exists
  },
  // Delivery platforms
  deliveryPlatforms: {
    boltFood: "https://food.bolt.eu/en-us/137-accra/p/37879-anis-food-and-drink",
    glovoApp: null, // Update with GlovoApp link if available
  },
  // Operating hours (to be confirmed)
  hours: {
    weekdays: "8:00 AM - 10:00 PM",
    weekends: "9:00 AM - 11:00 PM",
  },
} as const;

export const NAVIGATION_ITEMS = [
  { name: "Home", href: "/" },
  { name: "Menu", href: "/menu" },
  { name: "About", href: "/about" },
  { name: "Gallery", href: "/gallery" },
  { name: "Contact", href: "/contact" },
] as const;

