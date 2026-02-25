/**
 * Homepage: hero, featured menu, services, story, Wall of Love, and social grid.
 * Server component — fetches popular items from DB so FeaturedMenu stays in sync
 * with admin changes (new dishes, images, prices).
 */
import Hero from "@/components/sections/Hero";
import FeaturedMenu from "@/components/sections/FeaturedMenu";
import Testimonials from "@/components/sections/Testimonials";
import ServicesSection from "@/components/sections/ServicesSection";
import StorySection from "@/components/sections/StorySection";
import SocialFeed from "@/components/sections/SocialFeed";
import { dbGetPopularItems } from "@/lib/menu-data.server";
import type { FeaturedItem } from "@/components/sections/FeaturedMenu";

export const revalidate = 60;

export default async function Home() {
  const popularItems = await dbGetPopularItems();

  const featured: FeaturedItem[] = popularItems.slice(0, 3).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    categorySlug: item.categorySlug,
    categoryName: item.categoryName,
    imageUrl: item.imageUrl,
  }));

  return (
    <>
      <Hero />
      <FeaturedMenu items={featured} />
      <Testimonials />
      <ServicesSection />
      <StorySection />
      <SocialFeed />
    </>
  );
}
