import { NextResponse } from "next/server";
import { requireResource, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError, notFound } from "@/lib/api-utils";
import { applyOrderDesk, deskSchema } from "@/lib/order-desk";

/** The same desk actions, from the back office. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, deskSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const result = await applyOrderDesk({
      orderId: id,
      input: parsed.data,
      actorId: auth.user.sub,
      ip: clientIp(request),
      source: "admin",
    });
    if (!result.ok) {
      if (result.status === 404) return notFound(result.message);
      if (result.status === 409) return conflict(result.message);
      return badRequest(result.message);
    }
    return ok({ order: result.order });
  } catch (error) {
    return handlePrismaError(error, "admin/orders/[id] PATCH");
  }
}
