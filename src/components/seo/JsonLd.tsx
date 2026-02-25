import { BUSINESS_INFO } from "@/lib/constants";
import { dbGetMenuItems } from "@/lib/menu-data.server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aniseatery.com";

/**
 * Injects LocalBusiness + Restaurant + Menu/MenuItem schema for search engines.
 * Uses the same menu source as the menu page (DB or JSON fallback) so SEO matches site and POS.
 */
export default async function JsonLd() {
  const items = await dbGetMenuItems();
  const menuItemsSchema = items.map(
    (item) => ({
      "@type": "MenuItem" as const,
      name: item.name,
      description: item.description,
      ...(item.imageUrl && { image: item.imageUrl }),
      offers: {
        "@type": "Offer" as const,
        price: item.price,
        priceCurrency: "GHS",
      },
    })
  );

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": `${SITE_URL}/#restaurant`,
        name: BUSINESS_INFO.name,
        description: BUSINESS_INFO.tagline,
        url: SITE_URL,
        telephone: BUSINESS_INFO.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: BUSINESS_INFO.address,
          addressLocality: "Madina",
          addressRegion: "Greater Accra",
          addressCountry: "GH",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: BUSINESS_INFO.location.lat,
          longitude: BUSINESS_INFO.location.lng,
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "08:00",
            closes: "22:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Saturday", "Sunday"],
            opens: "09:00",
            closes: "23:00",
          },
        ],
        image: `${SITE_URL}/images/og.jpg`,
        servesCuisine: "Ghanaian",
        priceRange: "GHS",
        hasMenu: {
          "@type": "Menu",
          "@id": `${SITE_URL}/#menu`,
          name: `${BUSINESS_INFO.name} Menu`,
          hasMenuItem: menuItemsSchema,
        },
        areaServed: [
          { "@type": "City", name: "Botwe" },
          { "@type": "City", name: "Madina" },
          { "@type": "City", name: "Lakeside" },
          { "@type": "City", name: "Nanakrom" },
          { "@type": "City", name: "East Legon Hills" },
          { "@type": "City", name: "Accra" },
        ],
        sameAs: [
          BUSINESS_INFO.socialMedia.instagram,
          BUSINESS_INFO.socialMedia.facebook,
          BUSINESS_INFO.socialMedia.x,
          BUSINESS_INFO.socialMedia.tiktok,
        ].filter(Boolean),
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5",
          reviewCount: "4",
          bestRating: "5",
        },
        review: [
          {
            "@type": "Review",
            author: { "@type": "Person", name: "Kwame Asante" },
            reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
            reviewBody: "Best jollof rice in Accra! The grilled chicken is always perfectly cooked. Highly recommend!",
          },
          {
            "@type": "Review",
            author: { "@type": "Person", name: "Ama Osei" },
            reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
            reviewBody: "Affordable prices and amazing food. The Anis Special is my go-to order. Service is always friendly!",
          },
          {
            "@type": "Review",
            author: { "@type": "Person", name: "Kofi Mensah" },
            reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
            reviewBody: "Great value for money. The portions are generous and the food is always fresh. Will definitely order again!",
          },
          {
            "@type": "Review",
            author: { "@type": "Person", name: "Efua Adjei" },
            reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
            reviewBody: "Love their fried rice! The delivery is always on time and the food arrives hot. Excellent service!",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: BUSINESS_INFO.name,
        description: BUSINESS_INFO.tagline,
        publisher: { "@id": `${SITE_URL}/#restaurant` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
