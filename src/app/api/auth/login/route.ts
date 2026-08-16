import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, writeSessionCookie } from "@/lib/auth/session";
import { landingPathFor } from "@/lib/permissions";
import { logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";

const loginSchema = z.object({
  email: z.string().min(1, "Enter your email").max(200),
  password: z.string().min(1, "Enter your password").max(200),
});

/**
 * Deliberately vague: "Email or password is not correct" never reveals whether
 * the address exists. Telling an attacker which half they got right halves the
 * work of guessing the other.
 */
const REJECTION = "Email or password is not correct.";

/**
 * A real bcrypt hash (of a throwaway string) used only to burn the same ~300ms
 * when the email does not exist. It must be a *valid* hash: bcrypt.compare
 * against a malformed one returns in under a millisecond, and that difference is
 * enough to enumerate which staff emails are real.
 */
const TIMING_EQUALISER = "$2b$12$OSP41yHdrQBW9BqeMCoTi.6X5kAKUsRtr2uyf.5y9Vt/koaHc3mjO";

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Do the same work when the account is missing, so a request for an unknown
    // email takes as long as one for a real email.
    if (!user) {
      await verifyPassword(password, TIMING_EQUALISER);
      return NextResponse.json({ error: REJECTION }, { status: 401 });
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      // after() runs once the response has been sent. Awaiting the audit write
      // here would add a database round-trip that only happens when the email is
      // real — and a measured ~0.85s gap between "wrong password" and "no such
      // account" is enough to enumerate the staff list without ever logging in.
      after(
        logAudit({
          actorId: user.id,
          action: "auth.login.failed",
          resource: "User",
          resourceId: user.id,
          ip: clientIp(request),
        }),
      );
      return NextResponse.json({ error: REJECTION }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated. Speak to Karim." },
        { status: 403 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    await writeSessionCookie(
      await signSession({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleCheckedAt: now,
      }),
    );

    // Bookkeeping, not part of signing in. Off the response path so a cashier
    // at the counter is not waiting on two extra round-trips to Paris.
    const ip = clientIp(request);
    after(async () => {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await logAudit({
        actorId: user.id,
        action: "auth.login",
        resource: "User",
        resourceId: user.id,
        ip,
      });
    });

    return ok({
      user: { name: user.name, email: user.email, role: user.role },
      // A first-time or reset password must be changed before anything else.
      mustChangePassword: user.passwordResetRequired,
      needsPin: user.role === "CASHIER" && !user.pinHash,
      redirectTo: user.passwordResetRequired
        ? "/account/password"
        : landingPathFor(user.role),
    });
  } catch (error) {
    return handlePrismaError(error, "auth/login");
  }
}
