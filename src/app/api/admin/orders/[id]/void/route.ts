import { NextResponse } from "next/server";
import { requireResource, clientIp } from "@/lib/api-auth";
import { ok, parseBody, conflict, handlePrismaError, notFound } from "@/lib/api-utils";
import { voidOrder, voidSchema } from "@/lib/order-void";

/** Voiding from the back office. Only a manager and above can do it. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, voidSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const result = await voidOrder({
      orderId: id,
      input: parsed.data,
      actorId: auth.user.sub,
      ip: clientIp(request),
      source: "admin",
    });
    if (!result.ok) {
      return result.kind === "not_found" ? notFound(result.message) : conflict(result.message);
    }
    return ok({ id: result.id, status: result.status });
  } catch (error) {
    return handlePrismaError(error, "admin/orders/[id]/void");
  }
}
