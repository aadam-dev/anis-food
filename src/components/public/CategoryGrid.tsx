import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "@/components/sections/SectionHeading";
import Reveal from "@/components/public/Reveal";

const CATEGORIES = [
  { label: "Rice Dishes", slug: "rice-dishes", image: "/images/menu/assorted-fried-rice.jpg" },
  { label: "Jollof Specials", slug: "rice-dishes", image: "/images/menu/jollof-fried-chicken.jpg" },
  { label: "Grills & Local", slug: "local-weekends-only", image: "/images/menu/grilled-chicken.jpg" },
  { label: "Noodles", slug: "noodles", image: "/images/menu/assorted-noodles.jpg" },
  { label: "Sides & Snacks", slug: "sides", image: "/images/menu/fries.jpg" },
  { label: "Drinks", slug: "drinks", image: "/images/menu/drink-on-menu.webp" },
];

export default function CategoryGrid() {
  return (
    <section className="py-24 bg-warm-alt">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <SectionHeading
            eyebrow="Explore the menu"
            title="Find your"
            highlight="craving"
            subtitle="Six ways into the menu — tap a category to see everything on it."
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat.label} delay={i * 0.05}>
              <Link
                href={`/menu?category=${cat.slug}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl"
              >
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-black/85 via-neutral-black/25 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-between gap-2 p-4 md:p-5">
                  <span className="text-white font-heading font-bold text-base md:text-lg leading-tight">
                    {cat.label}
                  </span>
                  <span className="grid place-items-center h-8 w-8 rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors group-hover:bg-primary-red">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
