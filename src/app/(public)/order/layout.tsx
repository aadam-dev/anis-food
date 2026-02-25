import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order",
  description:
    "Order from Anis Food and Drink. Delivery or pickup in Accra. Order via WhatsApp or Bolt Food. Jollof, fried rice and more.",
  openGraph: {
    title: "Order | Anis Food and Drink",
    description: "Order Ghanaian food for delivery or pickup in Accra.",
  },
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
