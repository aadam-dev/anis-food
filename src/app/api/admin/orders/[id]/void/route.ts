import { NextResponse } from "next/server";
import { requireResource, clientIp } from "@/lib/api-auth";
import { ok, parseBody, conflict, handlePrismaError, notFound } from "@/lib/api-utils";
import { voidOrder, voidSchema } from "@/lib/order-void";
import { prisma } from "@/lib/db";
import { canEditPaidOrders } from "@/lib/permissions";
import { isUnpaidTicket } from "@/lib/till-rules";

/**
 * Voiding from the back office. An unpaid ticket can be voided by anyone who
 * runs orders; a paid sale takes money back out of the books, so only a
 * manager or owner can void it.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const parsed = await parseBody(request, voidSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { paymentStatus: true, paymentMethod: true, status: true },
    });
    if (!order) return notFound("That order no longer exists.");
    if (!isUnpaidTicket(order) && !canEditPaidOrders(auth.user.role)) {
      return NextResponse.json({ error: "Only a manager can void a paid order." }, { status: 403 });
    }

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
