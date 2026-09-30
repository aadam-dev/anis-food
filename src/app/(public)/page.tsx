/**
 * Homepage — rebuilt to mirror the reference site's structure in Anis's own
 * light + red identity. Server component: fetches popular items from the DB so
 * the hero's signature dish and the featured grid stay in sync with admin edits.
 */
import Hero, { type HeroDish } from "@/components/public/Hero";
import StorySection from "@/components/public/StorySection";
import FeaturedMenu, { type FeaturedItem } from "@/components/public/FeaturedMenu";
import CategoryGrid from "@/components/public/CategoryGrid";
import WhyChooseUs from "@/components/public/WhyChooseUs";
import Testimonials from "@/components/public/Testimonials";
import Gallery from "@/components/public/Gallery";
import ContactCTA from "@/components/public/ContactCTA";
import { dbGetPopularItems } from "@/lib/menu-data.server";
import { formatPrice } from "@/lib/utils";

export const revalidate = 60;

export default async function Home() {
  const popularItems = await dbGetPopularItems();

  const featured: FeaturedItem[] = popularItems.slice(0, 6).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    categorySlug: item.categorySlug,
    categoryName: item.categoryName,
    imageUrl: item.imageUrl,
  }));

  const heroDish: HeroDish | undefined = featured[0]
    ? {
        name: featured[0].name,
        priceDisplay: formatPrice(featured[0].price),
        image: featured[0].imageUrl || "/images/menu/jollof-chicken-serving.jpg",
      }
    : undefined;

  return (
    <>
      <Hero featured={heroDish} />
      <StorySection />
      <FeaturedMenu items={featured} />
      <CategoryGrid />
      <WhyChooseUs />
      <Testimonials />
      <Gallery />
      <ContactCTA />
    </>
  );
}
