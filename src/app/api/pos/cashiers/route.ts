import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, handlePrismaError } from "@/lib/api-utils";
import { staffAvatarTint, staffInitials } from "@/lib/staff-avatar";

/**
 * Active cashiers who can be switched to on the open till. Avatars are
 * initials placeholders until a photo field exists.
 */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const cashiers = await prisma.user.findMany({
      where: { role: "CASHIER", isActive: true, pinHash: { not: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return ok({
      currentUserId: auth.user.sub,
      cashiers: cashiers.map((cashier) => ({
        id: cashier.id,
        name: cashier.name,
        initials: staffInitials(cashier.name),
        tint: staffAvatarTint(cashier.name),
      })),
    });
  } catch (error) {
    return handlePrismaError(error, "pos/cashiers GET");
  }
}
