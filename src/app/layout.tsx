/**
 * Root layout: fonts, global metadata, and ToastProvider.
 * Public pages add Header/Footer via (public)/layout.tsx.
 * Admin and POS have their own layouts without public chrome.
 */
import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { ToastProvider } from "@/contexts/ToastContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aniseatery.com";

export const viewport: Viewport = {
  themeColor: "#F70E07",
  width: "device-width",
  initialScale: 1,
  // Deliberately no maximumScale here. Blocking pinch-zoom on a public page
  // stops anyone with poor eyesight from reading the menu, which is the one
  // thing the site exists to show. The till locks zoom in its own layout, where
  // a stray two-finger touch mid-service is the real risk.
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Anis Food and Drink",
  title: {
    default: "Anis Food and Drink | Authentic Ghanaian Cuisine in Accra",
    template: "%s | Anis Food and Drink",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anis",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
  description:
    "Order authentic Ghanaian food in Accra. Breakfast, pastries, jollof rice, grilled chicken, fried rice and more. Local bar with natural drinks and juices. Dine in or delivery in Botwe, Madina, Lakeside, Nanakrom, East Legon Hills. Catering for weddings and events. Serene space for meetings.",
  keywords: [
    "Ghanaian food Accra",
    "breakfast Botwe Accra",
    "local bar natural drinks Accra",
    "jollof rice Botwe",
    "jollof rice Lakeside",
    "food delivery Lakeside",
    "food delivery Botwe",
    "restaurant Madina",
    "restaurant Nanakrom",
    "East Legon Hills restaurant",
    "Anis Food and Drink",
    "food delivery Accra",
    "authentic Ghanaian cuisine",
    "fried rice Accra",
    "order food Botwe",
    "catering Accra",
    "wedding food Ghana",
    "event catering Botwe",
    "meetings and events space Accra",
  ],
  authors: [{ name: "Anis Food and Drink" }],
  creator: "Anis Food and Drink",
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: siteUrl,
    siteName: "Anis Eatery",
    title: "Anis Eatery | Accra's Favorite Ghanaian Eatery",
    description:
      "Accra's favorite Ghanaian eatery. Jollof, fried rice, grilled chicken. Dine in or delivery. Catering & events.",
    images: [{ url: "/images/og.jpg", width: 1200, height: 630, alt: "Anis Food and Drink" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Anis Eatery | Accra's Favorite Ghanaian Eatery",
    description: "Accra's favorite Ghanaian eatery. Jollof, fried rice, grilled chicken. Order now.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: siteUrl },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} ${playfair.variable} antialiased`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
