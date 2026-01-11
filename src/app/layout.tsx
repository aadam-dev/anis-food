import type { Metadata } from "next";
import { Inter, Poppins, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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

export const metadata: Metadata = {
  title: "Anis Food and Drink | Authentic Ghanaian Cuisine in Accra",
  description: "Experience authentic Ghanaian cuisine at affordable prices. Located in Botwe, Accra. Order your favorite jollof, fried rice, and more!",
  keywords: ["Ghanaian food", "Accra restaurant", "Jollof rice", "Botwe restaurant", "Anis Food"],
  openGraph: {
    title: "Anis Food and Drink",
    description: "Authentic Ghanaian Cuisine at Affordable Prices",
    type: "website",
  },
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
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
