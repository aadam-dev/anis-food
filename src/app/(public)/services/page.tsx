/**
 * Services page: banner + services section + contact CTAs.
 */
import Link from "next/link";
import { Phone } from "lucide-react";
import PageHeader from "@/components/public/PageHeader";
import ServicesSection from "@/components/sections/ServicesSection";
import { BUSINESS_INFO } from "@/lib/constants";

export const metadata = {
  title: "Our Services",
  description:
    "Dine-in, delivery, catering, and event hosting at Anis Food and Drink, Madina.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="What we offer"
        title="Our"
        highlight="services"
        subtitle="From daily meals to life's big moments — catering for every occasion and a calm space for meetings and events."
        image="/images/gallery/at-event.jpg"
      />

      <div className="bg-white">
        <ServicesSection />
      </div>

      <section className="bg-warm py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="mb-8 text-neutral-gray">
            Have a specific event or meeting in mind? Get in touch and we&apos;ll help you plan the
            food and the space.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-red px-8 py-4 font-semibold text-white transition-all hover:bg-primary-red-dark hover:scale-[1.02]"
            >
              Contact us
            </Link>
            <a
              href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary-red-ui/40 px-8 py-4 font-semibold text-primary-red-ui transition-colors hover:bg-primary-red-ui hover:text-white"
            >
              <Phone className="h-4 w-4" /> Call to inquire
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
