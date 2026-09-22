import { prisma } from "@/lib/db";
import TablesClient, { type TableRow } from "./TablesClient";

export const metadata = { title: "Tables" };
export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: [{ zone: "asc" }, { sortOrder: "asc" }],
  });

  const rows: TableRow[] = tables.map((t) => ({
    id: t.id,
    label: t.label,
    zone: t.zone,
    seats: t.seats,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
  }));

  return <TablesClient initialTables={rows} />;
}
