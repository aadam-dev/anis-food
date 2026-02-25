import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos of our food and restaurant. Anis Food and Drink in Botwe, Accra. See our dishes and atmosphere.",
  openGraph: {
    title: "Gallery | Anis Food and Drink",
    description: "Photos of our Ghanaian dishes and restaurant.",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
