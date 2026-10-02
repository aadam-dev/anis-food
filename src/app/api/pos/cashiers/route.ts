import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, handlePrismaError } from "@/lib/api-utils";
import { RESOURCE_ROLES } from "@/lib/permissions";
import { staffAvatarTint, staffInitials } from "@/lib/staff-avatar";

/**
 * Active till staff who can be switched to. Avatars are initials placeholders
 * until a photo field exists. Includes owners/managers with a PIN, not only
 * cashiers — Karim also punches sales under his name.
 */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const staff = await prisma.user.findMany({
      where: {
        role: { in: [...RESOURCE_ROLES.pos] },
        isActive: true,
        pinHash: { not: null },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    });

    return ok({
      currentUserId: auth.user.sub,
      cashiers: staff.map((person) => ({
        id: person.id,
        name: person.name,
        role: person.role,
        initials: staffInitials(person.name),
        tint: staffAvatarTint(person.name),
      })),
    });
  } catch (error) {
    return handlePrismaError(error, "pos/cashiers GET");
  }
}
