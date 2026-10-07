import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, notFound, handlePrismaError } from "@/lib/api-utils";
import { toMoney } from "@/lib/money";

/**
 * Remove a hand-recorded movement typed in by mistake. A transfer goes as a
 * pair, so one side is never left behind. The audit trail keeps what it was.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireResource("accounts");
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  try {
    const entry = await prisma.moneyEntry.findUnique({ where: { id } });
    if (!entry) return notFound("That movement no longer exists.");
    const where = entry.transferId ? { transferId: entry.transferId } : { id };
    const removed = await prisma.moneyEntry.findMany({ where });
    await prisma.moneyEntry.deleteMany({ where });
    await logAudit({
      actorId: auth.user.sub,
      action: "accounts.delete",
      resource: "MoneyEntry",
      resourceId: id,
      detail: {
        removed: removed.map((row) => ({
          account: row.account,
          direction: row.direction,
          amount: toMoney(row.amount),
          kind: row.kind,
          reason: row.reason,
        })),
      },
      ip: clientIp(request),
    });
    return ok({ deleted: removed.length });
  } catch (error) {
    return handlePrismaError(error, "admin/accounts/[id] DELETE");
  }
}
