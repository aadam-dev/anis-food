"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, ShoppingCart } from "lucide-react";
import Navigation from "./Navigation";
import Button from "@/components/ui/Button";
import { BUSINESS_INFO, NAVIGATION_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-black lowercase">
                anis
                <span className="inline-block w-2 h-2 bg-[#F97316] rounded-full ml-1"></span>
              </span>
              <div className="bg-[#DC2626] text-white px-2 py-0.5 text-xs font-semibold rounded-sm transform -skew-x-12">
                FOOD AND DRINK
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Navigation />
            <a
              href={`tel:${BUSINESS_INFO.phone}`}
              className="flex items-center space-x-2 text-gray-700 hover:text-[#DC2626] transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span className="text-sm font-medium">{BUSINESS_INFO.phone}</span>
            </a>
            <Link href="/order">
              <Button variant="success" size="sm">
                <ShoppingCart className="w-4 h-4 mr-2 inline" />
                Order Now
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-700 hover:text-[#DC2626] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-base font-medium text-gray-700 hover:text-[#DC2626] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <a
                href={`tel:${BUSINESS_INFO.phone}`}
                className="flex items-center space-x-2 text-gray-700 hover:text-[#DC2626] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Phone className="w-5 h-5" />
                <span>{BUSINESS_INFO.phone}</span>
              </a>
              <Link href="/order" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="success" size="md" fullWidth>
                  <ShoppingCart className="w-4 h-4 mr-2 inline" />
                  Order Now
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

