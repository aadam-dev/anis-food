import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError, notFound, badRequest } from "@/lib/api-utils";
import { roundMoney } from "@/lib/money";
import { PayrollStatus } from "@/generated/prisma";

/**
 * Advancing a payroll record: DRAFT → APPROVED → PAID.
 *
 * The step matters because only PAID records count against profit. Approving is
 * the sign-off; paying is what actually leaves the business. Once paid, a record
 * is locked — a paid wage is history, not something to quietly edit.
 */
const patchSchema = z
  .object({
    status: z.enum(["DRAFT", "APPROVED", "PAID"]).optional(),
    // Amounts can only change while the record is still a draft.
    baseAmount: z.number().min(0).max(1_000_000).optional(),
    bonuses: z.number().min(0).max(1_000_000).optional(),
    deductions: z.number().min(0).max(1_000_000).optional(),
    notes: z.string().trim().max(300).nullish(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to change" });

const NEXT_ALLOWED: Record<string, string[]> = {
  DRAFT: ["APPROVED"],
  APPROVED: ["PAID", "DRAFT"], // can send back for a correction before it is paid
  PAID: [],
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("payroll");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, patchSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const record = await prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) return notFound("That payroll record no longer exists.");

    const body = parsed.data;

    if (!body.status) {
      if (record.status !== "DRAFT") {
        return badRequest("Only a draft can be edited. Send it back to draft first.");
      }
      const base = body.baseAmount ?? Number(record.baseAmount);
      const bonuses = body.bonuses ?? Number(record.bonuses);
      const deductions = body.deductions ?? Number(record.deductions);
      const net = roundMoney(base + bonuses - deductions);
      if (net < 0) return badRequest("Deductions cannot be more than the pay.");
      const updated = await prisma.payrollRecord.update({
        where: { id },
        data: {
          baseAmount: roundMoney(base),
          bonuses: roundMoney(bonuses),
          deductions: roundMoney(deductions),
          netAmount: net,
          ...(body.notes !== undefined && { notes: body.notes || null }),
        },
      });
      await logAudit({
        actorId: auth.user.sub,
        action: "payroll.edit",
        resource: "PayrollRecord",
        resourceId: id,
        detail: { before: Number(record.netAmount), after: net },
        ip: clientIp(request),
      });
      return ok({ id: updated.id, status: updated.status });
    }

    if (!NEXT_ALLOWED[record.status].includes(body.status)) {
      return badRequest(
        record.status === "PAID"
          ? "A paid record cannot be changed."
          : `Cannot move from ${record.status.toLowerCase()} to ${body.status.toLowerCase()}.`,
      );
    }

    const updated = await prisma.payrollRecord.update({
      where: { id },
      data: {
        status: body.status as PayrollStatus,
        paidAt: body.status === "PAID" ? new Date() : record.paidAt,
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "payroll.status",
      resource: "PayrollRecord",
      resourceId: id,
      detail: { from: record.status, to: body.status },
      ip: clientIp(request),
    });

    return ok({ id: updated.id, status: updated.status });
  } catch (error) {
    return handlePrismaError(error, "admin/payroll/[id] PATCH");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("payroll");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  try {
    const record = await prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) return notFound("That payroll record no longer exists.");
    if (record.status === "PAID") {
      return badRequest("A paid record cannot be deleted — it is part of the accounts.");
    }
    await prisma.payrollRecord.delete({ where: { id } });
    await logAudit({
      actorId: auth.user.sub,
      action: "payroll.delete",
      resource: "PayrollRecord",
      resourceId: id,
      ip: clientIp(request),
    });
    return ok({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "admin/payroll/[id] DELETE");
  }
}
