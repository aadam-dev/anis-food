import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/permissions";
import { getSettings, asTheme } from "@/lib/settings";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { default: "Back office — Anis", template: "%s — Anis Back Office" },
  robots: { index: false, follow: false },
  // Its own manifest, so staff install the back office rather than the
  // customer-facing site. Overrides the root layout's public manifest.
  manifest: "/app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Anis Till", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#F70E07",
  viewportFit: "cover",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy already turned away anyone without a session, but it works from
  // the cookie alone. This is the check that runs against the live user record.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, "admin")) redirect("/pos");

  const settings = await getSettings();
  const theme = asTheme(settings.admin_theme, "light");

  return (
    <div data-surface="admin" data-theme={theme} className="min-h-dvh">
      <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>
        {children}
      </AdminShell>
    </div>
  );
}
