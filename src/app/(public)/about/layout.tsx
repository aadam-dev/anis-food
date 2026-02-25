import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Anis Food and Drink. Authentic Ghanaian cuisine in Botwe, Accra. Our story, values and commitment to quality and community.",
  openGraph: {
    title: "About Us | Anis Food and Drink",
    description: "Our story and commitment to authentic Ghanaian cuisine in Accra.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
