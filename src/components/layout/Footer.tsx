"use client";

/**
 * Site footer: brand, nav links, address, hours, phone, newsletter, and order links.
 */
import Link from "next/link";
import { Phone, MapPin, Clock, Instagram, Facebook, MessageCircle, Video } from "lucide-react";
import { BUSINESS_INFO, NAVIGATION_ITEMS } from "@/lib/constants";
import LiveOpenStatus from "@/components/ui/LiveOpenStatus";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-black text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">

          {/* Brand Brand & Info */}
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="inline-block">
              <div className="flex flex-col font-heading">
                <span className="text-3xl sm:text-4xl font-extrabold text-white lowercase leading-none flex items-center">
                  anis
                  <span className="inline-block w-2.5 h-2.5 bg-accent-orange rounded-full ml-1.5" />
                </span>
                <span className="mt-1 text-[10px] font-bold tracking-[0.24em] uppercase text-gray-300">
                  Food & Drink
                </span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              {BUSINESS_INFO.tagline}. We bring the authentic taste of Ghana to your table with love and passion.
            </p>
            <div className="flex gap-4 pt-2">
              <SocialLink href={BUSINESS_INFO.socialMedia.instagram} icon={<Instagram className="w-5 h-5" />} label="Instagram" />
              <SocialLink href={BUSINESS_INFO.socialMedia.facebook} icon={<Facebook className="w-5 h-5" />} label="Facebook" />
              <SocialLink href={BUSINESS_INFO.socialMedia.whatsapp} icon={<MessageCircle className="w-5 h-5" />} label="WhatsApp" color="hover:bg-green-600" />
              <SocialLink href={BUSINESS_INFO.socialMedia.tiktok} icon={<Video className="w-5 h-5" />} label="TikTok" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-heading font-semibold mb-6 text-white">Explore</h3>
            <ul className="space-y-4">
              {NAVIGATION_ITEMS.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-primary-red transition-colors text-sm font-heading font-medium block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-3">
            <h3 className="text-lg font-heading font-semibold mb-6 text-white">Visit Us</h3>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-primary-red mt-1 shrink-0" />
                <span className="text-gray-400 text-sm leading-relaxed">{BUSINESS_INFO.address}</span>
              </li>
              <li className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-primary-red mt-1 shrink-0" />
                <LiveOpenStatus variant="card" className="text-gray-400 text-sm" />
              </li>
              <li className="flex items-start gap-4">
                <Phone className="w-5 h-5 text-primary-red mt-1 shrink-0" />
                <div className="text-gray-400 text-sm space-y-1">
                  <a href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`} className="block hover:text-white">
                    {BUSINESS_INFO.phone}
                  </a>
                  <a href={`tel:${BUSINESS_INFO.phoneSecondary.replace(/\s/g, "")}`} className="block hover:text-white">
                    {BUSINESS_INFO.phoneSecondary} <span className="text-gray-500">(WhatsApp)</span>
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Order */}
          <div className="lg:col-span-3">
            <h3 className="text-lg font-heading font-semibold mb-6 text-white">Order Online</h3>
            <div className="flex flex-col gap-2">
              <a
                href={BUSINESS_INFO.deliveryPlatforms.boltFood}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-accent-orange transition-colors flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                Order on Bolt Food
              </a>
              <Link
                href="/order"
                className="text-sm text-gray-400 hover:text-accent-orange transition-colors flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                Order via WhatsApp
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-center md:justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} Anis Food and Drink. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-gray-500 hover:text-white text-sm">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-white text-sm">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon, label, color = "hover:bg-primary-red" }: { href: string | null, icon: React.ReactNode, label: string, color?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 ${color} hover:text-white transition-all duration-300`}
      aria-label={label}
    >
      {icon}
    </a>
  );
}

