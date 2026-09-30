import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/api-auth";
import { OrderStatus, OrderEventType, PaymentStatus } from "@/generated/prisma";

/**
 * Voiding an order, shared by the back office and the till.
 *
 * A void is not a delete. The order stays, its total drops out of revenue
 * because the reports only count non-cancelled orders, and the reason is written
 * to the event timeline so "revenue is GH₵50 lower than the till tape" always
 * has an answer.
 */
export const voidSchema = z.object({
  reason: z.enum(["MISTAKE", "CUSTOMER_CANCELLED", "KITCHEN_ERROR", "DUPLICATE", "OTHER"]),
  note: z.string().trim().max(300).optional(),
});

export type VoidInput = z.infer<typeof voidSchema>;

export type VoidResult =
  | { ok: true; id: string; status: OrderStatus; orderNumber: string }
  | { ok: false; kind: "not_found" | "already_voided"; message: string };

export async function voidOrder(params: {
  orderId: string;
  input: VoidInput;
  actorId: string;
  ip?: string | null;
  source: "admin" | "pos";
}): Promise<VoidResult> {
  const { orderId, input, actorId } = params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, kind: "not_found", message: "That order no longer exists." };
  if (order.status === OrderStatus.CANCELLED) {
    return { ok: false, kind: "already_voided", message: "That order is already voided." };
  }

  const note = input.note ? input.note : undefined;

  const voided = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        voidReason: input.reason,
        voidNote: note,
        voidedAt: new Date(),
        // A voided order that had been paid is now a refund owed; mark it so it
        // stops counting as takings.
        paymentStatus:
          order.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : order.paymentStatus,
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        type: OrderEventType.VOIDED,
        actorId,
        detail: { reason: input.reason, note: note ?? null, source: params.source } as never,
      },
    });
    return updated;
  });

  await logAudit({
    actorId,
    action: "order.void",
    resource: "Order",
    resourceId: orderId,
    detail: { orderNumber: voided.orderNumber, reason: input.reason, source: params.source },
    ip: params.ip ?? undefined,
  });

  return { ok: true, id: voided.id, status: voided.status, orderNumber: voided.orderNumber };
}
