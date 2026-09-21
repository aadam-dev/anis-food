import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, ShoppingCart, Calendar } from "lucide-react";
import Reveal from "@/components/public/Reveal";
import { BUSINESS_INFO } from "@/lib/constants";

export default function ContactCTA() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0">
        <Image
          src="/images/gallery/restaurant-night.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-neutral-black/88" />
        <div className="grain-overlay" aria-hidden />
      </div>

      <div className="relative container mx-auto max-w-4xl px-6">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent-orange">
            <span className="h-px w-6 bg-accent-orange/60" aria-hidden />
            Come hungry
            <span className="h-px w-6 bg-accent-orange/60" aria-hidden />
          </span>
          <h2 className="mt-4 font-heading font-extrabold tracking-tight text-white leading-[1.05] text-[clamp(1.9rem,1.3rem+2.4vw,3.25rem)]">
            Ready when{" "}
            <span className="display-font italic font-medium text-primary-red">you are</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-white/70">
            Order for delivery, reserve a table, or just walk in. Whatever you&apos;re craving,
            we&apos;ve got a plate with your name on it.
          </p>

          <div className="mx-auto mt-10 grid max-w-lg grid-cols-1 gap-4 text-left sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent-orange" />
              <div>
                <p className="text-sm font-medium text-white">Find us</p>
                <p className="text-sm text-white/60">{BUSINESS_INFO.address}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent-orange" />
              <div>
                <p className="text-sm font-medium text-white">Open daily</p>
                <p className="text-sm text-white/60">Mon–Sun · till late</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/order"
              className="inline-flex items-center gap-2 rounded-full bg-primary-red px-8 py-4 font-semibold text-white transition-all hover:bg-primary-red-dark hover:scale-[1.02]"
            >
              <ShoppingCart className="h-4 w-4" /> Order for delivery
            </Link>
            <Link
              href="/reservations"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-4 font-medium text-white transition-colors hover:bg-white/10"
            >
              <Calendar className="h-4 w-4" /> Book a table
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
