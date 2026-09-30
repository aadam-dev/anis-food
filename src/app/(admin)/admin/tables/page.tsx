import { prisma } from "@/lib/db";
import { loadFloor } from "@/lib/dining-floor";
import FloorClient from "./FloorClient";

export const metadata = { title: "Tables" };
export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const existing = await prisma.diningArea.count();
  if (existing === 0) {
    const area = await prisma.diningArea.create({
      data: { name: "Main floor", sortOrder: 0 },
    });
    await prisma.diningTable.createMany({
      data: [1, 2, 3, 4, 5, 6].map((n, index) => ({
        areaId: area.id,
        label: `T-${n}`,
        seats: n % 2 === 0 ? 4 : 2,
        x: 8 + (index % 3) * 28,
        y: 10 + Math.floor(index / 3) * 36,
      })),
    });
  }

  const floor = await loadFloor();
  return <FloorClient floor={floor} />;
}
