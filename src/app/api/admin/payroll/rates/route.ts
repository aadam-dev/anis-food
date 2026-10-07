import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, notFound, handlePrismaError } from "@/lib/api-utils";
import { roundMoney, toMoney } from "@/lib/money";

/**
 * A staff member's pay: how they are paid, the rate, and where the money goes.
 * Salaries are only visible to the people who run payroll.
 */
const rateSchema = z.object({
  staffId: z.string().min(1),
  salaryType: z.enum(["MONTHLY", "DAILY", "HOURLY"]),
  salaryAmount: z.number().min(0).max(1_000_000),
  momoNumber: z.string().trim().max(40).nullish(),
  bankName: z.string().trim().max(80).nullish(),
  bankAccount: z.string().trim().max(60).nullish(),
});

export async function PUT(request: Request) {
  const auth = await requireResource("payroll");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, rateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { staffId, ...body } = parsed.data;

  try {
    const before = await prisma.staff.findUnique({ where: { id: staffId }, select: { name: true, payType: true, payRate: true } });
    if (!before) return notFound("That staff member no longer exists.");

    const data = {
      payType: body.salaryType,
      payRate: roundMoney(body.salaryAmount),
      momoNumber: body.momoNumber || null,
      bankName: body.bankName || null,
      bankAccount: body.bankAccount || null,
    };
    await prisma.staff.update({ where: { id: staffId }, data });

    await logAudit({
      actorId: auth.user.sub,
      action: "payroll.rate",
      resource: "Staff",
      resourceId: staffId,
      detail: {
        name: before.name,
        from: { type: before.payType, rate: toMoney(before.payRate) },
        to: { type: data.payType, rate: data.payRate },
      },
      ip: clientIp(request),
    });
    return ok({ saved: true });
  } catch (error) {
    return handlePrismaError(error, "admin/payroll/rates PUT");
  }
}
