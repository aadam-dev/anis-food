import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeading from "@/components/sections/SectionHeading";
import Reveal from "@/components/public/Reveal";

const SHOTS = [
  { src: "/images/gallery/food-jollof-chicken.jpg", alt: "Jollof with grilled chicken", tall: true },
  { src: "/images/gallery/food-assorted.jpg", alt: "Assorted rice platter" },
  { src: "/images/gallery/interior.webp", alt: "Inside Anis, Madina" },
  { src: "/images/gallery/food-servings.jpg", alt: "Freshly plated servings" },
  { src: "/images/gallery/at-event.jpg", alt: "Catering at an event", tall: true },
  { src: "/images/gallery/serving-event-2.jpg", alt: "Serving at an event" },
];

export default function Gallery() {
  return (
    <section className="py-24 bg-warm-alt">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <SectionHeading
            eyebrow="From the kitchen"
            title="A taste in"
            highlight="pictures"
            subtitle="Food, faces, and the room where it all happens."
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 [grid-auto-rows:11rem] md:[grid-auto-rows:14rem]">
          {SHOTS.map((shot, i) => (
            <Reveal
              key={shot.src}
              delay={i * 0.05}
              className={shot.tall ? "row-span-2" : ""}
            >
              <div className="relative h-full w-full overflow-hidden rounded-2xl group">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-neutral-black/0 transition-colors group-hover:bg-neutral-black/20" />
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 rounded-full border border-primary-red-ui/40 px-8 py-4 font-semibold text-primary-red-ui transition-colors hover:bg-primary-red-ui hover:text-white"
          >
            See the full gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
