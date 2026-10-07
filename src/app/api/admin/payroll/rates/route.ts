import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, notFound, handlePrismaError } from "@/lib/api-utils";
import { roundMoney } from "@/lib/money";

/**
 * A staff member's pay: how they are paid, the rate, and where the money goes.
 * Kept under payroll rather than staff so salaries are only visible to the
 * people who run payroll.
 */
const rateSchema = z.object({
  userId: z.string().min(1),
  salaryType: z.enum(["MONTHLY", "DAILY", "HOURLY"]),
  salaryAmount: z.number().min(0).max(1_000_000),
  phone: z.string().trim().max(40).nullish(),
  momoNumber: z.string().trim().max(40).nullish(),
  bankName: z.string().trim().max(80).nullish(),
  bankAccount: z.string().trim().max(60).nullish(),
});

export async function PUT(request: Request) {
  const auth = await requireResource("payroll");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, rateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { userId, ...body } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return notFound("That staff member no longer exists.");

    const data = {
      salaryType: body.salaryType,
      salaryAmount: roundMoney(body.salaryAmount),
      phone: body.phone || null,
      momoNumber: body.momoNumber || null,
      bankName: body.bankName || null,
      bankAccount: body.bankAccount || null,
    };
    await prisma.staffProfile.upsert({ where: { userId }, update: data, create: { userId, ...data } });

    await logAudit({
      actorId: auth.user.sub,
      action: "payroll.rate",
      resource: "StaffProfile",
      resourceId: userId,
      detail: { salaryType: data.salaryType, salaryAmount: data.salaryAmount },
      ip: clientIp(request),
    });
    return ok({ saved: true });
  } catch (error) {
    return handlePrismaError(error, "admin/payroll/rates PUT");
  }
}
