import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { loadFloor } from "@/lib/dining-floor";

const patchSchema = z.object({
  kind: z.enum(["area", "table"]),
  name: z.string().min(1).max(40).optional(),
  label: z.string().min(1).max(24).optional(),
  seats: z.number().int().min(1).max(30).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  remove: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("tables");
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const parsed = await parseBody(request, patchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    if (body.kind === "area") {
      if (body.remove) {
        await prisma.diningArea.update({ where: { id }, data: { isActive: false } });
      } else if (body.name) {
        await prisma.diningArea.update({ where: { id }, data: { name: body.name.trim() } });
      }
    } else if (body.remove) {
      await prisma.diningTable.update({ where: { id }, data: { isActive: false } });
    } else {
      await prisma.diningTable.update({
        where: { id },
        data: {
          label: body.label?.trim(),
          seats: body.seats,
          x: body.x,
          y: body.y,
        },
      });
    }
    return ok(await loadFloor());
  } catch (error) {
    return handlePrismaError(error, "admin/tables PATCH");
  }
}
