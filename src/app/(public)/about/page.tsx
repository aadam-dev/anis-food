import Image from "next/image";
import Link from "next/link";
import { Heart, Award, Users, CheckCircle, ArrowRight } from "lucide-react";
import PageHeader from "@/components/public/PageHeader";
import SectionHeading from "@/components/sections/SectionHeading";
import Reveal from "@/components/public/Reveal";

export const metadata = {
  title: "About Us",
  description:
    "Anis Food and Drink — authentic Ghanaian cuisine at honest prices, cooked with heart in Madina, Accra since 2018.",
};

const VALUES = [
  {
    icon: Heart,
    title: "Made with love",
    body: "Every dish is prepared with care using traditional recipes passed down through generations.",
  },
  {
    icon: Award,
    title: "Quality ingredients",
    body: "We source the freshest ingredients so every meal tastes the way it should — proper.",
  },
  {
    icon: Users,
    title: "Community focused",
    body: "Proud to be part of Madina, serving authentic Ghanaian food to our neighbours every day.",
  },
  {
    icon: CheckCircle,
    title: "Honest prices",
    body: "Great food shouldn't break the bank. Generous portions at prices everyone can afford.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="Cooked with heart in"
        highlight="Madina"
        subtitle="Serving authentic Ghanaian cuisine in the heart of Accra since 2018."
        image="/images/gallery/chef.jpg"
      />

      <section className="bg-white py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Reveal className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-xl">
                <Image
                  src="/images/gallery/interior.webp"
                  alt="Inside Anis Food and Drink"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -z-10 -left-4 -top-4 h-full w-full rounded-3xl border border-primary-red/20" />
            </Reveal>

            <Reveal delay={0.1}>
              <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary-red-ui">
                <span className="h-px w-6 bg-primary-red-ui/50" aria-hidden />
                Our story
              </span>
              <h2 className="mt-4 font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-black leading-[1.1]">
                Great food brings{" "}
                <span className="display-font italic font-medium text-primary-red">people together</span>
              </h2>
              <div className="mt-6 space-y-4 text-neutral-gray leading-relaxed">
                <p>
                  Anis Food and Drink was born from a simple passion: to bring authentic, delicious
                  Ghanaian cuisine to our community at prices everyone can afford. Since 2018 we&apos;ve
                  been a beloved spot in Madina — for breakfast, pastries, full meals, and a local bar
                  with natural drinks and juices.
                </p>
                <p>
                  Every dish is prepared using time-honoured recipes, fresh ingredients, and the
                  expertise of our chefs. From our signature jollof to perfectly grilled chicken, each
                  meal is crafted with care and served with a smile.
                </p>
              </div>
              <Link
                href="/menu"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-red px-7 py-3.5 font-semibold text-white transition-all hover:bg-primary-red-dark hover:scale-[1.02]"
              >
                Explore the menu <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-warm py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mb-14">
            <SectionHeading eyebrow="What we stand for" title="Our" highlight="values" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-black/5 bg-white p-7 transition-shadow hover:shadow-lg">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-red/10 text-primary-red-ui">
                    <v.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-bold text-neutral-black">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-gray">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
