import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "*": [
      "./prisma/migrations/**/*",
      "./scripts/db-migrate.mjs",
      "./node_modules/pg/**/*",
      "./node_modules/pg-connection-string/**/*",
      "./node_modules/pg-pool/**/*",
      "./node_modules/pg-protocol/**/*",
      "./node_modules/pg-types/**/*",
      "./node_modules/pgpass/**/*",
      "./node_modules/postgres-array/**/*",
      "./node_modules/postgres-bytea/**/*",
      "./node_modules/postgres-date/**/*",
      "./node_modules/postgres-interval/**/*",
      "./node_modules/split2/**/*",
    ],
  },
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
