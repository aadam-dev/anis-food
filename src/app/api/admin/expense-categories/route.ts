import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError } from "@/lib/api-utils";

/** Expense categories: the buckets the P&L groups spending into. */
const createSchema = z.object({
  name: z.string().trim().min(2, "Give it a name").max(60),
  isFixed: z.boolean().default(false),
});

export async function POST(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const clash = await prisma.expenseCategory.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    });
    if (clash) return conflict("There is already a category with that name.");
    const last = await prisma.expenseCategory.findFirst({ orderBy: { sortOrder: "desc" } });
    const category = await prisma.expenseCategory.create({
      data: { ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 1 },
    });
    await logAudit({
      actorId: auth.user.sub,
      action: "expense.category.create",
      resource: "ExpenseCategory",
      resourceId: category.id,
      detail: parsed.data,
      ip: clientIp(request),
    });
    return ok({ category: { id: category.id, name: category.name, isFixed: category.isFixed } }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/expense-categories POST");
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(60).optional(),
  isFixed: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, updateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { id, ...data } = parsed.data;

  try {
    const category = await prisma.expenseCategory.update({ where: { id }, data });
    await logAudit({
      actorId: auth.user.sub,
      action: "expense.category.update",
      resource: "ExpenseCategory",
      resourceId: id,
      detail: data,
      ip: clientIp(request),
    });
    return ok({ category: { id: category.id, name: category.name, isFixed: category.isFixed } });
  } catch (error) {
    return handlePrismaError(error, "admin/expense-categories PATCH");
  }
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, deleteSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const used = await prisma.expense.count({ where: { categoryId: parsed.data.id } });
    if (used > 0) {
      return badRequest(
        `${used} expense${used === 1 ? " is" : "s are"} filed under this category. Move them first, or rename it instead.`,
      );
    }
    await prisma.expenseCategory.delete({ where: { id: parsed.data.id } });
    await logAudit({
      actorId: auth.user.sub,
      action: "expense.category.delete",
      resource: "ExpenseCategory",
      resourceId: parsed.data.id,
      ip: clientIp(request),
    });
    return ok({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "admin/expense-categories DELETE");
  }
}
