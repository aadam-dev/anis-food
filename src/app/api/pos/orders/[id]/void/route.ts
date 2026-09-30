import { NextResponse } from "next/server";
import { requireResource, clientIp } from "@/lib/api-auth";
import { ok, parseBody, conflict, handlePrismaError, notFound } from "@/lib/api-utils";
import { canVoidAtTill } from "@/lib/permissions";
import { voidOrder, voidSchema } from "@/lib/order-void";

/**
 * Voiding from the till.
 *
 * Exists so a manager can clear a ticket that is blocking the close without
 * leaving the till. Cashiers are refused here, not just hidden from the button.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;
  if (!canVoidAtTill(auth.user.role)) {
    return NextResponse.json(
      { error: "Only a manager can void an order. Ask one to do it from their login." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const parsed = await parseBody(request, voidSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const result = await voidOrder({
      orderId: id,
      input: parsed.data,
      actorId: auth.user.sub,
      ip: clientIp(request),
      source: "pos",
    });
    if (!result.ok) {
      return result.kind === "not_found" ? notFound(result.message) : conflict(result.message);
    }
    return ok({ id: result.id, status: result.status });
  } catch (error) {
    return handlePrismaError(error, "pos/orders/[id]/void");
  }
}
