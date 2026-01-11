import Link from "next/link";
import Button from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-r from-[#DC2626] to-[#F97316] text-white overflow-hidden">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 display-font">
            Authentic Ghanaian Cuisine
            <span className="block text-3xl md:text-4xl lg:text-5xl mt-2">
              at Affordable Prices
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            Experience the rich flavors of Ghana right here in Botwe, Accra. 
            From our signature jollof rice to perfectly grilled chicken, 
            every dish is prepared with love and fresh ingredients.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/menu">
              <Button variant="secondary" size="lg" className="group">
                View Our Menu
                <ArrowRight className="w-5 h-5 ml-2 inline group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/order">
              <Button variant="outline" size="lg" className="bg-white/10 border-white text-white hover:bg-white hover:text-[#DC2626]">
                Order Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-white transform -skew-y-1"></div>
    </section>
  );
}

