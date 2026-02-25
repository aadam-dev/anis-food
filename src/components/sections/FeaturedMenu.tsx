"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

const FALLBACK_IMAGE = "/images/hero/jollof-hero.png";

export interface FeaturedItem {
    id: string;
    name: string;
    description: string | null;
    price: number;
    categorySlug: string;
    categoryName: string;
    imageUrl: string | null;
}

interface Props {
    items?: FeaturedItem[];
}

export default function FeaturedMenu({ items = [] }: Props) {
    const popularItems = items.slice(0, 3);

    return (
        <section className="py-24 bg-neutral-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-primary-red font-bold tracking-widest uppercase text-sm">Customer Favorites</span>
                        <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral-black mt-3">
                            Popular <span className="text-primary-red">Dishes</span>
                        </h2>
                        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                            Selected by our chefs and loved by our customers. These are the dishes you can&apos;t miss.
                        </p>
                    </motion.div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {popularItems.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="relative h-64 overflow-hidden">
                                <Image
                                    src={item.imageUrl || FALLBACK_IMAGE}
                                    alt={item.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-neutral-black shadow-md flex items-center gap-1">
                                    <Star className="w-4 h-4 text-accent-orange fill-accent-orange" />
                                    Popular
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Category + price on one row, baseline-aligned */}
                                <div className="flex justify-between items-baseline gap-3 mb-1">
                                    <span className="text-xs font-bold text-accent-orange uppercase tracking-wide shrink-0">
                                        {item.categoryName}
                                    </span>
                                    <span className="text-lg font-bold text-primary-red shrink-0 tabular-nums">
                                        {formatPrice(item.price)}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-neutral-black mb-3 group-hover:text-primary-red transition-colors line-clamp-2 leading-tight">
                                    {item.name}
                                </h3>

                                {item.description ? (
                                    <p className="text-gray-500 text-sm mb-5 line-clamp-2 leading-relaxed">
                                        {item.description}
                                    </p>
                                ) : (
                                    <p className="text-gray-500 text-sm mb-5 leading-relaxed">Authentic Ghanaian dish prepared fresh to order.</p>
                                )}

                                <Link href={`/menu?category=${item.categorySlug}#${item.id}`} className="block">
                                    <Button variant="outline" fullWidth size="md" className="group-hover:bg-primary-red group-hover:text-white group-hover:border-primary-red transition-all duration-300">
                                        <span>Order Now</span>
                                        <Plus className="w-4 h-4 shrink-0" />
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {popularItems.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
                        Popular dishes will appear here as soon as menu items are marked as available.
                    </div>
                )}

                <div className="mt-16 text-center">
                    <Link href="/menu">
                        <Button variant="primary" size="lg" className="text-lg px-8 py-3">
                            <span>View Full Menu</span>
                            <ArrowRight className="w-5 h-5 shrink-0" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
