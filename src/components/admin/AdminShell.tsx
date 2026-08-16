"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  UtensilsCrossed,
  Wallet,
  Users,
  BarChart3,
  Settings,
  BadgeCent,
  Menu as MenuIcon,
  X,
  LogOut,
  Store,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma";
import { canAccess, type Resource } from "@/lib/permissions";
import AnisLogo from "@/components/brand/AnisLogo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  resource: Resource;
}

/**
 * Grouped so the sidebar reads as the shape of the business rather than an
 * alphabetical dump of screens. A whole section disappears when the person
 * cannot open anything in it — a door you cannot use should not be visible.
 */
const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Today",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, resource: "dashboard" },
      { href: "/admin/orders", label: "Orders", icon: ReceiptText, resource: "orders" },
    ],
  },
  {
    title: "Shop",
    items: [
      { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, resource: "menu" },
      { href: "/admin/customers", label: "Customers", icon: Users, resource: "customers" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/admin/expenses", label: "Expenses", icon: Wallet, resource: "expenses" },
      { href: "/admin/payroll", label: "Payroll", icon: BadgeCent, resource: "payroll" },
      { href: "/admin/reports", label: "Reports", icon: BarChart3, resource: "reports" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/staff", label: "Staff", icon: Users, resource: "staff" },
      { href: "/admin/settings", label: "Settings", icon: Settings, resource: "settings" },
    ],
  },
];

interface AdminShellProps {
  user: { name: string; email: string; role: UserRole };
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(user.role, item.resource)),
  })).filter((section) => section.items.length > 0);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isCurrent(href: string) {
    // "/admin" would otherwise light up on every child route.
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p
            className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider"
            style={{ color: "var(--s-ink-faint)" }}
          >
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const current = isCurrent(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      background: current ? "var(--s-hover)" : "transparent",
                      color: current ? "var(--s-brand)" : "var(--s-ink-muted)",
                    }}
                  >
                    <item.icon className="w-[1.15rem] h-[1.15rem] shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t px-3 py-3 space-y-1" style={{ borderColor: "var(--s-border)" }}>
      {canAccess(user.role, "pos") && (
        <Link
          href="/pos"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
          style={{ color: "var(--s-ink-muted)" }}
        >
          <Store className="w-[1.15rem] h-[1.15rem] shrink-0" />
          Open the till
        </Link>
      )}
      <div className="px-3 pt-2 pb-1">
        <p className="text-sm font-medium truncate">{user.name}</p>
        <p className="text-xs truncate" style={{ color: "var(--s-ink-faint)" }}>
          {user.role.toLowerCase().replace("_", " ")}
        </p>
      </div>
      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
        style={{ color: "var(--s-ink-muted)" }}
      >
        <LogOut className="w-[1.15rem] h-[1.15rem] shrink-0" />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-64 shrink-0 flex-col border-r"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        <div className="px-4 py-5">
          <AnisLogo priority className="h-9 w-auto" />
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="relative w-72 flex flex-col border-r"
            style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <AnisLogo className="h-9 w-auto" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-11 w-11 -mr-2 flex items-center justify-center rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
            {sidebarFooter}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header
          className="lg:hidden sticky top-0 z-40 flex items-center gap-2 border-b px-2 py-2"
          style={{
            background: "var(--s-panel)",
            borderColor: "var(--s-border)",
            paddingTop: "max(0.5rem, env(safe-area-inset-top))",
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="h-11 w-11 flex items-center justify-center rounded-lg"
            aria-label="Open menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <AnisLogo priority className="h-7 w-auto" />
        </header>

        <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
