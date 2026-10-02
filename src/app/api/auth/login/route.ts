import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isValidPin, verifyPassword, verifyPin } from "@/lib/auth/password";
import { signSession, writeSessionCookie } from "@/lib/auth/session";
import { landingPathFor, canAccess } from "@/lib/permissions";
import { logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError } from "@/lib/api-utils";
import { firstNameKey } from "@/lib/staff-avatar";

const loginSchema = z.object({
  email: z.string().min(1, "Enter your name").max(200),
  password: z.string().min(1, "Enter your PIN or password").max(200),
});

/**
 * Deliberately vague: never reveal whether the name, email, PIN or password was
 * the half that failed. Same message for every rejection.
 */
const REJECTION = "Name or PIN is not correct.";

/**
 * A real bcrypt hash used only to burn the same ~300ms when the account is
 * missing, so timing cannot enumerate who works here.
 */
const TIMING_EQUALISER = "$2b$12$OSP41yHdrQBW9BqeMCoTi.6X5kAKUsRtr2uyf.5y9Vt/koaHc3mjO";

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { email, password } = parsed.data;
  const pinAttempt = isValidPin(password.trim());

  try {
    const user = await findStaff(email.trim());

    if (!user) {
      if (pinAttempt) await verifyPin(password.trim(), TIMING_EQUALISER);
      else await verifyPassword(password, TIMING_EQUALISER);
      return NextResponse.json({ error: REJECTION }, { status: 401 });
    }

    let matched = false;
    let viaPin = false;

    if (pinAttempt && user.pinHash) {
      matched = await verifyPin(password.trim(), user.pinHash);
      viaPin = matched;
    }

    if (!matched) {
      matched = await verifyPassword(password, user.passwordHash);
    }

    if (!matched) {
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

    // Anyone who works the till needs a PIN. Password still works as a fallback
    // for managers, but a missing PIN sends them to set one first.
    const needsPin = canAccess(user.role, "pos") && !user.pinHash;
    const now = Math.floor(Date.now() / 1000);
    await writeSessionCookie(
      await signSession({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleCheckedAt: now,
        ...(viaPin ? { pinVerifiedAt: now } : {}),
      }),
    );

    const ip = clientIp(request);
    after(async () => {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await logAudit({
        actorId: user.id,
        action: viaPin ? "auth.login.pin" : "auth.login",
        resource: "User",
        resourceId: user.id,
        ip,
      });
    });

    const redirectTo = user.passwordResetRequired
      ? "/account/password"
      : needsPin
        ? "/account/pin"
        : landingPathFor(user.role);

    return ok({
      user: { name: user.name, email: user.email, role: user.role },
      mustChangePassword: user.passwordResetRequired,
      needsPin,
      redirectTo,
    });
  } catch (error) {
    return handlePrismaError(error, "auth/login");
  }
}

/**
 * Resolve staff by full email, or by first name when they typed only "maxwell".
 * First-name lookup is limited to active accounts so deactivated placeholders
 * never steal a live cashier's name.
 */
async function findStaff(raw: string) {
  const value = raw.toLowerCase().replace(/\s+/g, "");
  const email = value.includes("@") ? value : `${value}@anis.com`;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) return byEmail;

  // Typed a bare first name that does not match the email local-part (rare, but
  // Maudallia might one day sign as "maud" if we ever support nicknames).
  const needle = firstNameKey(raw);
  if (!needle || needle.includes("@")) return null;

  const candidates = await prisma.user.findMany({
    where: { isActive: true },
    take: 50,
  });
  return candidates.find((user) => firstNameKey(user.name) === needle) ?? null;
}
