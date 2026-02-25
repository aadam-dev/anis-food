import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aniseatery.com";

/**
 * Robots.txt for search engine crawlers.
 * Allows indexing of all pages and points to sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
