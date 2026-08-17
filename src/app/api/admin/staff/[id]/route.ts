import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError, notFound, badRequest } from "@/lib/api-utils";
import { hashPassword } from "@/lib/auth/password";
import { canModifyUser, canAssignRole } from "@/lib/permissions";
import { UserRole } from "@/generated/prisma";

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    role: z.enum(["OWNER", "SUPER_ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER"]).optional(),
    isActive: z.boolean().optional(),
    /** When true, issue a fresh one-time password and force a change. */
    resetPassword: z.boolean().optional(),
    /** When true, clear the till PIN so the cashier sets a new one. */
    clearPin: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to change");

function initialPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("staff");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, updateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound("That account no longer exists.");

    // The privilege-escalation guard: only an owner or super-admin may touch an
    // owner or super-admin. Without it, a manager could reset an owner's password
    // and lock them out of their own business.
    if (!canModifyUser(auth.user.role, target.role)) {
      return NextResponse.json(
        { error: "Only an owner can change that account." },
        { status: 403 },
      );
    }

    if (body.role && !canAssignRole(auth.user.role, body.role as UserRole)) {
      return badRequest("You cannot assign that role.");
    }

    // Nobody may deactivate their own account and lock themselves out mid-task.
    if (body.isActive === false && id === auth.user.sub) {
      return badRequest("You cannot deactivate your own account.");
    }

    const data: Record<string, unknown> = {};
    if (body.name) data.name = body.name;
    if (body.role) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.clearPin) data.pinHash = null;

    let newPassword: string | undefined;
    if (body.resetPassword) {
      newPassword = initialPassword();
      data.passwordHash = await hashPassword(newPassword);
      data.passwordResetRequired = true;
    }

    const user = await prisma.user.update({ where: { id }, data });

    await logAudit({
      actorId: auth.user.sub,
      action: "staff.update",
      resource: "User",
      resourceId: id,
      detail: {
        changed: Object.keys(body),
        target: user.email,
      },
      ip: clientIp(request),
    });

    return ok({
      id: user.id,
      isActive: user.isActive,
      role: user.role,
      ...(newPassword ? { initialPassword: newPassword } : {}),
    });
  } catch (error) {
    return handlePrismaError(error, "admin/staff/[id] PATCH");
  }
}
