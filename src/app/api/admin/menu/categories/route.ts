import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { revalidateMenu } from "@/lib/menu-data.server";

const schema = z.object({
  name: z.string().min(1).max(40),
});

export async function POST(request: Request) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  const name = parsed.data.name.trim();
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "category";

  try {
    const count = await prisma.menuCategory.count();
    let id = base;
    let n = 2;
    while (await prisma.menuCategory.findUnique({ where: { id } })) {
      id = `${base}-${n++}`;
    }
    const category = await prisma.menuCategory.create({
      data: { id, name, sortOrder: count },
    });
    revalidateMenu();
    await logAudit({
      actorId: auth.user.sub,
      action: "menu.category.create",
      resource: "MenuCategory",
      resourceId: category.id,
      detail: { name },
      ip: clientIp(request),
    });
    return ok({ id: category.id, name: category.name });
  } catch (error) {
    return handlePrismaError(error, "admin/menu/categories POST");
  }
}
