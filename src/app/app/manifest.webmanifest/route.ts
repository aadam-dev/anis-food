/**
 * The back office's own manifest.
 *
 * Separate from the public site's so staff get their own home-screen app rather
 * than the customer-facing one. Same logo, different identity: `id` and
 * `start_url` differ, which is what makes the browser treat it as a second
 * installable app instead of a duplicate of the first.
 *
 * start_url is /app — a route that reads the signed-in role and sends cashiers
 * to the till and everyone else to the back office, so one icon does the right
 * thing for whoever is holding the phone.
 */
export const dynamic = "force-static";

const manifest = {
  id: "/app",
  name: "Anis Back Office",
  short_name: "Anis Till",
  description: "Take orders, reconcile the drawer and see how the day went.",
  start_url: "/app",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  theme_color: "#121110",
  background_color: "#121110",
  categories: ["business", "productivity"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: "/icons/icon-maskable-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
  shortcuts: [
    {
      name: "Register",
      short_name: "Register",
      url: "/pos",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: "Today",
      short_name: "Today",
      url: "/admin",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: "Reports",
      short_name: "Reports",
      url: "/admin/reports",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  ],
};

export function GET() {
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
