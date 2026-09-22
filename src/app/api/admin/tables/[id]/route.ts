import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError } from "@/lib/api-utils";
import { PaymentStatus, OrderStatus } from "@/generated/prisma";

const updateSchema = z
  .object({
    label: z.string().trim().min(1).max(20).optional(),
    zone: z.string().trim().min(1).max(40).optional(),
    seats: z.number().int().min(1).max(50).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to change");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("tables");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, updateSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const table = await prisma.restaurantTable.update({
      where: { id },
      data: parsed.data,
    });
    await logAudit({
      actorId: auth.user.sub,
      action: "table.update",
      resource: "RestaurantTable",
      resourceId: id,
      detail: parsed.data,
      ip: clientIp(request),
    });
    return ok({ table });
  } catch (error) {
    return handlePrismaError(error, "admin/tables PATCH");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("tables");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    // A table with a tab open right now can't be removed — settle it first.
    const openTab = await prisma.order.findFirst({
      where: {
        tableId: id,
        paymentStatus: PaymentStatus.PENDING,
        status: { not: OrderStatus.CANCELLED },
      },
      select: { orderNumber: true },
    });
    if (openTab) {
      return conflict("This table has an open tab. Settle it before removing the table.");
    }

    // Past orders keep their tableLabel snapshot; the FK nulls their tableId.
    await prisma.restaurantTable.delete({ where: { id } });
    await logAudit({
      actorId: auth.user.sub,
      action: "table.delete",
      resource: "RestaurantTable",
      resourceId: id,
      ip: clientIp(request),
    });
    return ok({ ok: true });
  } catch (error) {
    return handlePrismaError(error, "admin/tables DELETE");
  }
}
