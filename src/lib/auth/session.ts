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
 * The session a page or route handler should trust.
 *
 * The cookie proves who signed in; it does not prove they are still employed.
 * Every few minutes we re-read role and isActive from the database, so
 * deactivating someone or demoting them takes effect within that window rather
 * than whenever their token happens to expire.
 *
 * The refreshed token is persisted back to the cookie — but only a Route Handler
 * or Server Action is allowed to write cookies, and this is also called from
 * page and layout renders, where a write throws. So the persist is best-effort:
 * the security-critical work (re-reading role/isActive and returning the fresh
 * values, or null for a deactivated account) always happens; only the cookie
 * write is skipped when we are inside a render. That just means the next render
 * re-reads from the database too, until an API call — which runs in a Route
 * Handler — persists the refreshed token. Correctness holds either way.
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
    await tryMutateCookie(() => destroySession());
    return null;
  }

  const refreshed: SessionPayload = {
    ...session,
    email: user.email,
    name: user.name,
    role: user.role,
    roleCheckedAt: Math.floor(Date.now() / 1000),
  };
  await tryMutateCookie(async () => writeSessionCookie(await signSession(refreshed)));
  return refreshed;
}

/**
 * Runs a cookie mutation, swallowing the "cookies can only be modified in a
 * Server Action or Route Handler" error that Next throws during a page render.
 * Any other error is real and rethrown.
 */
async function tryMutateCookie(mutate: () => Promise<void>): Promise<void> {
  try {
    await mutate();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("can only be modified")) return;
    throw error;
  }
}
