import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aniseatery.com";

/**
 * Generates sitemap for search engines.
 * Helps crawlers discover all pages and improves indexing.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/menu", "/reservations", "/services", "/about", "/gallery", "/contact", "/order", "/privacy", "/terms"];
  return routes.map((route) => {
    const changeFrequency: "weekly" | "monthly" =
      route === "" || route === "/menu" ? "weekly" : "monthly";
    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency,
      priority: route === "" ? 1 : route === "/menu" ? 0.9 : 0.8,
    };
  });
}
