import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";
import { roundMoney } from "@/lib/money";

const createSchema = z.object({
  categoryId: z.string().min(1, "Pick a category"),
  description: z.string().min(1, "Say what it was for").max(200),
  amount: z.number().min(0.01, "Enter an amount").max(1000000),
  incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMethod: z
    .enum(["CASH", "MOMO", "CARD", "BANK_TRANSFER"])
    .default("CASH"),
  receiptUrl: z.string().url().max(500).nullish(),
});

export async function POST(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const expense = await prisma.expense.create({
      data: {
        categoryId: body.categoryId,
        description: body.description,
        amount: roundMoney(body.amount),
        incurredOn: new Date(`${body.incurredOn}T12:00:00Z`),
        paymentMethod: body.paymentMethod,
        receiptUrl: body.receiptUrl || null,
        createdById: auth.user.sub,
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "expense.create",
      resource: "Expense",
      resourceId: expense.id,
      detail: { amount: body.amount, description: body.description },
      ip: clientIp(request),
    });

    return ok({ id: expense.id }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/expenses POST");
  }
}

// Spelled out rather than createSchema.partial(): in Zod 4 a .default() still
// fires inside .optional(), which would silently reset the method to CASH.
const updateSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  description: z.string().trim().min(1).max(200).optional(),
  amount: z.number().min(0.01).max(1000000).optional(),
  incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.enum(["CASH", "MOMO", "CARD", "BANK_TRANSFER"]).optional(),
  receiptUrl: z.string().url().max(500).nullish(),
});

export async function PATCH(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, updateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { id, ...body } = parsed.data;

  try {
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { cashMovement: { select: { id: true } } },
    });
    if (!existing) return badRequest("That expense no longer exists.");
    // A spend from the till is cash that physically left the drawer: its amount,
    // day and method are fixed by the shift. Only how it is filed can change.
    const fromTill = existing.cashMovement !== null;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.categoryId && { categoryId: body.categoryId }),
        ...(body.description && { description: body.description }),
        ...(!fromTill && body.amount !== undefined && { amount: roundMoney(body.amount) }),
        ...(!fromTill && body.incurredOn && { incurredOn: new Date(`${body.incurredOn}T12:00:00Z`) }),
        ...(!fromTill && body.paymentMethod && { paymentMethod: body.paymentMethod }),
        ...(body.receiptUrl !== undefined && { receiptUrl: body.receiptUrl || null }),
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "expense.update",
      resource: "Expense",
      resourceId: expense.id,
      detail: {
        before: { amount: Number(existing.amount), description: existing.description, categoryId: existing.categoryId },
        changes: body,
      },
      ip: clientIp(request),
    });

    return ok({ id: expense.id });
  } catch (error) {
    return handlePrismaError(error, "admin/expenses PATCH");
  }
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, deleteSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    await prisma.expense.delete({ where: { id: parsed.data.id } });
    await logAudit({
      actorId: auth.user.sub,
      action: "expense.delete",
      resource: "Expense",
      resourceId: parsed.data.id,
      ip: clientIp(request),
    });
    return ok({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "admin/expenses DELETE");
  }
}
