"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function StorySection() {
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Image Grid */}
                    <div className="relative">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative z-10 rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]"
                        >
                            <Image
                                src="/images/story-spread.png"
                                alt="Ghanaian Feast Table"
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                        </motion.div>

                        {/* Decorative elements */}
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent-orange/10 rounded-full blur-3xl z-0" />
                        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-primary-red/10 rounded-full blur-3xl z-0" />
                    </div>

                    {/* Text Content */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="text-primary-red font-bold tracking-widest uppercase text-sm">Our Story</span>
                            <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral-black mt-3 leading-tight">
                                More Than Just Food, <br />
                                It&apos;s a <span className="text-primary-red">Tradition</span>.
                            </h2>
                        </motion.div>

                        <motion.p
                            className="text-lg text-gray-600 leading-relaxed"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            At Anis Food and Drink, we believe in the power of authentic flavors. Located in the heart of Botwe, Accra, we serve dishes that remind you of home—from breakfast and pastries to full meals, plus a local bar with natural drinks and juices.
                            Our chefs use traditional recipes passed down through generations, ensuring every grain of rice and every piece of chicken carries the true essence of Ghanaian hospitality.
                        </motion.p>

                        <motion.div
                            className="grid grid-cols-2 gap-8 border-l-4 border-accent-orange pl-6 my-8"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <div>
                                <h4 className="text-3xl font-bold text-neutral-black mb-1">Since 2018</h4>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Years of Service</p>
                            </div>
                            <div>
                                <h4 className="text-3xl font-bold text-neutral-black mb-1">Local bar & more</h4>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Breakfast • Pastries • Natural drinks</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                        >
                            <Link href="/about">
                                <Button variant="outline" className="border-neutral-black text-neutral-black hover:bg-neutral-black hover:text-white">
                                    Read Our Full Story
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
