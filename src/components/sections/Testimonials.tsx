"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: "1",
    name: "Kwame Asante",
    rating: 5,
    comment: "Best jollof rice in Accra! The grilled chicken is always perfectly cooked. Highly recommend!",
    date: "2 weeks ago",
  },
  {
    id: "2",
    name: "Ama Osei",
    rating: 5,
    comment: "Affordable prices and amazing food. The Anis Special is my go-to order. Service is always friendly!",
    date: "1 month ago",
  },
  {
    id: "3",
    name: "Kofi Mensah",
    rating: 5,
    comment: "Great value for money. The portions are generous and the food is always fresh. Will definitely order again!",
    date: "3 weeks ago",
  },
  {
    id: "4",
    name: "Efua Adjei",
    rating: 5,
    comment: "Love their fried rice! The delivery is always on time and the food arrives hot. Excellent service!",
    date: "1 week ago",
  },
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 display-font">
            What Our Customers Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from our satisfied customers
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <Card className="p-8 md:p-12">
            <div className="flex items-center justify-center mb-6">
              {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                <Star
                  key={i}
                  className="w-6 h-6 fill-[#F97316] text-[#F97316]"
                />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl text-gray-700 mb-6 text-center italic">
              "{testimonials[currentIndex].comment}"
            </blockquote>
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-lg">
                {testimonials[currentIndex].name}
              </p>
              <p className="text-gray-500 text-sm">{testimonials[currentIndex].date}</p>
            </div>
          </Card>

          {/* Navigation Buttons */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6 text-[#DC2626]" />
          </button>
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-[#DC2626]" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex
                    ? "bg-[#DC2626] w-8"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

