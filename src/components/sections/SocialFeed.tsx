"use client";

import Image from "next/image";
import Link from "next/link";
import { Instagram, Facebook, Video, ExternalLink } from "lucide-react";
import { BUSINESS_INFO, SOCIAL_FEED_IMAGES } from "@/lib/constants";

const INSTAGRAM_HANDLE = "@anisfooddrink";

const PLATFORMS = [
  {
    key: "instagram",
    href: BUSINESS_INFO.socialMedia.instagram,
    label: "Instagram",
    icon: Instagram,
  },
  {
    key: "facebook",
    href: BUSINESS_INFO.socialMedia.facebook,
    label: "Facebook",
    icon: Facebook,
  },
  {
    key: "tiktok",
    href: BUSINESS_INFO.socialMedia.tiktok,
    label: "TikTok",
    icon: Video,
  },
].filter((p) => p.href);

export default function SocialFeed() {
  return (
    <section className="py-12 sm:py-14 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title + subtitle */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-black mb-2 display-font">
            Follow our journey
          </h2>
          <p className="text-sm sm:text-base text-neutral-gray max-w-lg mx-auto">
            See what we’re cooking — daily posts, specials and behind-the-scenes.
          </p>
        </div>

        {/* Instagram-style grid (hero) */}
        {SOCIAL_FEED_IMAGES.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mb-10">
            {SOCIAL_FEED_IMAGES.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
              >
                {img.href ? (
                  <Link
                    href={img.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2">
                        <ExternalLink className="w-4 h-4 text-neutral-black" />
                      </span>
                    </span>
                  </Link>
                ) : (
                  <>
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2">
                        <Instagram className="w-4 h-4 text-neutral-black" />
                      </span>
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Follow strip: one line + platform row */}
        {PLATFORMS.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-neutral-gray mb-1">
              Follow us for daily food photos, specials & more
            </p>
            <p className="text-base font-semibold text-neutral-black mb-4">
              {INSTAGRAM_HANDLE}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {PLATFORMS.map(({ key, href, label, icon: Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-neutral-black text-sm font-medium hover:border-primary-red hover:bg-primary-red hover:text-white transition-colors duration-200"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {PLATFORMS.length === 0 && (
          <p className="text-center text-sm text-neutral-gray">
            Social links will appear here once configured.
          </p>
        )}
      </div>
    </section>
  );
}
