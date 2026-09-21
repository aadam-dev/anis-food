"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus, Star } from "lucide-react";
import SectionHeading from "@/components/sections/SectionHeading";
import Reveal from "@/components/public/Reveal";
import { formatPrice } from "@/lib/utils";

const FALLBACK_IMAGE = "/images/menu/jollof-chicken-serving.jpg";

export interface FeaturedItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categorySlug: string;
  categoryName: string;
  imageUrl: string | null;
}

export default function FeaturedMenu({ items = [] }: { items?: FeaturedItem[] }) {
  const popular = items.slice(0, 6);

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <SectionHeading
            eyebrow="Customer favourites"
            title="Plates people"
            highlight="come back for"
            subtitle="Selected by our chefs and loved across Madina. Add them to your order for delivery, or find them on the table when you dine in."
          />
        </div>

        {popular.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-warm p-10 text-center text-neutral-gray">
            Popular dishes will appear here as soon as the menu is set up.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {popular.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.06}>
                <article className="group h-full bg-white rounded-2xl overflow-hidden border border-black/5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={item.imageUrl || FALLBACK_IMAGE}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-2.5 py-1 bg-accent-orange text-neutral-black text-[10px] font-bold uppercase tracking-wider rounded">
                      <Star className="w-3 h-3 fill-neutral-black" /> Popular
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-[11px] font-bold text-accent-orange uppercase tracking-wide">
                        {item.categoryName}
                      </span>
                      <span className="text-lg font-bold text-primary-red-ui tabular-nums shrink-0">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    <h3 className="text-xl font-heading font-bold text-neutral-black mb-2 leading-tight group-hover:text-primary-red-ui transition-colors line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-neutral-gray text-sm leading-relaxed line-clamp-2 mb-5">
                      {item.description || "Authentic Ghanaian dish, prepared fresh to order."}
                    </p>
                    <Link
                      href={`/menu?category=${item.categorySlug}#${item.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary-red-ui/40 px-5 py-2.5 text-sm font-semibold text-primary-red-ui transition-colors hover:bg-primary-red-ui hover:text-white"
                    >
                      Order Now <Plus className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-14 text-center">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 rounded-full bg-primary-red px-8 py-4 font-semibold text-white transition-all hover:bg-primary-red-dark hover:scale-[1.02]"
          >
            View Full Menu <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
