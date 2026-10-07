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

const updateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(40).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 1, "Nothing to change");

/** Rename, reorder, or hide a category. */
export async function PATCH(request: Request) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(request, updateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { id, ...data } = parsed.data;

  try {
    const category = await prisma.menuCategory.update({ where: { id }, data });
    revalidateMenu();
    await logAudit({
      actorId: auth.user.sub,
      action: "menu.category.update",
      resource: "MenuCategory",
      resourceId: id,
      detail: data,
      ip: clientIp(request),
    });
    return ok({ id: category.id, name: category.name });
  } catch (error) {
    return handlePrismaError(error, "admin/menu/categories PATCH");
  }
}

const deleteSchema = z.object({ id: z.string().min(1) });

/** Delete an empty category. One with dishes must be emptied first. */
export async function DELETE(request: Request) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(request, deleteSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const dishes = await prisma.menuItem.count({ where: { categoryId: parsed.data.id } });
    if (dishes > 0) {
      return NextResponse.json(
        { error: `${dishes} dish${dishes === 1 ? " is" : "es are"} in this category. Move them to another category first.` },
        { status: 400 },
      );
    }
    await prisma.menuCategory.delete({ where: { id: parsed.data.id } });
    revalidateMenu();
    await logAudit({
      actorId: auth.user.sub,
      action: "menu.category.delete",
      resource: "MenuCategory",
      resourceId: parsed.data.id,
      ip: clientIp(request),
    });
    return ok({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "admin/menu/categories DELETE");
  }
}
