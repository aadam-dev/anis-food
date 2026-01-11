import Link from "next/link";
import { Phone, MapPin, Clock, Instagram, Facebook, MessageCircle } from "lucide-react";
import { BUSINESS_INFO, NAVIGATION_ITEMS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-[#1F2937] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-2xl font-bold lowercase">
                anis
                <span className="inline-block w-2 h-2 bg-[#F97316] rounded-full ml-1"></span>
              </span>
              <div className="bg-[#DC2626] px-2 py-0.5 text-xs font-semibold rounded-sm transform -skew-x-12 inline-block mt-1">
                FOOD AND DRINK
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              {BUSINESS_INFO.tagline}
            </p>
            <div className="flex space-x-4">
              {BUSINESS_INFO.socialMedia.instagram && (
                <a
                  href={BUSINESS_INFO.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#DC2626] transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {BUSINESS_INFO.socialMedia.facebook && (
                <a
                  href={BUSINESS_INFO.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#DC2626] transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {BUSINESS_INFO.socialMedia.whatsapp && (
                <a
                  href={BUSINESS_INFO.socialMedia.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#10B981] transition-colors"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {NAVIGATION_ITEMS.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-[#DC2626] transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
                <a
                  href={`tel:${BUSINESS_INFO.phone}`}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {BUSINESS_INFO.phone}
                </a>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 text-sm">{BUSINESS_INFO.address}</span>
              </li>
              <li className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
                <div className="text-gray-400 text-sm">
                  <p>Mon-Fri: {BUSINESS_INFO.hours.weekdays}</p>
                  <p>Sat-Sun: {BUSINESS_INFO.hours.weekends}</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Order Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Order Now</h3>
            <p className="text-gray-400 text-sm mb-4">
              Order directly from us or through our delivery partners
            </p>
            <div className="space-y-2">
              <a
                href={BUSINESS_INFO.deliveryPlatforms.boltFood}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gray-400 hover:text-[#DC2626] transition-colors"
              >
                Order on Bolt Food →
              </a>
              <Link
                href="/order"
                className="block text-sm text-gray-400 hover:text-[#DC2626] transition-colors"
              >
                Order via WhatsApp →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <p className="text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} Anis Food and Drink. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

