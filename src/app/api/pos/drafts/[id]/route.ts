import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, handlePrismaError, notFound } from "@/lib/api-utils";
import { seesAllTillOrders } from "@/lib/till-visibility";

/**
 * Bring a held order back onto the till and remove it from the held list.
 * A cashier can only take their own. An owner, manager, or IT account can
 * take any, and the sale that follows is theirs.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const row = await prisma.heldCart.findUnique({
      where: { id },
      include: { staff: { select: { id: true, name: true } } },
    });
    if (!row) return notFound("That held order is no longer there.");
    if (!seesAllTillOrders(auth.user.role) && row.staffId !== auth.user.sub) {
      return NextResponse.json({ error: "That held order belongs to someone else." }, { status: 403 });
    }

    await prisma.heldCart.delete({ where: { id } });

    return ok({
      draft: {
        id: row.id,
        label: row.label || row.customerName || "Held order",
        lines: row.lines,
        discount: Number(row.discount),
        customerName: row.customerName ?? "",
        customerPhone: row.customerPhone ?? "",
        customerAddress: row.customerAddress ?? "",
        fulfillment: row.fulfillment,
        tableId: row.tableId ?? "",
        staffName: row.staff.name,
      },
    });
  } catch (error) {
    return handlePrismaError(error, "pos/drafts/[id] POST");
  }
}
