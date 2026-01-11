"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center space-x-8">
      {NAVIGATION_ITEMS.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-[#DC2626]",
            pathname === item.href
              ? "text-[#DC2626] border-b-2 border-[#DC2626] pb-1"
              : "text-gray-700"
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

