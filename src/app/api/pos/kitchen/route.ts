import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";
import { KitchenStatus, OrderStatus, OrderEventType } from "@/generated/prisma";

/**
 * The kitchen display.
 *
 * Kitchen state is tracked apart from payment on purpose: a takeaway can be paid
 * and still cooking, a dine-in tab can be cooking long before it is settled. The
 * board shows everything not yet SERVED from the last 24h (so a forgotten order
 * never lingers forever), and voided orders drop off immediately.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const orders = await prisma.order.findMany({
      where: {
        isDemo: false,
        status: { not: OrderStatus.CANCELLED },
        kitchenStatus: { not: KitchenStatus.SERVED },
        createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        tableLabel: true,
        deliveryType: true,
        kitchenStatus: true,
        createdAt: true,
        notes: true,
        items: { select: { name: true, quantity: true, notes: true } },
      },
      take: 100,
    });

    return ok({
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        tableLabel: order.tableLabel,
        deliveryType: order.deliveryType,
        kitchenStatus: order.kitchenStatus,
        createdAt: order.createdAt.toISOString(),
        notes: order.notes,
        items: order.items,
      })),
    });
  } catch (error) {
    return handlePrismaError(error, "pos/kitchen GET");
  }
}

const patchSchema = z.object({
  orderId: z.string().min(1),
  kitchenStatus: z.enum(["QUEUED", "COOKING", "READY", "SERVED"]),
});

export async function PATCH(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, patchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { orderId, kitchenStatus } = parsed.data;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });
    if (!order) return badRequest("That order no longer exists.");

    await prisma.order.update({
      where: { id: orderId },
      data: { kitchenStatus: kitchenStatus as KitchenStatus, kitchenUpdatedAt: new Date() },
    });

    after(
      Promise.all([
        prisma.orderEvent.create({
          data: {
            orderId,
            type: OrderEventType.STATUS_CHANGED,
            actorId: auth.user.sub,
            detail: { kitchenStatus } as never,
          },
        }),
        logAudit({
          actorId: auth.user.sub,
          action: "kitchen.status",
          resource: "Order",
          resourceId: orderId,
          detail: { orderNumber: order.orderNumber, kitchenStatus },
          ip: clientIp(request),
        }),
      ]),
    );

    return ok({ ok: true });
  } catch (error) {
    return handlePrismaError(error, "pos/kitchen PATCH");
  }
}
