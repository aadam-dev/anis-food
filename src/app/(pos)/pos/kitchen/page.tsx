import KitchenBoard from "@/components/pos/KitchenBoard";

export const metadata = { title: "Kitchen" };
export const dynamic = "force-dynamic";

/**
 * The kitchen display. Access is gated by the /pos middleware; the board pulls
 * its own data from /api/pos/kitchen, which enforces the pos permission.
 */
export default function KitchenPage() {
  return <KitchenBoard />;
}
