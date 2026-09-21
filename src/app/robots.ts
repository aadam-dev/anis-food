import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aniseatery.com";

/**
 * Robots.txt for search engine crawlers.
 * Allows indexing of all pages and points to sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    // /receipt/* are per-sale verification pages reached only by scanning a
    // printed QR — never meant to be crawled or indexed.
    rules: { userAgent: "*", allow: "/", disallow: ["/receipt/"] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
