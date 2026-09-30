import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { toMoney } from "@/lib/money";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(16).default("unit"),
  stock: z.number().min(0).max(1_000_000).default(0),
  lowStock: z.number().min(0).max(1_000_000).default(0),
  costPerUnit: z.number().min(0).max(1_000_000).optional(),
});

function serialise(item: {
  id: string;
  name: string;
  unit: string;
  stock: unknown;
  lowStock: unknown;
  costPerUnit: unknown;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    stock: Number(item.stock),
    lowStock: Number(item.lowStock),
    costPerUnit: item.costPerUnit === null ? null : toMoney(item.costPerUnit),
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    low: Number(item.stock) <= Number(item.lowStock),
  };
}

export async function GET() {
  const auth = await requireResource("inventory");
  if (auth instanceof NextResponse) return auth;

  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return ok({ items: items.map(serialise) });
  } catch (error) {
    return handlePrismaError(error, "admin/inventory GET");
  }
}

export async function POST(request: Request) {
  const auth = await requireResource("inventory");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const last = await prisma.inventoryItem.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const item = await prisma.inventoryItem.create({
      data: {
        name: body.name,
        unit: body.unit,
        stock: body.stock,
        lowStock: body.lowStock,
        costPerUnit: body.costPerUnit,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        // Opening balance recorded as a movement, so history starts complete.
        movements:
          body.stock > 0
            ? { create: { type: "RECEIVE", quantity: body.stock, reason: "Opening balance", createdBy: auth.user.sub } }
            : undefined,
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "inventory.create",
      resource: "InventoryItem",
      resourceId: item.id,
      detail: { name: item.name },
      ip: clientIp(request),
    });

    return ok({ item: serialise(item) }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/inventory POST");
  }
}
