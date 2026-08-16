import { destroySession, readSession } from "@/lib/auth/session";
import { logAudit, clientIp } from "@/lib/api-auth";
import { ok } from "@/lib/api-utils";

export async function POST(request: Request) {
  const session = await readSession();
  await destroySession();

  if (session) {
    await logAudit({
      actorId: session.sub,
      action: "auth.logout",
      resource: "User",
      resourceId: session.sub,
      ip: clientIp(request),
    });
  }

  return ok({ ok: true });
}
