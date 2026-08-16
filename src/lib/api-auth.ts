import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionPayload } from "@/lib/auth/session";
import { canAccess, canSeeCosts, type Resource } from "@/lib/permissions";
import { prisma } from "@/lib/db";

/**
 * Per-route authorisation.
 *
 * The proxy already blocks the obvious cases, but it guards by URL shape alone.
 * This runs inside the handler with the real session, and is what actually keeps
 * a cashier out of the payroll. Both layers stay: the proxy is the front door,
 * this is the lock on the room.
 *
 * Usage:
 *   const auth = await requireResource("reports");
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.user is now a verified, still-active user allowed on this resource
 */

export interface AuthContext {
  user: SessionPayload;
}

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return { user };
}

export async function requireResource(
  resource: Resource,
): Promise<AuthContext | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.role, resource)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  return auth;
}

/** True when this user may be shown cost prices, margins or profit. */
export function maySeeCosts(auth: AuthContext): boolean {
  return canSeeCosts(auth.user.role);
}

export interface AuditInput {
  actorId: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  detail?: unknown;
  ip?: string | null;
}

/**
 * Writes an audit entry. Deliberately never throws: an audit failure must not
 * roll back a customer's sale. Errors are logged and swallowed.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? undefined,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? undefined,
        detail: (input.detail ?? undefined) as never,
        ip: input.ip ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", input.action, error);
  }
}

/** Best-effort client IP for the audit trail. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}
