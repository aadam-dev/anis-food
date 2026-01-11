"use client";

import { Instagram, Facebook } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/constants";

export default function SocialFeed() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 display-font">
            Follow Our Journey
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See what's cooking! Follow us on social media for daily updates, 
            special offers, and behind-the-scenes content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Instagram Feed Placeholder - only show if Instagram link is available */}
          {BUSINESS_INFO.socialMedia.instagram ? (
            <div className="bg-gradient-to-br from-[#DC2626] to-[#F97316] rounded-xl p-8 text-white">
              <div className="flex items-center space-x-3 mb-6">
                <Instagram className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Instagram</h3>
              </div>
              <p className="mb-6 text-white/90">
                Follow us for mouth-watering food photos, 
                daily specials, and customer favorites!
              </p>
              <a
                href={BUSINESS_INFO.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-white text-[#DC2626] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <span>Follow Us</span>
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          ) : null}

          {/* Facebook Feed Placeholder - only show if Facebook link is available */}
          {BUSINESS_INFO.socialMedia.facebook ? (
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-8 text-white">
              <div className="flex items-center space-x-3 mb-6">
                <Facebook className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Facebook</h3>
              </div>
              <p className="mb-6 text-white/90">
                Like our page for updates, events, and exclusive offers. 
                Join our community of food lovers!
              </p>
              <a
                href={BUSINESS_INFO.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <span>Like Our Page</span>
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          ) : null}
        </div>

        {/* Show message if no social media links are configured */}
        {!BUSINESS_INFO.socialMedia.instagram && !BUSINESS_INFO.socialMedia.facebook && (
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Social media links will appear here once configured</p>
          </div>
        )}
      </div>
    </section>
  );
}

