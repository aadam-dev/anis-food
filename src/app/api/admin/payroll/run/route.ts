import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";
import { payLine } from "@/lib/payroll";

/**
 * A pay run: drafts for many people at once. Amounts are recomputed here from
 * the inputs — never trusted from the browser — so the payslip and the books
 * agree. Anyone who already has a record starting that day is skipped, not
 * doubled; the reply says who.
 */
const runSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ssnit: z.boolean().default(false),
  lines: z
    .array(
      z.object({
        userId: z.string().min(1),
        rate: z.number().min(0).max(1_000_000),
        units: z.number().min(0).max(744),
        salaryType: z.enum(["MONTHLY", "DAILY", "HOURLY"]),
        bonuses: z.number().min(0).max(1_000_000).default(0),
        otherDeductions: z.number().min(0).max(1_000_000).default(0),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, "Pick at least one person"),
});

export async function POST(request: Request) {
  const auth = await requireResource("payroll");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, runSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;
  if (body.periodEnd < body.periodStart) return badRequest("The period ends before it starts.");

  const periodStart = new Date(`${body.periodStart}T12:00:00Z`);
  const periodEnd = new Date(`${body.periodEnd}T12:00:00Z`);

  try {
    const existing = await prisma.payrollRecord.findMany({
      where: { periodStart, userId: { in: body.lines.map((line) => line.userId) } },
      select: { userId: true },
    });
    const skip = new Set(existing.map((row) => row.userId));

    const toCreate = body.lines.filter((line) => !skip.has(line.userId));
    const created = await prisma.$transaction(
      toCreate.map((line) => {
        const pay = payLine({ ...line, ssnit: body.ssnit });
        return prisma.payrollRecord.create({
          data: {
            userId: line.userId,
            periodStart,
            periodEnd,
            baseAmount: pay.base,
            bonuses: pay.bonuses,
            deductions: pay.deductions,
            netAmount: pay.net,
            notes: pay.note(line.note),
          },
          select: { id: true },
        });
      }),
    );

    await logAudit({
      actorId: auth.user.sub,
      action: "payroll.run",
      resource: "PayrollRecord",
      detail: { periodStart: body.periodStart, created: created.length, skipped: skip.size, ssnit: body.ssnit },
      ip: clientIp(request),
    });

    return ok({ created: created.length, skipped: [...skip] }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/payroll/run POST");
  }
}
