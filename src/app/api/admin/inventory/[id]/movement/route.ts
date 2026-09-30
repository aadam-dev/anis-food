import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";

/**
 * Record a stock movement and move the level in one transaction, so the running
 * stock and the movement log can never drift apart. `quantity` from the client
 * is always a positive amount; the type decides the sign — except COUNT, where
 * the client sends the counted level and we store the correcting delta.
 */
const schema = z.object({
  type: z.enum(["RECEIVE", "USE", "WASTE", "COUNT", "ADJUST"]),
  quantity: z.number().min(0).max(1_000_000),
  /** For ADJUST, the sign of the change (up/down). Ignored for other types. */
  direction: z.enum(["up", "down"]).optional(),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("inventory");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id },
        select: { id: true, name: true, stock: true },
      });
      if (!item) return null;

      const current = Number(item.stock);
      let delta: number;
      switch (body.type) {
        case "RECEIVE":
          delta = body.quantity;
          break;
        case "USE":
        case "WASTE":
          delta = -body.quantity;
          break;
        case "ADJUST":
          delta = body.direction === "down" ? -body.quantity : body.quantity;
          break;
        case "COUNT":
          // quantity is the counted level; store the correction as the delta.
          delta = Number((body.quantity - current).toFixed(3));
          break;
      }

      const newStock = Number((current + delta).toFixed(3));

      await tx.inventoryMovement.create({
        data: { itemId: id, type: body.type, quantity: delta, reason: body.reason, createdBy: auth.user.sub },
      });
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { stock: newStock },
        select: { stock: true, lowStock: true },
      });

      return { name: item.name, stock: Number(updated.stock), low: Number(updated.stock) <= Number(updated.lowStock) };
    });

    if (!result) return badRequest("That item no longer exists.");

    await logAudit({
      actorId: auth.user.sub,
      action: "inventory.movement",
      resource: "InventoryItem",
      resourceId: id,
      detail: { type: body.type, quantity: body.quantity, stock: result.stock },
      ip: clientIp(request),
    });

    return ok(result);
  } catch (error) {
    return handlePrismaError(error, "admin/inventory movement POST");
  }
}
