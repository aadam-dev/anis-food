import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Menu",
  description:
    "Full Anis Food and Drink menu: jollof rice, fried rice, grilled chicken, beef, fish fillet, snapper, sandwiches, salads, banku, omo tuo, sides and drinks. Authentic Ghanaian cuisine in Botwe, Accra. Prices in GHS. Order for delivery or dine-in.",
  keywords: [
    "Anis Food and Drink menu",
    "jollof rice Accra",
    "fried rice Botwe",
    "Ghanaian food menu",
    "banku and okro",
    "omo tuo groundnut soup",
    "Anis Special",
    "grilled chicken Accra",
    "food delivery Madina",
  ],
  openGraph: {
    title: "Our Menu | Anis Food and Drink — Ghanaian Cuisine in Accra",
    description:
      "Jollof rice, fried rice, grilled chicken, sandwiches, local dishes and drinks. Full menu with prices in GHS. Botwe, Accra.",
  },
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
