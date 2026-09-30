import { Star, Quote } from "lucide-react";
import SectionHeading from "@/components/sections/SectionHeading";
import Reveal from "@/components/public/Reveal";

const REVIEWS = [
  {
    name: "Ama Serwaa",
    role: "Regular since 2022",
    quote:
      "The jollof is the best in Madina, full stop. Smoky, spicy, and the chicken is always tender. I order at least twice a week.",
  },
  {
    name: "Kwesi Mensah",
    role: "Weekend diner",
    quote:
      "Portions are huge and the price is honest. We brought the whole family for my mum's birthday and everyone left happy.",
  },
  {
    name: "Efua Boateng",
    role: "Delivery customer",
    quote:
      "Ordered on WhatsApp and it arrived hot within the hour. The assorted fried rice tasted exactly like dining in.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-warm">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <SectionHeading
            eyebrow="Loved in Madina"
            title="What our"
            highlight="guests say"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map((r, i) => (
            <Reveal key={r.name} delay={i * 0.08}>
              <figure className="h-full rounded-2xl border border-black/5 bg-white p-7 shadow-sm">
                <Quote className="h-8 w-8 text-primary-red/20" />
                <div className="mt-3 flex gap-0.5 text-accent-orange">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-accent-orange" />
                  ))}
                </div>
                <blockquote className="mt-4 text-neutral-black/80 leading-relaxed">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 border-t border-black/5 pt-4">
                  <p className="font-heading font-bold text-neutral-black">{r.name}</p>
                  <p className="text-sm text-neutral-gray">{r.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
