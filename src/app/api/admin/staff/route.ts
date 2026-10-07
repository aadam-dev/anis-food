import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { canAccess, canSeeCosts } from "@/lib/permissions";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";
import { forbiddenStaffFields, staffSchema, toDate } from "@/lib/staff-schema";
import { roundMoney } from "@/lib/money";

/** Add someone who works here. A login is optional and linked separately. */
export async function POST(request: Request) {
  const auth = await requireResource("staff");
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(request, staffSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;
  // A new record always carries pay defaults; someone who may not set pay
  // just gets those defaults, and only a login manager may link a login.
  const mayPay = canAccess(auth.user.role, "payroll") || canSeeCosts(auth.user.role);
  if (!mayPay) {
    Object.assign(body, { payType: "MONTHLY", payRate: 0, momoNumber: null, bankName: null, bankAccount: null });
  }
  const refused = forbiddenStaffFields({ userId: body.userId }, { pay: true, logins: canAccess(auth.user.role, "users") });
  if (refused) return NextResponse.json({ error: refused }, { status: 403 });

  try {
    if (body.userId) {
      const taken = await prisma.staff.findUnique({ where: { userId: body.userId }, select: { name: true } });
      if (taken) return badRequest(`That login already belongs to ${taken.name}.`);
    }
    const staff = await prisma.staff.create({
      data: {
        ...body,
        payRate: roundMoney(body.payRate),
        startedAt: toDate(body.startedAt),
        endedAt: toDate(body.endedAt),
        userId: body.userId ?? null,
      },
    });
    await logAudit({
      actorId: auth.user.sub,
      action: "staff.create",
      resource: "Staff",
      resourceId: staff.id,
      detail: { name: staff.name, position: staff.position },
      ip: clientIp(request),
    });
    return ok({ id: staff.id }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/staff POST");
  }
}
