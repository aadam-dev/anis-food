import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";

const createSchema = z.object({
  label: z.string().trim().min(1).max(20),
  zone: z.string().trim().min(1).max(40).default("Main"),
  seats: z.number().int().min(1).max(50).default(4),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

/** All tables, in floor order — for the back-office manager. */
export async function GET() {
  const auth = await requireResource("tables");
  if (auth instanceof NextResponse) return auth;

  try {
    const tables = await prisma.restaurantTable.findMany({
      orderBy: [{ zone: "asc" }, { sortOrder: "asc" }],
    });
    return ok({ tables });
  } catch (error) {
    return handlePrismaError(error, "admin/tables GET");
  }
}

export async function POST(request: Request) {
  const auth = await requireResource("tables");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const last = await prisma.restaurantTable.findFirst({
      where: { zone: body.zone },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const table = await prisma.restaurantTable.create({
      data: {
        label: body.label,
        zone: body.zone,
        seats: body.seats,
        sortOrder: body.sortOrder ?? (last?.sortOrder ?? 0) + 1,
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "table.create",
      resource: "RestaurantTable",
      resourceId: table.id,
      detail: { label: table.label, zone: table.zone },
      ip: clientIp(request),
    });

    return ok({ table }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/tables POST");
  }
}
