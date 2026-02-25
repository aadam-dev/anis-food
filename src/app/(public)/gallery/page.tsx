"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type GalleryCategory = "all" | "food" | "interior" | "events";

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: GalleryCategory;
}

const galleryImages: GalleryImage[] = [
  { id: "1", src: "/images/gallery/food-jollof-chicken.jpg", alt: "Jollof and chicken serving", category: "food" },
  { id: "2", src: "/images/gallery/food-assorted.jpg", alt: "Assorted jollof and fried chicken", category: "food" },
  { id: "3", src: "/images/gallery/food-servings.jpg", alt: "Anis servings", category: "food" },
  { id: "4", src: "/images/gallery/interior.webp", alt: "Restaurant interior", category: "interior" },
  { id: "5", src: "/images/gallery/building-view.webp", alt: "Anis building view", category: "interior" },
  { id: "6", src: "/images/gallery/customer-view.jpg", alt: "Customer view from table", category: "interior" },
  { id: "7", src: "/images/gallery/entrance-night.webp", alt: "Entrance at night", category: "interior" },
  { id: "8", src: "/images/gallery/restaurant-night.jpg", alt: "Restaurant at night", category: "interior" },
  { id: "9", src: "/images/gallery/at-event.jpg", alt: "Anis at event", category: "events" },
  { id: "10", src: "/images/gallery/serving-event-2.jpg", alt: "Serving at event", category: "events" },
  { id: "11", src: "/images/gallery/serving-event-3.jpg", alt: "Serving at event", category: "events" },
  { id: "12", src: "/images/gallery/chef.jpg", alt: "Chef at Anis", category: "events" },
  { id: "13", src: "/images/gallery/staff.webp", alt: "Anis staff", category: "events" },
];

const CATEGORIES: { value: GalleryCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "food", label: "Food" },
  { value: "interior", label: "Interior" },
  { value: "events", label: "Events" },
];

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [filter, setFilter] = useState<GalleryCategory>("all");

  const filteredImages =
    filter === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.category === filter);

  return (
    <div className="py-12 md:py-16 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-primary-red font-bold tracking-widest uppercase text-sm">
            Gallery
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 display-font mt-2">
            Our Food & Space
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A look at our dishes, atmosphere, and special moments
          </p>
        </motion.div>

        {/* Filter pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                filter === value
                  ? "bg-primary-red text-white shadow-md shadow-red-200"
                  : "bg-white text-neutral-gray border border-gray-200 hover:border-primary-red/50 hover:text-primary-red"
              )}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Grid: no basic cards, rounded tiles with hover overlay */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredImages.map((image, index) => (
              <motion.figure
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 group cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white font-semibold text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    View
                  </span>
                </div>
                <span className="absolute bottom-3 left-3 right-3 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">
                  {image.alt}
                </span>
              </motion.figure>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredImages.length === 0 && (
          <p className="text-center text-neutral-gray py-12">
            No images in this category yet.
          </p>
        )}

        {/* Lightbox with animation */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
              role="dialog"
              aria-modal="true"
              aria-label="Image preview"
            >
              <button
                type="button"
                className="absolute top-4 right-4 z-10 p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setSelectedImage(null)}
                aria-label="Close"
              >
                <X className="w-8 h-8" />
              </button>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative max-w-5xl w-full max-h-[90vh] aspect-video rounded-xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
                <p className="absolute bottom-0 left-0 right-0 py-3 px-4 bg-gradient-to-t from-black/80 to-transparent text-white text-sm font-medium text-center">
                  {selectedImage.alt}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
