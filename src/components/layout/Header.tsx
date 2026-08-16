"use client";

/**
 * Site header: logo, desktop nav, phone, order CTA, and mobile drawer.
 * Uses Framer Motion for scroll state and mobile menu open/close animation.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone, ShoppingCart, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "./Navigation";
import Button from "@/components/ui/Button";
import { BUSINESS_INFO, NAVIGATION_ITEMS } from "@/lib/constants";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count: cartCount } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 border-b border-transparent transition-all duration-300 ease-in-out",
          scrolled
            ? "bg-white/95 backdrop-blur-xl shadow-sm border-gray-200/70"
            : "bg-white"
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Brand */}
            <Link
              href="/"
              className="shrink-0 flex items-center gap-2.5"
              aria-label="Anis Food and Drink - Home"
            >
              <Image
                src="/images/logo-brand.png"
                alt="Anis Food and Drink"
                width={524}
                height={398}
                unoptimized
                className="h-12 w-auto object-contain"
              />
              <span className="hidden lg:block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                Food & Drink
              </span>
            </Link>

            {/* Desktop nav + CTA */}
            <div className="hidden md:flex items-center flex-1 min-w-0 justify-between">
              <div className="ml-3 lg:ml-6 shrink-0">
                <Navigation />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/order" className="relative inline-flex shrink-0">
                  <Button
                    variant="primary"
                    size="md"
                    className="shadow-lg shadow-red-200/70 hover:shadow-red-300/70"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {cartCount > 0 ? `Order (${cartCount})` : "Order Now"}
                  </Button>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-orange px-1.5 text-xs font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2.5 text-neutral-black hover:bg-gray-50 rounded-xl transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-20 bg-black/20 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed top-20 left-0 right-0 bg-white shadow-xl z-40 md:hidden overflow-hidden rounded-b-2xl border-t border-gray-100"
            >
              <nav className="px-4 py-5 flex flex-col gap-1 font-heading">
                {NAVIGATION_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.2 }}
                  >
                    <Link
                      href={item.href}
                      className="block text-base font-semibold text-neutral-black hover:text-primary-red py-3.5 px-4 rounded-xl hover:bg-red-50/80 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="pt-4 pb-6 px-4 border-t border-gray-100 space-y-4 font-heading">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <a
                    href={`tel:${BUSINESS_INFO.phone}`}
                    className="flex items-center gap-3 text-neutral-gray hover:text-primary-red py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    <Phone className="w-5 h-5 shrink-0" />
                    <span>{BUSINESS_INFO.phone}</span>
                  </a>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pt-2"
                >
                  <Link href="/order" onClick={() => setMobileMenuOpen(false)} className="relative inline-flex w-full">
                    <Button variant="primary" className="w-full justify-center font-heading font-semibold">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {cartCount > 0 ? `Order (${cartCount})` : "Order Now"}
                    </Button>
                    {cartCount > 0 && (
                      <span className="absolute top-0 right-4 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-orange px-1.5 text-xs font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </motion.div>

                {/* Staff, not customers. Set apart at the bottom and clearly
                    labelled, so it never competes with Order Now — but it is
                    one tap away on the phone the cashier is already holding. */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="pt-3 border-t border-gray-100"
                >
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-neutral-gray hover:text-primary-red py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    <LogIn className="w-5 h-5 shrink-0" />
                    <span>Staff sign in</span>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Spacer for fixed header */}
      <div className="h-20" />
    </>
  );
}

