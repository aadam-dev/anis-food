"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingCart, LogIn } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reservations" },
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // The header floats transparent over the dark hero on the home page, then
  // turns solid white on scroll. Every other page has a light top, so it starts
  // solid there.
  const overHero = pathname === "/" && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        overHero
          ? "bg-transparent py-4"
          : "bg-white/95 backdrop-blur-md border-b border-black/5 py-3 shadow-sm"
      }`}
    >
      <div className="container mx-auto max-w-7xl px-6 flex items-center justify-between gap-4">
        <Link href="/" aria-label="Anis Food and Drink — home" className="shrink-0">
          <Image
            src={overHero ? "/images/logo-on-dark.png" : "/images/logo.png"}
            alt="Anis Food and Drink"
            width={132}
            height={100}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-colors ${
                  overHero
                    ? "text-white/80 hover:text-white"
                    : active
                      ? "text-primary-red-ui"
                      : "text-neutral-black/70 hover:text-primary-red-ui"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/order"
            className="inline-flex items-center gap-2 rounded-full bg-primary-red px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-red-dark hover:scale-[1.03]"
          >
            <ShoppingCart className="h-4 w-4" /> Order
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className={`md:hidden p-2 ${overHero ? "text-white" : "text-neutral-black"}`}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-black/5 px-6 py-5 flex flex-col gap-1 shadow-lg">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2.5 text-lg font-medium text-neutral-black/80 hover:text-primary-red-ui transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/order"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-primary-red px-5 py-3 font-semibold text-white"
          >
            <ShoppingCart className="h-4 w-4" /> Order Now
          </Link>
          {/* Staff, not customers — set apart at the bottom. */}
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 border-t border-black/5 pt-4 text-sm text-neutral-gray hover:text-primary-red-ui transition-colors"
          >
            <LogIn className="h-4 w-4" /> Staff sign in
          </Link>
        </div>
      )}
    </header>
  );
}
