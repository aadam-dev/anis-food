import OrderStudio from "@/components/order/OrderStudio";
import { dbGetCategories, dbGetMenuItems } from "@/lib/menu-data.server";

// Prices and sizes come from the same cached menu the till reads; an edit in
// the back office refreshes this page too.
export const revalidate = 60;

export default async function OrderPage() {
  const [categories, items] = await Promise.all([dbGetCategories(), dbGetMenuItems()]);
  return <OrderStudio categories={categories} items={items} />;
}
