import { UserRole } from "@/generated/prisma";

/**
 * The single source of truth for who may touch what.
 *
 * Route guards, API handlers and the sidebar all read this map. When a new role
 * or section appears, it appears here once — never in three places that slowly
 * drift apart until a cashier can see the payroll.
 */
export const RESOURCE_ROLES = {
  // Back office
  admin: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT],
  dashboard: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT],
  orders: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT],
  menu: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER],
  expenses: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT],
  customers: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT],
  reports: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT],
  staff: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER],
  payroll: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT],
  settings: [UserRole.OWNER, UserRole.SUPER_ADMIN],
  /** User creation, role changes, audit log. */
  users: [UserRole.OWNER, UserRole.SUPER_ADMIN],

  // Till
  pos: [
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
  ],
} as const satisfies Record<string, readonly UserRole[]>;

export type Resource = keyof typeof RESOURCE_ROLES;

/** Roles that can see cost prices, margins and profit. Cashiers never can. */
export const COST_VISIBLE_ROLES: readonly UserRole[] = [
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
  UserRole.MANAGER,
  UserRole.ACCOUNTANT,
];

/** Accounts that only belong at the till — they get redirected away from /admin. */
export const POS_ONLY_ROLES: readonly UserRole[] = [UserRole.CASHIER];

/** Accounts that may create users and change roles. */
export const ADMIN_ROLES: readonly UserRole[] = [UserRole.OWNER, UserRole.SUPER_ADMIN];

export function rolesForResource(resource: Resource): readonly UserRole[] {
  return RESOURCE_ROLES[resource];
}

export function canAccess(role: UserRole | undefined | null, resource: Resource): boolean {
  if (!role) return false;
  return rolesForResource(resource).includes(role);
}

export function canSeeCosts(role: UserRole | undefined | null): boolean {
  return !!role && COST_VISIBLE_ROLES.includes(role);
}

/**
 * A MANAGER may add cashiers but must not be able to promote themselves, nor
 * touch an owner's account. Without this, "reset a staff password" quietly
 * becomes "take over the business".
 */
export function canAssignRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === UserRole.OWNER || targetRole === UserRole.SUPER_ADMIN) {
    return ADMIN_ROLES.includes(actorRole);
  }
  return ADMIN_ROLES.includes(actorRole) || actorRole === UserRole.MANAGER;
}

/** Whether the actor may edit/deactivate/reset the target account at all. */
export function canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === UserRole.OWNER || targetRole === UserRole.SUPER_ADMIN) {
    return ADMIN_ROLES.includes(actorRole);
  }
  return ADMIN_ROLES.includes(actorRole) || actorRole === UserRole.MANAGER;
}

/** Where a freshly signed-in user should land. */
export function landingPathFor(role: UserRole): string {
  return POS_ONLY_ROLES.includes(role) ? "/pos" : "/admin";
}

/**
 * Maps a URL to the resource guarding it. Longest prefix wins, so
 * /admin/reports is guarded by `reports` rather than the broader `admin`.
 */
const PATH_RESOURCES: ReadonlyArray<readonly [string, Resource]> = [
  ["/admin/orders", "orders"],
  ["/admin/menu", "menu"],
  ["/admin/expenses", "expenses"],
  ["/admin/customers", "customers"],
  ["/admin/reports", "reports"],
  ["/admin/staff", "staff"],
  ["/admin/payroll", "payroll"],
  ["/admin/settings", "settings"],
  ["/admin", "admin"],
  ["/pos", "pos"],
  ["/api/admin/orders", "orders"],
  ["/api/admin/menu", "menu"],
  ["/api/admin/expenses", "expenses"],
  ["/api/admin/customers", "customers"],
  ["/api/admin/reports", "reports"],
  ["/api/admin/staff", "staff"],
  ["/api/admin/payroll", "payroll"],
  ["/api/admin/settings", "settings"],
  ["/api/admin", "admin"],
  ["/api/pos", "pos"],
];

export function resourceForPath(pathname: string): Resource | null {
  let match: { length: number; resource: Resource } | null = null;
  for (const [prefix, resource] of PATH_RESOURCES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!match || prefix.length > match.length) {
        match = { length: prefix.length, resource };
      }
    }
  }
  return match?.resource ?? null;
}
