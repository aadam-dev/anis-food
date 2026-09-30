import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
import InventoryClient, { type InvRow } from "./InventoryClient";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const rows: InvRow[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    stock: Number(i.stock),
    lowStock: Number(i.lowStock),
    costPerUnit: i.costPerUnit === null ? null : toMoney(i.costPerUnit),
    isActive: i.isActive,
    low: Number(i.stock) <= Number(i.lowStock),
  }));

  return <InventoryClient initialItems={rows} />;
}
