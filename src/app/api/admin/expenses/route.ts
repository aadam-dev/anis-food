import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { roundMoney } from "@/lib/money";

const createSchema = z.object({
  categoryId: z.string().min(1, "Pick a category"),
  description: z.string().min(1, "Say what it was for").max(200),
  amount: z.number().min(0.01, "Enter an amount").max(1000000),
  incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMethod: z
    .enum(["CASH", "MOMO", "CARD", "BANK_TRANSFER"])
    .default("CASH"),
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
