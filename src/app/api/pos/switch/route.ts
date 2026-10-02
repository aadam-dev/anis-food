import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isValidPin, verifyPin } from "@/lib/auth/password";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { signSession, writeSessionCookie } from "@/lib/auth/session";
import { RESOURCE_ROLES } from "@/lib/permissions";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";

const switchSchema = z.object({
  userId: z.string().min(1),
  pin: z.string().refine(isValidPin, "Enter the 4-digit PIN"),
});

/**
 * Hand the till to another cashier without a full sign-out.
 *
 * The open shop shift stays put; only the session cookie changes, so the next
 * sale's Order.staffId is the person who just unlocked.
 */
export async function POST(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, switchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { userId, pin } = parsed.data;

  try {
    if (userId === auth.user.sub) {
      return badRequest("You are already on the till.");
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        pinHash: true,
      },
    });

    const tillRoles = new Set<string>(RESOURCE_ROLES.pos);
    if (!target || !target.isActive || !tillRoles.has(target.role) || !target.pinHash) {
      return NextResponse.json(
        { error: "That person cannot take the till." },
        { status: 404 },
      );
    }

    if (!(await verifyPin(pin, target.pinHash))) {
      after(
        logAudit({
          actorId: auth.user.sub,
          action: "pos.switch.failed",
          resource: "User",
          resourceId: target.id,
          ip: clientIp(request),
          detail: { attemptedName: target.name },
        }),
      );
      return NextResponse.json({ error: "That PIN is not correct." }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    await writeSessionCookie(
      await signSession({
        sub: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
        roleCheckedAt: now,
        pinVerifiedAt: now,
      }),
    );

    after(async () => {
      await prisma.user.update({
        where: { id: target.id },
        data: { lastLoginAt: new Date() },
      });
      await logAudit({
        actorId: target.id,
        action: "pos.switch",
        resource: "User",
        resourceId: target.id,
        ip: clientIp(request),
        detail: { fromUserId: auth.user.sub, fromName: auth.user.name },
      });
    });

    return ok({
      user: { id: target.id, name: target.name, role: target.role },
    });
  } catch (error) {
    return handlePrismaError(error, "pos/switch POST");
  }
}
