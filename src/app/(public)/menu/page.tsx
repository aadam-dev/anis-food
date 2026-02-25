/**
 * Menu page: server component that fetches menu data from DB and passes to client.
 */
import { dbGetCategories, dbGetMenuItems } from "@/lib/menu-data.server";
import MenuPageClient from "@/components/menu/MenuPageClient";

export const revalidate = 60;

export default async function MenuPage() {
  const [categories, items] = await Promise.all([
    dbGetCategories(),
    dbGetMenuItems(),
  ]);

  return <MenuPageClient categories={categories} items={items} />;
}
