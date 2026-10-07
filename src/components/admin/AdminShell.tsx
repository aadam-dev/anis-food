"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LayoutGrid,
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
  Boxes,
  Coins,
  BookOpen,
  Landmark,
  Contact,
  KeyRound,
  History,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma";
import { canAccess, type Resource } from "@/lib/permissions";
import AnisLogo from "@/components/brand/AnisLogo";
import InstallPrompt from "@/components/pwa/InstallPrompt";

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
      { href: "/admin/tables", label: "Tables", icon: LayoutGrid, resource: "tables" },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, resource: "inventory" },
      { href: "/admin/customers", label: "Customers", icon: Users, resource: "customers" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/admin/cash-up", label: "Cash-up", icon: Coins, resource: "reports" },
      { href: "/admin/accounts", label: "Accounts", icon: Landmark, resource: "accounts" },
      { href: "/admin/expenses", label: "Expenses", icon: Wallet, resource: "expenses" },
      { href: "/admin/payroll", label: "Payroll", icon: BadgeCent, resource: "payroll" },
      { href: "/admin/reports", label: "Reports", icon: BarChart3, resource: "reports" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/staff", label: "Staff", icon: Contact, resource: "staff" },
      { href: "/admin/users", label: "Users", icon: KeyRound, resource: "users" },
      { href: "/admin/audit", label: "Audit trail", icon: History, resource: "users" },
      { href: "/admin/settings", label: "Settings", icon: Settings, resource: "settings" },
      { href: "/admin/help", label: "Manual", icon: BookOpen, resource: "admin" },
    ],
  },
];

export interface ShiftStatus {
  openedBy: string;
  stale: boolean;
}

interface AdminShellProps {
  user: { name: string; email: string; role: UserRole };
  /** The till's open shift, if any — shown in the top bar on every screen. */
  shift: ShiftStatus | null;
  children: React.ReactNode;
}

export default function AdminShell({ user, shift, children }: AdminShellProps) {
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
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  const nav = (
    <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-6">
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
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      background: current ? "var(--s-brand-soft)" : "transparent",
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

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = user.role.toLowerCase().replaceAll("_", " ");

  const tillLink = canAccess(user.role, "pos") ? (
    <div className="px-3 pt-3 pb-1 shrink-0">
      <Link
        href="/pos"
        onClick={() => setDrawerOpen(false)}
        className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold"
        style={{
          background: "color-mix(in srgb, var(--s-brand) 12%, transparent)",
          borderColor: "color-mix(in srgb, var(--s-brand) 35%, transparent)",
          color: "var(--s-brand)",
        }}
      >
        <Store className="w-4 h-4 shrink-0" />
        Open the till
      </Link>
    </div>
  ) : null;

  const current = SECTIONS.flatMap((section) => section.items).find((item) => isCurrent(item.href));

  const shiftPill = (
    <Link
      href="/admin/cash-up?period=today"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold"
      style={{ borderColor: "var(--s-border)", background: "var(--s-panel)" }}
      title={shift ? `Opened by ${shift.openedBy}` : "No shift is open"}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: !shift ? "var(--s-ink-faint)" : shift.stale ? "var(--s-warn)" : "var(--s-good)" }}
        aria-hidden
      />
      {!shift ? "Till closed" : shift.stale ? "Old shift still open" : `Till open · ${shift.openedBy}`}
    </Link>
  );

  const sidebarFooter = (
    <div className="shrink-0 space-y-2 border-t px-3 py-3" style={{ borderColor: "var(--s-border)" }}>
      <InstallPrompt compact />
      <div className="flex items-center gap-3 px-2 py-1">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: "var(--s-brand)" }}
        >
          {initials || "A"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs truncate capitalize" style={{ color: "var(--s-ink-faint)" }}>
            {roleLabel}
          </p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
        style={{ color: "var(--s-ink-muted)" }}
      >
        <LogOut className="w-[1.15rem] h-[1.15rem] shrink-0" />
        Sign out
      </button>
    </div>
  );

  const brand = (
    <div className="shrink-0 px-4 pt-5 pb-3">
      <AnisLogo priority className="h-9 w-auto" />
      <p
        className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "var(--s-ink-faint)" }}
      >
        Back office
      </p>
    </div>
  );

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden">
      {/* Desktop sidebar — pinned; the main column scrolls. */}
      <aside
        data-admin-chrome
        className="hidden lg:flex w-64 shrink-0 flex-col border-r"
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        {brand}
        {tillLink}
        {nav}
        {sidebarFooter}
      </aside>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="relative flex h-full w-72 max-w-[85vw] flex-col border-r overscroll-contain"
            style={{
              background: "var(--s-panel)",
              borderColor: "var(--s-border)",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex shrink-0 items-start justify-between pr-2">
              {brand}
              <button
                onClick={() => setDrawerOpen(false)}
                className="mt-4 h-11 w-11 flex items-center justify-center rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {tillLink}
            {nav}
            {sidebarFooter}
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          data-admin-chrome
          className="hidden shrink-0 lg:flex h-20 items-center gap-4 border-b px-7"
          style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--s-ink-faint)" }}>
            Back office
            {current && current.href !== "/admin" && (
              <>
                <span className="mx-2">/</span>
                <span className="font-bold" style={{ color: "var(--s-ink)" }}>{current.label}</span>
              </>
            )}
          </p>
          <div className="ml-auto">{shiftPill}</div>
          <div className="text-right">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="text-[10px] capitalize" style={{ color: "var(--s-ink-faint)" }}>{roleLabel}</p>
          </div>
        </header>

        <header
          data-admin-chrome
          className="lg:hidden sticky top-0 z-40 flex shrink-0 items-center gap-2 border-b px-2 py-2"
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
          <span className="ml-auto pr-1">{shiftPill}</span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-6 lg:px-8 lg:py-8" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
