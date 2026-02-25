"use client";

/**
 * Desktop nav links from NAVIGATION_ITEMS. Highlights current route.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1.5 lg:gap-2" aria-label="Main">
      {NAVIGATION_ITEMS.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "px-3 py-2 rounded-full text-sm font-semibold font-heading whitespace-nowrap transition-all",
            pathname === item.href
              ? "text-primary-red bg-red-50"
              : "text-neutral-gray hover:text-primary-red hover:bg-red-50/70"
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

