/**
 * Services page: full services section plus contact CTAs.
 */
import ServicesSection from "@/components/sections/ServicesSection";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { BUSINESS_INFO } from "@/lib/constants";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-8 pb-12 md:pt-12 md:pb-16 px-4 sm:px-6 lg:px-8 bg-neutral-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-neutral-black">
            Our <span className="text-primary-red">Services</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 font-body">
            From daily meals to life&apos;s big moments—catering for every occasion and a calm space for meetings and events.
          </p>
        </div>
      </section>

      <ServicesSection />

      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-600 font-body mb-8">
            Have a specific event or meeting in mind? Get in touch and we&apos;ll help you plan the food and space.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button variant="primary" size="lg" className="font-heading font-semibold w-full sm:w-auto">
                Contact us
              </Button>
            </Link>
            <a href={`tel:${BUSINESS_INFO.phone}`}>
              <Button variant="outline" size="lg" className="font-heading font-semibold w-full sm:w-auto">
                Call to inquire
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
