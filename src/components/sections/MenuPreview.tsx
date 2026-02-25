import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getPopularItems } from "@/lib/menu-data";
import { formatPrice } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export default function MenuPreview() {
  const popularItems = getPopularItems().slice(0, 3);

  return (
    <section className="py-16 bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 display-font">
            Our Popular Dishes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our most loved dishes, prepared fresh daily with authentic Ghanaian flavors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {popularItems.map((item) => (
            <Card key={item.id} hover>
              <div className="relative h-48 bg-gradient-to-br from-[#DC2626] to-[#F97316]">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white text-4xl">
                    🍽️
                  </div>
                )}
                {item.popular && (
                  <div className="absolute top-4 right-4 bg-[#10B981] text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Popular
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-baseline gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 leading-tight min-w-0">{item.name}</h3>
                  <span className="text-lg font-bold text-primary-red shrink-0 tabular-nums">{formatPrice(item.price)}</span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">{item.description}</p>
                <Link href={`/menu#${item.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <span>View</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/menu">
            <Button variant="primary" size="lg" className="group">
              <span>View Full Menu</span>
              <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

