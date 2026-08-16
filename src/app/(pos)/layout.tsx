import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/permissions";
import { getSettings, asTheme } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Till — Anis",
  robots: { index: false, follow: false },
  manifest: "/app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Anis Till", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#121110",
  // No pinch-zoom: a stray two-finger touch mid-service should not leave the
  // cashier looking at a magnified corner of the register with a queue waiting.
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // So the cart's action bar clears the home indicator on a modern phone.
  viewportFit: "cover",
};

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, "pos")) redirect("/admin");

  const settings = await getSettings();
  const theme = asTheme(settings.pos_theme, "dark");

  return (
    <div data-surface="pos" data-theme={theme} className="min-h-dvh">
      {children}
    </div>
  );
}
