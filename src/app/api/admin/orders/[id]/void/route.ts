import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, conflict, handlePrismaError, notFound } from "@/lib/api-utils";
import { OrderStatus, OrderEventType, PaymentStatus } from "@/generated/prisma";

/**
 * Voiding an order.
 *
 * A void is not a delete. The order stays, its total drops out of revenue
 * because the reports only count non-cancelled orders, and the reason is written
 * to the event timeline so "revenue is GH₵50 lower than the till tape" always
 * has an answer. Only a manager and above can do it.
 */
const voidSchema = z.object({
  reason: z.enum(["MISTAKE", "CUSTOMER_CANCELLED", "KITCHEN_ERROR", "DUPLICATE", "OTHER"]),
  note: z.string().max(300).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, voidSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return notFound("That order no longer exists.");
    if (order.status === OrderStatus.CANCELLED) {
      return conflict("That order is already voided.");
    }

    const voided = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          voidReason: body.reason,
          voidNote: body.note,
          voidedAt: new Date(),
          // A voided order that had been paid is now a refund owed; mark it so it
          // stops counting as takings.
          paymentStatus:
            order.paymentStatus === PaymentStatus.PAID
              ? PaymentStatus.REFUNDED
              : order.paymentStatus,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: OrderEventType.VOIDED,
          actorId: auth.user.sub,
          detail: { reason: body.reason, note: body.note ?? null } as never,
        },
      });
      return updated;
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "order.void",
      resource: "Order",
      resourceId: id,
      detail: { orderNumber: voided.orderNumber, reason: body.reason },
      ip: clientIp(request),
    });

    return ok({ id: voided.id, status: voided.status });
  } catch (error) {
    return handlePrismaError(error, "admin/orders/[id]/void");
  }
}
