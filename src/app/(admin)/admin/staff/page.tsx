import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccess, canSeeCosts } from "@/lib/permissions";
import { toMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import StaffClient, { type StaffRow } from "./StaffClient";

export const metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

export default async function StaffPage() {
  const me = await getCurrentUser();
  const [staff, users, settings] = await Promise.all([
    prisma.staff.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { user: { select: { id: true, name: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, staffMember: { select: { id: true } } },
    }),
    getSettings(),
  ]);

  // Pay is private: only people who run payroll or see costs see the rates.
  const showPay = canAccess(me?.role, "payroll") || canSeeCosts(me?.role);

  const rows: StaffRow[] = staff.map((member) => ({
    id: member.id,
    name: member.name,
    position: member.position,
    phone: member.phone,
    photoUrl: member.photoUrl,
    payType: member.payType,
    payRate: showPay ? toMoney(member.payRate) : null,
    momoNumber: showPay ? member.momoNumber : null,
    bankName: showPay ? member.bankName : null,
    bankAccount: showPay ? member.bankAccount : null,
    ssnit: member.ssnit,
    startedAt: day(member.startedAt),
    endedAt: day(member.endedAt),
    isActive: member.isActive,
    notes: member.notes,
    userId: member.userId,
    userName: member.user?.name ?? null,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Manage"
        title="Staff"
        description="Everyone who works at Anis, with their photo, contact and pay. A login for the till is optional and managed under Users."
      />
      <StaffClient
        staff={rows}
        showPay={showPay}
        ssnitEnabled={settings.ssnit_enabled === "true"}
        canManageLogins={canAccess(me?.role, "users")}
        logins={users.map((user) => ({ id: user.id, name: user.name, role: user.role, staffId: user.staffMember?.id ?? null }))}
      />
    </>
  );
}
