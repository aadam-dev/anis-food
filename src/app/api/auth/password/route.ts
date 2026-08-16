import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireAuth, logAudit, clientIp } from "@/lib/api-auth";
import { signSession, writeSessionCookie } from "@/lib/auth/session";
import { landingPathFor } from "@/lib/permissions";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";

/**
 * Changing your own password.
 *
 * Requires the current password even though the session already proves identity:
 * a phone left unlocked on the counter should not be enough to lock the real
 * owner out of their own account.
 */
const changeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(200, "That is too long")
    .refine((value) => !/^\s|\s$/.test(value), "Remove the space at the start or end"),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, changeSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.user.sub } });
    if (!user) return badRequest("That account no longer exists.");

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json(
        { error: "Your current password is not correct." },
        { status: 401 },
      );
    }

    if (await verifyPassword(newPassword, user.passwordHash)) {
      return badRequest("Choose a password you have not used here before.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordResetRequired: false,
      },
    });

    // Re-issue the cookie so the session reflects that the reset is cleared.
    await writeSessionCookie(
      await signSession({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleCheckedAt: Math.floor(Date.now() / 1000),
      }),
    );

    await logAudit({
      actorId: user.id,
      action: "auth.password.changed",
      resource: "User",
      resourceId: user.id,
      ip: clientIp(request),
    });

    return ok({ ok: true, redirectTo: landingPathFor(user.role) });
  } catch (error) {
    return handlePrismaError(error, "auth/password");
  }
}
