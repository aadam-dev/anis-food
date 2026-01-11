import Hero from "@/components/sections/Hero";
import MenuPreview from "@/components/sections/MenuPreview";
import SocialFeed from "@/components/sections/SocialFeed";
import Testimonials from "@/components/sections/Testimonials";
import LocationMap from "@/components/sections/LocationMap";

export default function Home() {
  return (
    <>
      <Hero />
      <MenuPreview />
      <SocialFeed />
      <Testimonials />
      <LocationMap />
    </>
  );
}
