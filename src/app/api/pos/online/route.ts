import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { handlePrismaError } from "@/lib/api-utils";
import { serialiseOrder } from "@/lib/serialise-order";
import { OrderSource, OrderStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

/**
 * Website orders nobody has accepted yet. The till asks every few seconds and
 * keeps alerting until each one is accepted, so none can be missed.
 */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;
  try {
    const orders = await prisma.order.findMany({
      where: {
        isDemo: false,
        source: OrderSource.ONLINE,
        acceptedAt: null,
        status: { not: OrderStatus.CANCELLED },
      },
      orderBy: { createdAt: "asc" },
      include: { items: true },
      take: 50,
    });
    return NextResponse.json(
      { orders: orders.map(serialiseOrder) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handlePrismaError(error, "pos/online GET");
  }
}
