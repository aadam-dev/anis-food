import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Clock, Instagram, Facebook, MessageCircle, LogIn } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/constants";
import { DEVELOPER_CREDIT } from "@/lib/developer-credit";

const EXPLORE = [
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reservations" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-neutral-black text-white/70">
      <div className="container mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <Image
              src="/images/logo-on-dark.png"
              alt="Anis Food and Drink"
              width={150}
              height={114}
              className="h-14 w-auto"
            />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/50">
              Authentic Ghanaian cuisine at honest prices — cooked with heart in Madina, Accra.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href={BUSINESS_INFO.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-primary-red hover:text-white"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={BUSINESS_INFO.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-primary-red hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={BUSINESS_INFO.socialMedia.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-primary-red hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <nav aria-label="Footer" className="grid content-start gap-3">
            <p className="mb-1 text-sm font-semibold text-white">Explore</p>
            {EXPLORE.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="w-fit text-sm text-white/60 transition-colors hover:text-primary-red"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="grid content-start gap-3 text-sm">
            <p className="mb-1 font-semibold text-white">Visit &amp; order</p>
            <span className="flex gap-2.5 text-white/60">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
              {BUSINESS_INFO.address}
            </span>
            <a
              href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`}
              className="flex w-fit gap-2.5 text-white/60 transition-colors hover:text-white"
            >
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
              {BUSINESS_INFO.phone}
            </a>
            <span className="flex gap-2.5 text-white/60">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
              Open daily, Mon–Sun till late
            </span>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/40 sm:flex-row">
          <span>
            © {year} {BUSINESS_INFO.name}. All rights reserved.
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-white/50 transition-colors hover:text-white"
            >
              <LogIn className="h-3.5 w-3.5" /> Staff sign in
            </Link>
            <a
              href={DEVELOPER_CREDIT.url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white/70"
            >
              {DEVELOPER_CREDIT.label}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
