import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { loadFloor } from "@/lib/dining-floor";

const createSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("area"), name: z.string().min(1).max(40) }),
  z.object({
    kind: z.literal("table"),
    areaId: z.string().min(1),
    label: z.string().min(1).max(24),
    seats: z.number().int().min(1).max(30).default(4),
  }),
]);

export async function GET() {
  const auth = await requireResource("tables");
  if (auth instanceof NextResponse) return auth;
  try {
    return ok(await loadFloor());
  } catch (error) {
    return handlePrismaError(error, "admin/tables GET");
  }
}

export async function POST(request: Request) {
  const auth = await requireResource("tables");
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    if (parsed.data.kind === "area") {
      const count = await prisma.diningArea.count();
      const area = await prisma.diningArea.create({
        data: { name: parsed.data.name.trim(), sortOrder: count },
      });
      await logAudit({
        actorId: auth.user.sub,
        action: "tables.area.create",
        resource: "DiningArea",
        resourceId: area.id,
        detail: { name: area.name },
        ip: clientIp(request),
      });
    } else {
      const count = await prisma.diningTable.count({ where: { areaId: parsed.data.areaId } });
      const table = await prisma.diningTable.create({
        data: {
          areaId: parsed.data.areaId,
          label: parsed.data.label.trim(),
          seats: parsed.data.seats,
          x: 8 + (count % 5) * 16,
          y: 8 + Math.floor(count / 5) * 22,
        },
      });
      await logAudit({
        actorId: auth.user.sub,
        action: "tables.table.create",
        resource: "DiningTable",
        resourceId: table.id,
        detail: { label: table.label },
        ip: clientIp(request),
      });
    }
    return ok(await loadFloor());
  } catch (error) {
    return handlePrismaError(error, "admin/tables POST");
  }
}
