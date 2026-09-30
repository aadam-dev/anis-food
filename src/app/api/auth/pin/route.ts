import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashPin,
  isValidPin,
  isWeakPin,
  verifyPassword,
  verifyPin,
} from "@/lib/auth/password";
import { requireAuth, logAudit, clientIp } from "@/lib/api-auth";
import { signSession, writeSessionCookie } from "@/lib/auth/session";
import { landingPathFor } from "@/lib/permissions";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";

/**
 * Set or change the signed-in user's 4-digit till PIN.
 *
 * Requires the account password (or the current PIN when changing) so an
 * unlocked till cannot silently reassign someone else's sales identity.
 */
const setPinSchema = z.object({
  currentSecret: z.string().min(1, "Enter your password or current PIN").max(200),
  pin: z
    .string()
    .refine(isValidPin, "A PIN must be exactly four digits")
    .refine((value) => !isWeakPin(value), "Choose a PIN that is harder to guess"),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, setPinSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { currentSecret, pin } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.user.sub } });
    if (!user) return badRequest("That account no longer exists.");

    let allowed = await verifyPassword(currentSecret, user.passwordHash);
    if (!allowed && user.pinHash && isValidPin(currentSecret.trim())) {
      allowed = await verifyPin(currentSecret.trim(), user.pinHash);
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "Your current password or PIN is not correct." },
        { status: 401 },
      );
    }

    if (user.pinHash && (await verifyPin(pin, user.pinHash))) {
      return badRequest("Choose a PIN you are not already using.");
    }

    const now = Math.floor(Date.now() / 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: await hashPin(pin) },
    });

    await writeSessionCookie(
      await signSession({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleCheckedAt: now,
        pinVerifiedAt: now,
      }),
    );

    await logAudit({
      actorId: user.id,
      action: "auth.pin.set",
      resource: "User",
      resourceId: user.id,
      ip: clientIp(request),
    });

    return ok({ ok: true, redirectTo: landingPathFor(user.role) });
  } catch (error) {
    return handlePrismaError(error, "auth/pin");
  }
}
