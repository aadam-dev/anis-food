import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { canAccess, canSeeCosts } from "@/lib/permissions";
import { ok, parseBody, badRequest, notFound, handlePrismaError } from "@/lib/api-utils";
import { forbiddenStaffFields, staffUpdateSchema, toDate } from "@/lib/staff-schema";
import { roundMoney, toMoney } from "@/lib/money";

/** Edit a staff member: details, photo, pay, login link, or leaving. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("staff");
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const parsed = await parseBody(request, staffUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;
  const refused = forbiddenStaffFields(body, {
    pay: canAccess(auth.user.role, "payroll") || canSeeCosts(auth.user.role),
    logins: canAccess(auth.user.role, "users"),
  });
  if (refused) return NextResponse.json({ error: refused }, { status: 403 });

  try {
    const before = await prisma.staff.findUnique({ where: { id } });
    if (!before) return notFound("That staff member no longer exists.");
    if (body.userId) {
      const taken = await prisma.staff.findFirst({ where: { userId: body.userId, id: { not: id } }, select: { name: true } });
      if (taken) return badRequest(`That login already belongs to ${taken.name}.`);
    }
    const data = {
      ...body,
      ...(body.payRate !== undefined && { payRate: roundMoney(body.payRate) }),
      startedAt: toDate(body.startedAt),
      endedAt: toDate(body.endedAt),
    };
    const staff = await prisma.staff.update({ where: { id }, data });

    // Record what changed in words a reader can follow later.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(body) as (keyof typeof body)[]) {
      const show = (value: unknown) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === "object" && value !== null ? toMoney(value) : value;
      const from = show(before[key as keyof typeof before]);
      const to = show(staff[key as keyof typeof staff]);
      if (from !== to) changes[key] = { from, to };
    }
    if (Object.keys(changes).length > 0) {
      await logAudit({
        actorId: auth.user.sub,
        action: "staff.update",
        resource: "Staff",
        resourceId: id,
        detail: { name: staff.name, changes },
        ip: clientIp(request),
      });
    }
    return ok({ id: staff.id });
  } catch (error) {
    return handlePrismaError(error, "admin/staff/[id] PATCH");
  }
}

/** Remove a staff member entered by mistake. Anyone with payslips is kept and marked as left instead. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("staff");
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  try {
    const staff = await prisma.staff.findUnique({ where: { id }, include: { _count: { select: { payrollRecords: true } } } });
    if (!staff) return notFound("That staff member no longer exists.");
    if (staff._count.payrollRecords > 0) {
      return badRequest(`${staff.name} has payslips on record, so they cannot be deleted. Mark them as left instead.`);
    }
    await prisma.staff.delete({ where: { id } });
    await logAudit({
      actorId: auth.user.sub,
      action: "staff.delete",
      resource: "Staff",
      resourceId: id,
      detail: { name: staff.name },
      ip: clientIp(request),
    });
    return ok({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "admin/staff/[id] DELETE");
  }
}
