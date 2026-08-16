import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { UserRole } from "@/generated/prisma";

/**
 * Token signing and verification only.
 *
 * Kept free of `next/headers` and Prisma so the proxy (which runs before the
 * Node runtime is available) can verify a session without dragging the whole
 * database client into the edge bundle.
 */

export const SESSION_COOKIE = "anis_session";
/** A shift plus overrun. Long enough not to log a cashier out mid-service. */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
/** How stale a cached role may get before we re-read it from the database. */
export const ROLE_REFRESH_SECONDS = 5 * 60;

export interface SessionPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  /** When the role was last confirmed against the database (epoch seconds). */
  roleCheckedAt: number;
  /** When the till PIN was last entered (epoch seconds), if ever. */
  pinVerifiedAt?: number;
}

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and put it in .env.",
    );
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    // Expired, tampered with, or signed by a rotated secret. All mean "no session".
    return null;
  }
}

export function isPinFresh(session: SessionPayload | null, maxAgeSeconds: number): boolean {
  if (!session?.pinVerifiedAt) return false;
  return Date.now() / 1000 - session.pinVerifiedAt < maxAgeSeconds;
}
