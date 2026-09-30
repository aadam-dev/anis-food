import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError, notFound, badRequest } from "@/lib/api-utils";
import { hashPassword, hashPin, isValidPin, isWeakPin } from "@/lib/auth/password";
import { canModifyUser, canAssignRole } from "@/lib/permissions";
import { SalaryType, UserRole } from "@/generated/prisma";

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().max(200).optional(),
    role: z.enum(["OWNER", "SUPER_ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER"]).optional(),
    isActive: z.boolean().optional(),
    phone: z.string().max(40).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    salaryType: z.enum(["MONTHLY", "DAILY", "HOURLY"]).optional(),
    salaryAmount: z.number().min(0).max(1000000).optional(),
    bankName: z.string().max(80).nullable().optional(),
    bankAccount: z.string().max(40).nullable().optional(),
    momoNumber: z.string().max(20).nullable().optional(),
    startedAt: z.string().max(40).nullable().optional(),
    pin: z
      .string()
      .refine(isValidPin, "A PIN must be exactly four digits")
      .refine((value) => !isWeakPin(value), "Choose a PIN that is harder to guess")
      .optional(),
    password: z.string().min(8, "A password needs at least 8 characters").max(200).optional(),
    /** When true, issue a fresh one-time password and force a change. */
    resetPassword: z.boolean().optional(),
    /** When true, clear the till PIN so the person sets a new one. */
    clearPin: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to change");

// Module scope on purpose: when the production minifier inlines
// initialPassword() into the PATCH handler it drops a same-function `const`,
// leaving a dangling reference ("alphabet is not defined") that only shows up
// in the built output, never in dev. Hoisting the alphabet keeps it alive.
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function initialPassword(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("staff");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      pinHash: true,
      passwordResetRequired: true,
      lastLoginAt: true,
      staffProfile: true,
    },
  });
  if (!user) return notFound("That account no longer exists.");
  if (!canModifyUser(auth.user.role, user.role) && auth.user.sub !== id) {
    return NextResponse.json({ error: "Only an owner can open that account." }, { status: 403 });
  }

  const profile = user.staffProfile;
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    hasPin: user.pinHash !== null,
    mustChangePassword: user.passwordResetRequired,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    phone: profile?.phone ?? "",
    notes: profile?.notes ?? "",
    salaryType: profile?.salaryType ?? "MONTHLY",
    salaryAmount: profile ? Number(profile.salaryAmount) : 0,
    bankName: profile?.bankName ?? "",
    bankAccount: profile?.bankAccount ?? "",
    momoNumber: profile?.momoNumber ?? "",
    startedAt: profile?.startedAt ? profile.startedAt.toISOString().slice(0, 10) : "",
  });
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

    if (body.role && body.role !== target.role && id === auth.user.sub) {
      return badRequest("You cannot change your own role.");
    }

    if (body.role && !canAssignRole(auth.user.role, body.role as UserRole)) {
      return badRequest("You cannot assign that role.");
    }

    // Nobody may deactivate their own account and lock themselves out mid-task.
    if (body.isActive === false && id === auth.user.sub) {
      return badRequest("You cannot deactivate your own account.");
    }

    const data: Record<string, unknown> = {};
    if (body.name) data.name = body.name.trim();
    if (body.email) data.email = body.email.trim().toLowerCase();
    if (body.role) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.clearPin) data.pinHash = null;
    if (body.pin) data.pinHash = await hashPin(body.pin);

    let newPassword: string | undefined;
    if (body.password) {
      newPassword = body.password;
      data.passwordHash = await hashPassword(body.password);
      data.passwordResetRequired = false;
    } else if (body.resetPassword) {
      newPassword = initialPassword();
      data.passwordHash = await hashPassword(newPassword);
      data.passwordResetRequired = true;
    }

    const profileData = {
      ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      ...(body.salaryType ? { salaryType: body.salaryType as SalaryType } : {}),
      ...(body.salaryAmount !== undefined ? { salaryAmount: body.salaryAmount } : {}),
      ...(body.bankName !== undefined ? { bankName: body.bankName?.trim() || null } : {}),
      ...(body.bankAccount !== undefined ? { bankAccount: body.bankAccount?.trim() || null } : {}),
      ...(body.momoNumber !== undefined ? { momoNumber: body.momoNumber?.trim() || null } : {}),
      ...(body.startedAt !== undefined
        ? { startedAt: body.startedAt ? new Date(body.startedAt) : null }
        : {}),
    };

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(Object.keys(profileData).length > 0
          ? {
              staffProfile: {
                upsert: {
                  create: profileData,
                  update: profileData,
                },
              },
            }
          : {}),
      },
    });

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
