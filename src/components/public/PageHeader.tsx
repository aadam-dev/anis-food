import Image from "next/image";

/**
 * The banner at the top of every inner page, so they open the same considered
 * way as the homepage. Sits on a dark food photo with the same eyebrow +
 * Playfair-italic accent treatment; the top padding clears the fixed header.
 */
export default function PageHeader({
  eyebrow,
  title,
  highlight,
  subtitle,
  image = "/images/gallery/food-assorted.jpg",
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  image?: string;
}) {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="absolute inset-0">
        <Image src={image} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-neutral-black/82" />
        <div className="grain-overlay" aria-hidden />
      </div>

      <div className="relative container mx-auto max-w-4xl px-6 text-center">
        <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent-orange">
          <span className="h-px w-6 bg-accent-orange/60" aria-hidden />
          {eyebrow}
          <span className="h-px w-6 bg-accent-orange/60" aria-hidden />
        </span>
        <h1 className="mt-4 font-heading font-extrabold tracking-tight text-white leading-[1.05] text-[clamp(2.25rem,1.6rem+3vw,3.75rem)]">
          {title}
          {highlight && (
            <>
              {" "}
              <span className="display-font italic font-medium text-primary-red">{highlight}</span>
            </>
          )}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/70">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
