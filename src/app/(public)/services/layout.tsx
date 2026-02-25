import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Food for occasions: weddings, ceremonies, corporate events. Serene space for meetings and events in Botwe, Accra. Catering and venue by Anis Food and Drink.",
  openGraph: {
    title: "Services | Anis Food and Drink",
    description: "Catering for weddings and events. Serene space for meetings in Accra.",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
