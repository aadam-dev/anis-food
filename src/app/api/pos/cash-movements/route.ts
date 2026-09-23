import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError } from "@/lib/api-utils";
import { roundMoney, toMoney } from "@/lib/money";
import { canAccess } from "@/lib/permissions";
import { businessDay } from "@/lib/session-utils";
import { SessionStatus } from "@/generated/prisma";

/**
 * Money in or out of the drawer that is not a sale.
 *
 * The reason is required and cannot be blank. An unexplained movement is the
 * exact thing this endpoint exists to prevent: without it, "the drawer is
 * GH₵50 short" and "someone bought gas" look identical at closing time.
 *
 * When expenseCategoryId is sent and the actor may file expenses, the same
 * cash-out is also written to the expense book so the till and the books agree.
 */
const movementSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  amount: z.number().min(0.01, "Enter an amount").max(1000000),
  reason: z
    .string()
    .trim()
    .min(3, "Say what this was for — a blank reason is a hole in the day's takings")
    .max(200),
  expenseCategoryId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, movementSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  if (body.expenseCategoryId) {
    if (body.direction !== "OUT") {
      return badRequest("Only cash leaving the drawer can be filed as an expense.");
    }
    if (!canAccess(auth.user.role, "expenses")) {
      return badRequest("Your role cannot file expenses from the till.");
    }
  }

  try {
    const session = await prisma.posSession.findFirst({
      where: { status: SessionStatus.OPEN },
    });
    if (!session) {
      return conflict("No shift is open. Money can only move in or out of an open till.");
    }

    if (body.expenseCategoryId) {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: body.expenseCategoryId },
      });
      if (!category) return badRequest("That expense category is not on the books.");
    }

    const amount = roundMoney(body.amount);

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.cashMovement.create({
        data: {
          sessionId: session.id,
          direction: body.direction,
          amount,
          reason: body.reason,
          createdById: auth.user.sub,
        },
        include: { createdBy: { select: { name: true } } },
      });

      let expenseId: string | null = null;
      if (body.expenseCategoryId) {
        const expense = await tx.expense.create({
          data: {
            categoryId: body.expenseCategoryId,
            description: body.reason,
            amount,
            incurredOn: new Date(`${businessDay(session.openedAt)}T12:00:00Z`),
            paymentMethod: "CASH",
            createdById: auth.user.sub,
          },
        });
        expenseId = expense.id;
      }

      return { movement, expenseId };
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "pos.cash.movement",
      resource: "CashMovement",
      resourceId: result.movement.id,
      detail: {
        direction: body.direction,
        amount: body.amount,
        reason: body.reason,
        expenseId: result.expenseId,
      },
      ip: clientIp(request),
    });

    return ok(
      {
        movement: {
          id: result.movement.id,
          direction: result.movement.direction,
          amount: toMoney(result.movement.amount),
          reason: result.movement.reason,
          by: result.movement.createdBy.name,
          at: result.movement.createdAt.toISOString(),
        },
        expenseId: result.expenseId,
      },
      { status: 201 },
    );
  } catch (error) {
    return handlePrismaError(error, "pos/cash-movements POST");
  }
}

export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const session = await prisma.posSession.findFirst({
      where: { status: SessionStatus.OPEN },
    });
    if (!session) return badRequest("No shift is open.");

    const movements = await prisma.cashMovement.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });

    return ok({
      movements: movements.map((movement) => ({
        id: movement.id,
        direction: movement.direction,
        amount: toMoney(movement.amount),
        reason: movement.reason,
        by: movement.createdBy.name,
        at: movement.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handlePrismaError(error, "pos/cash-movements GET");
  }
}
