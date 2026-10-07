import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, handlePrismaError, notFound, conflict } from "@/lib/api-utils";
import { serialiseOrder } from "@/lib/serialise-order";
import { OrderEventType, OrderSource, OrderStatus } from "@/generated/prisma";

/**
 * A cashier accepts a website order: the till stops alerting and the order
 * goes to the kitchen board. Accepting twice is harmless.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return notFound("That order no longer exists.");
    if (order.source !== OrderSource.ONLINE) return conflict("Only online orders need accepting.");
    if (order.status === OrderStatus.CANCELLED) return conflict("That order was cancelled.");
    if (order.acceptedAt) return ok({ order: serialiseOrder(order), already: true });

    const accepted = await prisma.$transaction(async (tx) => {
      const saved = await tx.order.update({
        where: { id },
        data: { acceptedAt: new Date(), kitchenUpdatedAt: new Date() },
        include: { items: true },
      });
      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: OrderEventType.STATUS_CHANGED,
          actorId: auth.user.sub,
          detail: { action: "accepted" },
        },
      });
      return saved;
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "order.accept",
      resource: "Order",
      resourceId: id,
      detail: { orderNumber: order.orderNumber },
      ip: clientIp(request),
    });
    return ok({ order: serialiseOrder(accepted) });
  } catch (error) {
    return handlePrismaError(error, "pos/orders/[id]/accept POST");
  }
}
