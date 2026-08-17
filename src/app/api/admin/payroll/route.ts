import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { roundMoney } from "@/lib/money";

const createSchema = z.object({
  userId: z.string().min(1, "Pick someone"),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseAmount: z.number().min(0).max(1000000),
  bonuses: z.number().min(0).max(1000000).default(0),
  deductions: z.number().min(0).max(1000000).default(0),
  notes: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const auth = await requireResource("payroll");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const net = roundMoney(body.baseAmount + body.bonuses - body.deductions);

  try {
    const record = await prisma.payrollRecord.create({
      data: {
        userId: body.userId,
        periodStart: new Date(`${body.periodStart}T12:00:00Z`),
        periodEnd: new Date(`${body.periodEnd}T12:00:00Z`),
        baseAmount: roundMoney(body.baseAmount),
        bonuses: roundMoney(body.bonuses),
        deductions: roundMoney(body.deductions),
        netAmount: net,
        notes: body.notes,
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "payroll.create",
      resource: "PayrollRecord",
      resourceId: record.id,
      detail: { userId: body.userId, net },
      ip: clientIp(request),
    });

    return ok({ id: record.id }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/payroll POST");
  }
}
