import "server-only";
import { SalaryType, UserRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { hashPassword, hashPin } from "@/lib/auth/password";

/**
 * Named till cashiers that must exist in every environment.
 *
 * Seed is not run on Vercel, so production would otherwise have no Maxwell /
 * Maudallia until someone remembered to seed. This upsert is idempotent and
 * only fills missing accounts — it does not overwrite a PIN or password Karim
 * has already changed.
 */

const SEED_PASSWORD = process.env.SEED_PASSWORD || "anis1234";

const CASHIERS: {
  email: string;
  name: string;
  pin: string;
  phone: string;
}[] = [
  {
    email: "maxwell@anis.com",
    name: "Maxwell Kaku",
    pin: "4826",
    phone: "+233 24 555 0101",
  },
  {
    email: "maudallia@anis.com",
    name: "Maudallia Tetteh",
    pin: "7391",
    phone: "+233 24 555 0102",
  },
];

const LEGACY = ["cashier1@anis.com", "cashier2@anis.com"];

let started: Promise<void> | null = null;

export function ensureCashiers(): Promise<void> {
  if (!process.env.DATABASE_URL) return Promise.resolve();
  if (!started) {
    started = provision().catch((error) => {
      started = null;
      console.error("Could not ensure cashier accounts.", error);
    });
  }
  return started;
}

async function provision(): Promise<void> {
  for (const cashier of CASHIERS) {
    const email = cashier.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, pinHash: true, staffProfile: { select: { id: true } } },
    });

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email,
          name: cashier.name,
          role: UserRole.CASHIER,
          passwordHash: await hashPassword(SEED_PASSWORD),
          pinHash: await hashPin(cashier.pin),
          passwordResetRequired: false,
          isActive: true,
        },
      });
      await prisma.staffProfile.create({
        data: {
          userId: user.id,
          salaryType: SalaryType.MONTHLY,
          phone: cashier.phone,
          startedAt: new Date(),
        },
      });
      console.log(`Cashier provisioned: ${email}`);
      continue;
    }

    // Reactivate and refresh display name / phone if the row already exists,
    // but leave passwordHash and pinHash alone once set.
    await prisma.user.update({
      where: { email },
      data: {
        name: cashier.name,
        role: UserRole.CASHIER,
        isActive: true,
        ...(existing.pinHash ? {} : { pinHash: await hashPin(cashier.pin) }),
      },
    });

    if (existing.staffProfile) {
      await prisma.staffProfile.update({
        where: { userId: existing.id },
        data: { phone: cashier.phone, salaryType: SalaryType.MONTHLY },
      });
    } else {
      await prisma.staffProfile.create({
        data: {
          userId: existing.id,
          salaryType: SalaryType.MONTHLY,
          phone: cashier.phone,
          startedAt: new Date(),
        },
      });
    }
  }

  for (const email of LEGACY) {
    await prisma.user.updateMany({
      where: { email, isActive: true },
      data: { isActive: false },
    });
  }
}
