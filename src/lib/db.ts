import { PrismaClient } from "@/generated/prisma";

/**
 * One client per process. Next's dev server re-evaluates modules on every edit,
 * so without the global cache we would open a new pool on every save and exhaust the
 * Supabase connection limit within a few minutes of work.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
