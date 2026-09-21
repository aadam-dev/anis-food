"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ShoppingCart, Calendar } from "lucide-react";
import LiveOpenStatus from "@/components/ui/LiveOpenStatus";
import { useReservationModal } from "@/contexts/ReservationModalContext";

const CATEGORY_PILLS = [
  { label: "Rice Dishes", href: "/menu?category=rice-dishes" },
  { label: "Jollof", href: "/menu?category=rice-dishes" },
  { label: "Grills", href: "/menu?category=local-weekends-only" },
  { label: "Drinks", href: "/menu?category=drinks" },
];

export interface HeroDish {
  name: string;
  priceDisplay: string;
  image: string;
}

export default function Hero({ featured }: { featured?: HeroDish }) {
  const { openModal } = useReservationModal();
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!parallaxRef.current) return;
      parallaxRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dish = featured ?? {
    name: "Signature Jollof with Grilled Chicken",
    priceDisplay: "GH₵60",
    image: "/images/menu/jollof-chicken-serving.jpg",
  };

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden pt-24 pb-16">
      <div ref={parallaxRef} className="absolute inset-0 will-change-transform">
        <div className="absolute inset-0 animate-ken-burns">
          <Image
            src="/images/hero/jollof-hero.png"
            alt="Signature jollof at Anis Food and Drink"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
      </div>

      {/* Dramatic grounding so the copy reads on any photo — the hero stays bold
          even though the rest of the site is light. */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-black/75 via-neutral-black/45 to-neutral-black" />
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-black/85 via-neutral-black/35 to-transparent" />
      <div className="grain-overlay" aria-hidden />

      <div className="relative z-10 container mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-primary-red/40 bg-primary-red/10 backdrop-blur-sm"
              style={{ animation: "heroFadeUp 0.6s ease-out 0.1s both" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
              <span className="text-white/90 text-xs font-semibold tracking-[0.2em] uppercase">
                Authentic Ghanaian Cuisine
              </span>
            </div>

            <h1
              className="font-heading font-extrabold text-white leading-[1.02] tracking-tight text-[clamp(2.75rem,1.8rem+4.5vw,5rem)] mb-6"
              style={{ animation: "heroFadeUp 0.8s ease-out 0.25s both" }}
            >
              Taste the{" "}
              <span className="display-font italic font-medium text-primary-red">Soul</span>
              <br />
              of Ghana
            </h1>

            <p
              className="text-white/75 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
              style={{ animation: "heroFadeUp 0.8s ease-out 0.4s both" }}
            >
              From legendary jollof to crispy fried yam, every plate is cooked with heart in
              Madina. Dine in, book a table, or order for delivery.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-8"
              style={{ animation: "heroFadeUp 0.8s ease-out 0.55s both" }}
            >
              <Link
                href="/order"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary-red text-white font-semibold rounded-full hover:bg-primary-red-dark transition-all hover:scale-[1.03] active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" /> Order Now
              </Link>
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/40 text-white font-medium rounded-full hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                <Calendar className="w-4 h-4" /> Book a Table
              </button>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-white/90 font-medium rounded-full hover:text-white transition-colors"
              >
                View Menu →
              </Link>
            </div>

            <div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8"
              style={{ animation: "heroFadeUp 0.8s ease-out 0.65s both" }}
            >
              {CATEGORY_PILLS.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="px-4 py-2 rounded-full text-xs font-medium border border-white/20 text-white/80 hover:border-accent-orange/60 hover:text-accent-orange bg-neutral-black/30 backdrop-blur-sm transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </div>

            <div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-white/60 text-sm"
              style={{ animation: "heroFadeUp 1s ease-out 0.9s both" }}
            >
              <LiveOpenStatus />
              <span className="hidden sm:inline text-white/20">·</span>
              <span>
                <span className="text-accent-orange font-semibold">4.8</span>/5 Customer Rating
              </span>
            </div>
          </div>

          <div
            className="relative mx-auto w-full max-w-sm lg:max-w-none hidden sm:block"
            style={{ animation: "heroFadeUp 1s ease-out 0.5s both" }}
          >
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
              <div className="relative aspect-[4/5]">
                <Image
                  src={dish.image}
                  alt={dish.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-black via-neutral-black/10 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="inline-block px-2.5 py-1 mb-3 text-[10px] font-bold uppercase tracking-wider rounded bg-accent-orange text-neutral-black">
                  Signature
                </span>
                <h2 className="text-white text-xl font-heading font-semibold mb-1 leading-tight">
                  {dish.name}
                </h2>
                <p className="text-accent-orange font-semibold text-lg">From {dish.priceDisplay}</p>
              </div>
            </div>
            <div className="absolute -z-10 -right-4 -bottom-4 w-full h-full rounded-3xl border border-primary-red/25" />
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/50 z-10"
        style={{ animation: "heroFadeUp 1s ease-out 1.2s both" }}
      >
        <span className="text-[10px] tracking-[0.25em] uppercase">Scroll</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>

      <style jsx>{`
        @keyframes heroFadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
