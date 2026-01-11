"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import Card from "@/components/ui/Card";

// Placeholder images - in production, these would be actual images
const galleryImages = [
  { id: "1", src: "/images/gallery/food-1.jpg", alt: "Jollof Rice", category: "food" },
  { id: "2", src: "/images/gallery/food-2.jpg", alt: "Grilled Chicken", category: "food" },
  { id: "3", src: "/images/gallery/interior-1.jpg", alt: "Restaurant Interior", category: "interior" },
  { id: "4", src: "/images/gallery/food-3.jpg", alt: "Fried Rice", category: "food" },
  { id: "5", src: "/images/gallery/events-1.jpg", alt: "Event", category: "events" },
  { id: "6", src: "/images/gallery/food-4.jpg", alt: "Assorted Jollof", category: "food" },
];

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filteredImages =
    filter === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.category === filter);

  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 display-font">
            Gallery
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Take a look at our delicious food, cozy atmosphere, and special events
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {["all", "food", "interior", "events"].map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === category
                  ? "bg-[#DC2626] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImages.map((image) => (
            <Card
              key={image.id}
              hover
              className="cursor-pointer overflow-hidden"
              onClick={() => setSelectedImage(image.src)}
            >
              <div className="relative h-64 bg-gradient-to-br from-[#DC2626] to-[#F97316]">
                {/* Placeholder - replace with actual images */}
                <div className="flex items-center justify-center h-full text-white text-6xl">
                  📸
                </div>
                {/* In production, use:
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                />
                */}
              </div>
            </Card>
          ))}
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
              aria-label="Close"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="relative max-w-4xl max-h-[90vh]">
              {/* Placeholder - replace with actual image */}
              <div className="bg-gray-800 rounded-lg p-12 text-white text-center">
                <p className="text-2xl">Image Preview</p>
                <p className="text-sm mt-2 text-gray-400">
                  {selectedImage} - Replace with actual image component
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Gallery images will be populated with actual photos from the restaurant. 
            Social media integration can pull images from Instagram.
          </p>
        </div>
      </div>
    </div>
  );
}

