import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/public/Reveal";

export default function StorySection() {
  return (
    <section className="py-24 bg-warm">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="relative order-last lg:order-first">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-xl">
              <Image
                src="/images/gallery/chef.jpg"
                alt="In the Anis kitchen, Madina"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="absolute -z-10 -left-4 -top-4 w-full h-full rounded-3xl border border-primary-red/20" />
          </Reveal>

          <Reveal delay={0.1}>
            <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary-red-ui">
              <span className="h-px w-6 bg-primary-red-ui/50" aria-hidden />
              Our story
            </span>
            <h2 className="mt-4 font-heading font-extrabold tracking-tight text-neutral-black leading-[1.05] text-[clamp(1.9rem,1.3rem+2.4vw,3.25rem)]">
              Cooked with heart,{" "}
              <span className="display-font italic font-medium text-primary-red">served with pride</span>
            </h2>
            <p className="mt-6 text-neutral-gray leading-relaxed">
              Anis Food and Drink started with a simple belief: Ghanaian food should taste like
              home and be within everyone&apos;s reach. From our legendary jollof to weekend grills,
              every plate is made fresh to order.
            </p>
            <p className="mt-4 text-neutral-gray leading-relaxed">
              Come sit with us in Madina, or let us bring the kitchen to you — dine in, reserve a
              table, or order for delivery any day of the week.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2 text-primary-red-ui font-semibold hover:gap-3 transition-all"
            >
              Read our full story <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
