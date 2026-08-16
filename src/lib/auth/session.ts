import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  ROLE_REFRESH_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
} from "./jwt";

export {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  ROLE_REFRESH_SECONDS,
  signSession,
  verifySession,
  isPinFresh,
  type SessionPayload,
} from "./jwt";

/** Reads and verifies the session cookie. Returns null when not signed in. */
export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function writeSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The session a route handler should trust.
 *
 * The cookie proves who signed in; it does not prove they are still employed.
 * Every few minutes we re-read role and isActive from the database, so
 * deactivating someone or demoting them takes effect within that window rather
 * than whenever their token happens to expire. A deactivated account has its
 * cookie cleared on the spot.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const session = await readSession();
  if (!session) return null;

  const age = Date.now() / 1000 - (session.roleCheckedAt ?? 0);
  if (age < ROLE_REFRESH_SECONDS) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    await destroySession();
    return null;
  }

  const refreshed: SessionPayload = {
    ...session,
    email: user.email,
    name: user.name,
    role: user.role,
    roleCheckedAt: Math.floor(Date.now() / 1000),
  };
  await writeSessionCookie(await signSession(refreshed));
  return refreshed;
}
