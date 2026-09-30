import { UserRole } from "@/generated/prisma";

/**
 * Who a person may see on the till.
 *
 * A cashier works their own tickets and held carts. An owner, manager, or IT
 * account is responsible for the whole open shift, so they see every ticket
 * on it. Accountants never reach the till.
 */
export function seesAllTillOrders(role: UserRole | string | null | undefined): boolean {
  return role === UserRole.OWNER || role === UserRole.SUPER_ADMIN || role === UserRole.MANAGER;
}

export function tillStaffFilter(
  role: UserRole | string | null | undefined,
  userId: string,
): { staffId: string } | Record<string, never> {
  return seesAllTillOrders(role) ? {} : { staffId: userId };
}
