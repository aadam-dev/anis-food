"use client";

/**
 * Services section: food for occasions (catering) and serene space for meetings and events.
 * Renders on homepage and services page.
 */
import { motion } from "framer-motion";
import Link from "next/link";
import { UtensilsCrossed, Calendar, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ServicesSection() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary-red font-heading font-bold tracking-widest uppercase text-sm">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral-black mt-3">
            More Than a <span className="text-primary-red">Restaurant</span>
          </h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto font-body">
            From daily dining to life&apos;s big moments—we&apos;ve got you covered with food for every occasion and a calm space for meetings and events.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Food for Occasions */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="group relative bg-neutral-50 rounded-2xl p-8 md:p-10 border border-gray-100 hover:border-primary-red/20 hover:shadow-xl transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-primary-red/10 flex items-center justify-center mb-6 group-hover:bg-primary-red/20 transition-colors">
              <UtensilsCrossed className="w-7 h-7 text-primary-red" />
            </div>
            <h3 className="text-2xl font-heading font-bold text-neutral-black mb-3">
              Food for Occasions
            </h3>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              Let Anis take care of the food for your wedding, naming ceremony, graduation, corporate event, or any celebration. We offer full catering with authentic Ghanaian dishes, flexible menus, and reliable service so you can focus on your guests.
            </p>
            <ul className="space-y-2 text-gray-600 font-body text-sm mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-red" />
                Weddings & receptions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-red" />
                Naming ceremonies & outdoorings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-red" />
                Graduations & parties
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-red" />
                Corporate events & conferences
              </li>
            </ul>
            <Link href="/contact">
              <Button variant="outline" className="font-heading font-semibold group-hover:bg-primary-red group-hover:text-white group-hover:border-primary-red transition-all">
                <span>Inquire for catering</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Button>
            </Link>
          </motion.article>

          {/* Meetings & Events Space */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative bg-neutral-50 rounded-2xl p-8 md:p-10 border border-gray-100 hover:border-accent-orange/30 hover:shadow-xl transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-accent-orange/10 flex items-center justify-center mb-6 group-hover:bg-accent-orange/20 transition-colors">
              <Calendar className="w-7 h-7 text-accent-orange" />
            </div>
            <h3 className="text-2xl font-heading font-bold text-neutral-black mb-3">
              Serene Space for Meetings & Events
            </h3>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              Need a quiet, professional space for a meeting, small workshop, or private gathering? Anis offers a serene setting away from the bustle—ideal for teams, clients, or small events. Combine your meeting with great food and refreshments.
            </p>
            <ul className="space-y-2 text-gray-600 font-body text-sm mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                Team meetings & strategy sessions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                Client presentations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                Small workshops & trainings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                Private dinners & get-togethers
              </li>
            </ul>
            <Link href="/contact">
              <Button variant="outline" className="font-heading font-semibold border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-white transition-all">
                <span>Book the space</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Button>
            </Link>
          </motion.article>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Link href="/services">
            <Button variant="ghost" className="font-heading font-semibold text-primary-red">
              <span>View all services</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
