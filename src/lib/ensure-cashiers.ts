import "server-only";
import { SalaryType, UserRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { hashPassword, hashPin } from "@/lib/auth/password";

/**
 * Named till staff that must exist (and have a PIN) in every environment.
 *
 * Seed is not run on Vercel. These four accounts are code-managed. A version
 * stamp in Settings means we only re-hash PINs when the managed set changes —
 * not on every cold start.
 */

const SEED_PASSWORD = process.env.SEED_PASSWORD || "anis1234";
/** Bump when a managed PIN or account in STAFF changes. */
const STAFF_PINS_VERSION = "2026-10-02-it-1642";
const STAFF_PINS_SETTING = "staff_pins_version";

const STAFF: {
  email: string;
  name: string;
  role: UserRole;
  pin: string;
  phone?: string;
  salaryType?: SalaryType;
}[] = [
  { email: "karim@anis.com", name: "Karim", role: UserRole.OWNER, pin: "5820" },
  { email: "it@anis.com", name: "IT Administrator", role: UserRole.SUPER_ADMIN, pin: "1642" },
  {
    email: "maxwell@anis.com",
    name: "Maxwell Kaku",
    role: UserRole.CASHIER,
    pin: "4826",
    phone: "+233 24 555 0101",
    salaryType: SalaryType.MONTHLY,
  },
  {
    email: "maudallia@anis.com",
    name: "Maudallia Tetteh",
    role: UserRole.CASHIER,
    pin: "7391",
    phone: "+233 24 555 0102",
    salaryType: SalaryType.MONTHLY,
  },
];

const LEGACY = ["cashier1@anis.com", "cashier2@anis.com"];

let started: Promise<void> | null = null;

/** @deprecated Prefer ensureTillStaff — kept as an alias for existing imports. */
export function ensureCashiers(): Promise<void> {
  return ensureTillStaff();
}

export function ensureTillStaff(): Promise<void> {
  if (!process.env.DATABASE_URL) return Promise.resolve();
  if (!started) {
    started = provision().catch((error) => {
      started = null;
      console.error("Could not ensure till staff accounts.", error);
    });
  }
  return started;
}

async function provision(): Promise<void> {
  const version = await prisma.setting.findUnique({ where: { key: STAFF_PINS_SETTING } });
  const pinsCurrent = version?.value === STAFF_PINS_VERSION;

  for (const person of STAFF) {
    const email = person.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, pinHash: true, staffProfile: { select: { id: true } } },
    });

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email,
          name: person.name,
          role: person.role,
          passwordHash: await hashPassword(SEED_PASSWORD),
          pinHash: await hashPin(person.pin),
          passwordResetRequired: false,
          isActive: true,
        },
      });
      if (person.salaryType || person.phone) {
        await prisma.staffProfile.create({
          data: {
            userId: user.id,
            salaryType: person.salaryType ?? SalaryType.MONTHLY,
            phone: person.phone,
            startedAt: new Date(),
          },
        });
      }
      console.log(`Till staff provisioned: ${email}`);
      continue;
    }

    const needsPin = !pinsCurrent || !existing.pinHash;
    await prisma.user.update({
      where: { email },
      data: {
        name: person.name,
        role: person.role,
        isActive: true,
        passwordResetRequired: false,
        ...(needsPin ? { pinHash: await hashPin(person.pin) } : {}),
      },
    });

    if (person.salaryType || person.phone) {
      if (existing.staffProfile) {
        await prisma.staffProfile.update({
          where: { userId: existing.id },
          data: {
            ...(person.phone ? { phone: person.phone } : {}),
            ...(person.salaryType ? { salaryType: person.salaryType } : {}),
          },
        });
      } else {
        await prisma.staffProfile.create({
          data: {
            userId: existing.id,
            salaryType: person.salaryType ?? SalaryType.MONTHLY,
            phone: person.phone,
            startedAt: new Date(),
          },
        });
      }
    }
  }

  for (const email of LEGACY) {
    await prisma.user.updateMany({
      where: { email, isActive: true },
      data: { isActive: false },
    });
  }

  if (!pinsCurrent) {
    await prisma.setting.upsert({
      where: { key: STAFF_PINS_SETTING },
      update: { value: STAFF_PINS_VERSION },
      create: { key: STAFF_PINS_SETTING, value: STAFF_PINS_VERSION },
    });
    console.log(`Till staff PINs synced (${STAFF_PINS_VERSION}).`);
  }
}
