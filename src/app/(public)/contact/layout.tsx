import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Find Anis Food and Drink in Botwe, Accra. Address, phone, opening hours. Order for delivery or visit us. Get directions.",
  openGraph: {
    title: "Contact | Anis Food and Drink",
    description: "Address, phone and opening hours. Botwe, Madina, Accra.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
