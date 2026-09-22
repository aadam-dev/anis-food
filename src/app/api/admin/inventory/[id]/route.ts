import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    unit: z.string().trim().min(1).max(16).optional(),
    lowStock: z.number().min(0).max(1_000_000).optional(),
    costPerUnit: z.number().min(0).max(1_000_000).nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to change");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("inventory");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, updateSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    await prisma.inventoryItem.update({ where: { id }, data: parsed.data });
    await logAudit({
      actorId: auth.user.sub,
      action: "inventory.update",
      resource: "InventoryItem",
      resourceId: id,
      detail: parsed.data,
      ip: clientIp(request),
    });
    return ok({ ok: true });
  } catch (error) {
    return handlePrismaError(error, "admin/inventory PATCH");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("inventory");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  try {
    // Movements cascade with the item (onDelete: Cascade).
    await prisma.inventoryItem.delete({ where: { id } });
    await logAudit({
      actorId: auth.user.sub,
      action: "inventory.delete",
      resource: "InventoryItem",
      resourceId: id,
      ip: clientIp(request),
    });
    return ok({ ok: true });
  } catch (error) {
    return handlePrismaError(error, "admin/inventory DELETE");
  }
}
