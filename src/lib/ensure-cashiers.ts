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

/**
 * People who sign in with a PIN. Created when missing. A PIN already on the
 * account is left alone, so a change made in Staff sticks across restarts.
 * Names are not rewritten either — "Store Manager" is a placeholder Karim
 * can rename.
 */
const PIN_ACCOUNTS: {
  email: string;
  name: string;
  role: UserRole;
  pin: string;
  phone?: string;
}[] = [
  {
    email: "karim@anis.com",
    name: "Karim",
    role: UserRole.OWNER,
    pin: "4173",
  },
  {
    email: "it@anis.com",
    name: "IT Administrator",
    role: UserRole.SUPER_ADMIN,
    pin: "1642",
  },
  {
    email: "manager@anis.com",
    name: "Store Manager",
    role: UserRole.MANAGER,
    pin: "8265",
  },
];

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

async function ensurePinAccount(account: (typeof PIN_ACCOUNTS)[number]): Promise<void> {
  const email = account.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, pinHash: true, staffProfile: { select: { id: true } } },
  });

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        email,
        name: account.name,
        role: account.role,
        passwordHash: await hashPassword(SEED_PASSWORD),
        pinHash: await hashPin(account.pin),
        passwordResetRequired: false,
        isActive: true,
      },
    });
    await prisma.staffProfile.create({
      data: {
        userId: user.id,
        salaryType: SalaryType.MONTHLY,
        phone: account.phone,
        startedAt: new Date(),
      },
    });
    console.log(`PIN account provisioned: ${email}`);
    return;
  }

  if (!existing.pinHash) {
    await prisma.user.update({
      where: { email },
      data: { pinHash: await hashPin(account.pin), isActive: true },
    });
    console.log(`PIN set: ${email}`);
  }

  if (!existing.staffProfile) {
    await prisma.staffProfile.create({
      data: {
        userId: existing.id,
        salaryType: SalaryType.MONTHLY,
        phone: account.phone,
        startedAt: new Date(),
      },
    });
  }
}

async function provision(): Promise<void> {
  for (const account of PIN_ACCOUNTS) {
    await ensurePinAccount(account);
  }

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
