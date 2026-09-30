import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource, clientIp } from "@/lib/api-auth";
import { ok, parseBody, conflict, handlePrismaError, notFound } from "@/lib/api-utils";
import { canVoidAtTill } from "@/lib/permissions";
import { voidOrder, voidSchema } from "@/lib/order-void";
import { isUnpaidTicket } from "@/lib/till-rules";
import { OrderStatus } from "@/generated/prisma";

/**
 * Voiding from the till.
 *
 * Cashiers can void an unpaid ticket. Voiding a paid sale stays a manager action.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, voidSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return notFound("That order no longer exists.");
    const cashierMayVoid =
      existing.status !== OrderStatus.CANCELLED && isUnpaidTicket(existing);
    if (!cashierMayVoid && !canVoidAtTill(auth.user.role)) {
      return NextResponse.json(
        { error: "Only a manager can void a paid order. Ask one to do it from their login." },
        { status: 403 },
      );
    }

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
