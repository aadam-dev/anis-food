import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Sign in — Anis Back Office",
  robots: { index: false, follow: false },
  manifest: "/app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Anis Till", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F4F6F8",
  viewportFit: "cover",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-surface="pos" data-theme="light" className="min-h-dvh">
      {children}
    </div>
  );
}
