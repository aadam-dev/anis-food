import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  images: {
    // Restrict to known hosts to mitigate Image Optimizer DoS (GHSA-9g9p-9gw9-jx7f).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aniseatery.com",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      // Supabase Storage (menu images uploaded via admin)
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default withSerwist(nextConfig);
