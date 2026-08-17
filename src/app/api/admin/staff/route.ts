import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError, badRequest } from "@/lib/api-utils";
import { hashPassword } from "@/lib/auth/password";
import { canAssignRole } from "@/lib/permissions";
import { UserRole } from "@/generated/prisma";

const createSchema = z.object({
  name: z.string().min(1, "Enter a name").max(120),
  email: z.string().email("Enter a valid email").max(200),
  role: z.enum(["OWNER", "SUPER_ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER"]),
});

/** A readable one-time password, e.g. K7PQ-3MTX-9RAW. */
function initialPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

export async function POST(request: Request) {
  const auth = await requireResource("staff");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  // A manager must not be able to mint an owner or a super-admin — that is how a
  // "add a staff member" permission quietly becomes "take over the business".
  if (!canAssignRole(auth.user.role, body.role as UserRole)) {
    return badRequest("You cannot create an account with that role.");
  }

  try {
    const password = initialPassword();
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.trim().toLowerCase(),
        role: body.role as UserRole,
        passwordHash: await hashPassword(password),
        passwordResetRequired: true,
        staffProfile: { create: {} },
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "staff.create",
      resource: "User",
      resourceId: user.id,
      detail: { email: user.email, role: user.role },
      ip: clientIp(request),
    });

    // The one-time password is returned exactly once, for the admin to hand over.
    // It is never stored in readable form.
    return ok({ id: user.id, email: user.email, initialPassword: password }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/staff POST");
  }
}
