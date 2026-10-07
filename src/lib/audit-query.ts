import "server-only";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { periodBounds } from "@/lib/reports";
import { auditArea, describeAudit } from "@/lib/audit-describe";

/** Action prefixes behind each area, so filtering happens in the database. */
const AREA_WHERE: Record<string, Prisma.AuditLogWhereInput> = {
  Orders: { OR: [{ action: { startsWith: "order." } }, { action: { startsWith: "pos.order" } }, { action: "kitchen.status" }] },
  Till: { OR: [{ action: { startsWith: "pos.session" } }, { action: { startsWith: "pos.cash" } }, { action: { startsWith: "pos.switch" } }] },
  Menu: { action: { startsWith: "menu." } },
  Accounts: { action: { startsWith: "accounts." } },
  Expenses: { action: { startsWith: "expense" } },
  Payroll: { action: { startsWith: "payroll." } },
  Staff: { action: { startsWith: "staff." }, resource: { not: "User" } },
  Users: { OR: [{ action: { startsWith: "user." } }, { action: { startsWith: "staff." }, resource: "User" }] },
  Inventory: { action: { startsWith: "inventory." } },
  Tables: { action: { startsWith: "table." } },
  Settings: { action: { startsWith: "settings." } },
  "Sign-in": { action: { startsWith: "auth." } },
};

export interface AuditRow {
  id: string;
  at: Date;
  who: string;
  area: string;
  what: string;
  ip: string | null;
}

export async function getAudit(filters: { from: string; to: string; area?: string; actorId?: string; take: number; skip?: number }) {
  const { start, end } = periodBounds(filters.from, filters.to);
  const where: Prisma.AuditLogWhereInput = {
    createdAt: { gte: start, lt: end },
    ...(filters.actorId && { actorId: filters.actorId }),
    ...(filters.area && AREA_WHERE[filters.area] ? AREA_WHERE[filters.area] : {}),
  };
  const [rows, count] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.take,
      skip: filters.skip ?? 0,
      include: { actor: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  const view: AuditRow[] = rows.map((row) => ({
    id: row.id,
    at: row.createdAt,
    who: row.actor?.name ?? (row.action.startsWith("auth.login.failed") ? "Unknown" : "System"),
    area: auditArea(row.action, row.resource),
    what: describeAudit(row.action, row.resource, row.detail as Record<string, unknown> | null),
    ip: row.ip,
  }));
  return { rows: view, count };
}
