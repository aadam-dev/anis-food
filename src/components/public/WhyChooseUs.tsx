import { Flame, HandCoins, Bike, Utensils } from "lucide-react";
import SectionHeading from "@/components/sections/SectionHeading";
import Reveal from "@/components/public/Reveal";

const REASONS = [
  {
    icon: Flame,
    title: "Fresh & authentic",
    body: "Every plate is cooked to order with real Ghanaian recipes — no shortcuts, no reheating.",
  },
  {
    icon: HandCoins,
    title: "Honest prices",
    body: "Generous portions that don't empty your wallet. Great food should be for everyone.",
  },
  {
    icon: Bike,
    title: "Delivery across Accra",
    body: "Order from the menu and we'll bring it hot to your door, anywhere in the city.",
  },
  {
    icon: Utensils,
    title: "A place to gather",
    body: "Warm dine-in space in Madina — reserve a table for family, friends, or an event.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <SectionHeading
            eyebrow="Why Anis"
            title="More than a"
            highlight="meal"
            subtitle="What keeps Madina coming back, plate after plate."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASONS.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-black/5 bg-warm p-7 transition-shadow hover:shadow-lg">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-red/10 text-primary-red-ui">
                  <r.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-heading text-lg font-bold text-neutral-black">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-gray">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
