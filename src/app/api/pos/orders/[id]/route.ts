import { NextResponse } from "next/server";
import { requireResource, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError, notFound } from "@/lib/api-utils";
import { applyOrderDesk, deskSchema } from "@/lib/order-desk";

/** Edit an order (items, discount, payment) or correct its payment, from the till. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, deskSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const result = await applyOrderDesk({
      orderId: id,
      input: parsed.data,
      actorId: auth.user.sub,
      role: auth.user.role,
      ip: clientIp(request),
      source: "pos",
    });
    if (!result.ok) {
      if (result.status === 404) return notFound(result.message);
      if (result.status === 403) return NextResponse.json({ error: result.message }, { status: 403 });
      if (result.status === 409) return conflict(result.message);
      return badRequest(result.message);
    }
    return ok({ order: result.order });
  } catch (error) {
    return handlePrismaError(error, "pos/orders/[id] PATCH");
  }
}
