"use client";

/**
 * Homepage hero: full-height section with parallax background, headline, and CTAs.
 * Supports optional video background; uses next/image for LCP.
 */
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import Button from "@/components/ui/Button";
import LiveOpenStatus from "@/components/ui/LiveOpenStatus";
import { useReservationModal } from "@/contexts/ReservationModalContext";
import { BUSINESS_INFO } from "@/lib/constants";
import { ArrowRight, ShoppingCart, Calendar } from "lucide-react";

const HERO_IMAGE = "/images/hero/jollof-hero.png";

export default function Hero() {
  const { openModal: openReservationModal } = useReservationModal();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const showVideo = BUSINESS_INFO.heroVideoPath != null && BUSINESS_INFO.heroVideoPath !== "";

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neutral-black pt-20">
      {/* Grain overlay for tactile feel */}
      <div className="grain-overlay" aria-hidden />
      {/* Background Image/Video with Parallax */}
      <motion.div
        style={{ y, opacity }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-black via-transparent to-transparent z-10" />
        {showVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={HERO_IMAGE}
            className="w-full h-full object-cover"
          >
            <source src={BUSINESS_INFO.heroVideoPath!} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={HERO_IMAGE}
            alt="Delicious Jollof Rice"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
      </motion.div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-white">
        <div className="lg:w-2/3">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-primary-red/20 text-primary-red border border-primary-red/30 text-sm font-bold tracking-wider mb-6 backdrop-blur-sm">
              AUTHENTIC GHANAIAN CUISINE
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 font-heading">
              Taste the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-red to-accent-orange">Soul</span> <br />
              of Ghana
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-xl font-light leading-relaxed">
              Experience the rich, spicy, and savory flavors of West Africa. From our legendary Jollof to crispy fried yam, every bite is a celebration.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/order">
                <Button variant="primary" size="lg" className="w-full sm:w-auto text-lg px-8 py-4 shadow-xl shadow-red-900/20">
                  <ShoppingCart className="w-5 h-5 shrink-0" />
                  <span>Order Now</span>
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-lg px-8 py-4 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white border-white/20 hover:border-white"
                onClick={openReservationModal}
              >
                <Calendar className="w-5 h-5 shrink-0" />
                <span>Book a Table</span>
              </Button>
              <Link href="/menu">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-4 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white border-white/20 hover:border-white">
                  <span>View Menu</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-8 text-sm font-medium text-gray-400">
              <LiveOpenStatus className="text-white/90" variant="inline" />
              <div className="flex items-center gap-2">
                <span className="text-accent-orange">4.8/5</span>
                <span>Customer Rating</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 text-white/50"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span className="text-xs uppercase tracking-widest">Scroll</span>
      </motion.div>
    </section>
  );
}
