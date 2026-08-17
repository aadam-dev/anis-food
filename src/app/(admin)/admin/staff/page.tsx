import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canAssignRole } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import StaffClient, { type StaffMember } from "./StaffClient";
import { UserRole } from "@/generated/prisma";

export const metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await getCurrentUser();

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      pinHash: true,
      lastLoginAt: true,
      passwordResetRequired: true,
    },
  });

  const staff: StaffMember[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    hasPin: user.pinHash !== null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    mustChangePassword: user.passwordResetRequired,
    // Which accounts this admin is allowed to touch, decided on the server.
    editable: canAssignRole(me!.role, user.role as UserRole) || me!.sub === user.id,
    isSelf: me!.sub === user.id,
  }));

  // Roles this admin is allowed to hand out.
  const assignableRoles = (
    ["OWNER", "SUPER_ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER"] as UserRole[]
  ).filter((role) => canAssignRole(me!.role, role));

  return (
    <>
      <PageHeader title="Staff" description="Who can sign in, and what they can do." />
      <StaffClient staff={staff} assignableRoles={assignableRoles} />
    </>
  );
}
