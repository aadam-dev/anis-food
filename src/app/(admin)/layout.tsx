import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/permissions";
import { getSettings, asTheme } from "@/lib/settings";
import AdminShell from "@/components/admin/AdminShell";
import { prisma } from "@/lib/db";
import { isStaleSession } from "@/lib/session-utils";

export const metadata: Metadata = {
  title: { default: "Back office — Anis", template: "%s — Anis Back Office" },
  robots: { index: false, follow: false },
  // Its own manifest, so staff install the back office rather than the
  // customer-facing site. Overrides the root layout's public manifest.
  manifest: "/app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Anis Till", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F4F6F8",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays on in the back office (reports are worth zooming into);
  // fields never trigger iOS's auto-zoom, see globals.css.
  viewportFit: "cover",
  // The on-screen keyboard shrinks the layout instead of covering the field.
  interactiveWidget: "resizes-content",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy already turned away anyone without a session, but it works from
  // the cookie alone. This is the check that runs against the live user record.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, "admin")) redirect("/pos");

  const [settings, openShift] = await Promise.all([
    getSettings(),
    prisma.posSession
      .findFirst({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
        select: { openedAt: true, openedBy: { select: { name: true } } },
      })
      // The top-bar pill is a convenience; it must never take the back office down.
      .catch(() => null),
  ]);
  const theme = asTheme(settings.admin_theme, "light");
  const shift = openShift
    ? { openedBy: openShift.openedBy.name, stale: isStaleSession(openShift.openedAt) }
    : null;

  return (
    <div data-surface="admin" data-theme={theme} className="min-h-dvh">
      <AdminShell user={{ name: user.name, email: user.email, role: user.role }} shift={shift}>
        {children}
      </AdminShell>
    </div>
  );
}
