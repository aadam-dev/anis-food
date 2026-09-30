/**
 * Seeds a usable Anis back office: the real accounts, the expense categories
 * Karim actually spends against, the settings the app reads, and the whole menu
 * lifted out of src/data/menu.json.
 *
 * Safe to re-run. Everything upserts, so a second run updates rather than
 * duplicating. Owner and IT keep the shared test password; cashiers get their
 * own 4-digit till PINs so they can sign in with their first name.
 *
 *   npm run db:seed
 */
import { PrismaClient, UserRole, SalaryType } from "../src/generated/prisma/index.js";
import { hashPassword, hashPin } from "../src/lib/auth/password";
import menu from "../src/data/menu.json" with { type: "json" };

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  name: string;
  role: UserRole;
  salaryType?: SalaryType;
  /** 4-digit till PIN for cashiers. */
  pin?: string;
  phone?: string;
}

const USERS: SeedUser[] = [
  { email: "karim@anis.com", name: "Karim", role: UserRole.OWNER },
  { email: "it@anis.com", name: "IT Administrator", role: UserRole.SUPER_ADMIN },
  {
    email: "maxwell@anis.com",
    name: "Maxwell Kaku",
    role: UserRole.CASHIER,
    salaryType: SalaryType.MONTHLY,
    pin: "4826",
    phone: "+233 24 555 0101",
  },
  {
    email: "maudallia@anis.com",
    name: "Maudallia Tetteh",
    role: UserRole.CASHIER,
    salaryType: SalaryType.MONTHLY,
    pin: "7391",
    phone: "+233 24 555 0102",
  },
];

/** Legacy placeholder cashiers — keep rows but take them off the till. */
const DEACTIVATE_EMAILS = ["cashier1@anis.com", "cashier2@anis.com"];

const EXPENSE_CATEGORIES: { name: string; isFixed: boolean }[] = [
  { name: "Ingredients & Provisions", isFixed: false },
  { name: "Drinks & Beverages", isFixed: false },
  { name: "Gas & Charcoal", isFixed: false },
  { name: "Packaging & Takeaway", isFixed: false },
  { name: "Rent", isFixed: true },
  { name: "Electricity & Water", isFixed: true },
  { name: "Internet & Airtime", isFixed: true },
  { name: "Transport & Delivery", isFixed: false },
  { name: "Repairs & Maintenance", isFixed: false },
  { name: "Licences & Permits", isFixed: true },
  { name: "Staff Welfare", isFixed: false },
  { name: "Other", isFixed: false },
];

/**
 * Keys the app reads at runtime. If you add one here, add it to the allow-list
 * in the settings route too, or the admin screen will silently drop it.
 */
const SETTINGS: Record<string, string> = {
  business_name: "Anis Food and Drink",
  business_address: "Ashale Botwe Nmai Dzorn Road, Madina, Accra, Ghana",
  business_phone: "+233 50 160 0160",
  business_whatsapp: "+233 55 250 1280",
  currency_symbol: "GH₵",
  timezone: "Africa/Accra",
  // Ani's does not show VAT. The column and the setting exist so switching it on
  // later is a settings change, not a migration in the middle of trading.
  tax_rate: "0",
  tax_label: "VAT",
  receipt_header: "Anis Food and Drink",
  receipt_footer: "Thank you. Please come again!",
  default_opening_float: "200",
  pos_theme: "light",
  admin_theme: "light",
};

/**
 * Password for owner / IT (and as a recovery hash for cashiers).
 * Cashiers sign in at the till with their 4-digit PIN — not this password.
 * Override with SEED_PASSWORD when you want something else.
 */
const SEED_PASSWORD = process.env.SEED_PASSWORD || "anis1234";

async function seedUsers() {
  const created: { email: string; role: string; password: string; pin?: string }[] = [];

  for (const seed of USERS) {
    const email = seed.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    const pinHash = seed.pin ? await hashPin(seed.pin) : undefined;
    const passwordHash = await hashPassword(SEED_PASSWORD);

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          name: seed.name,
          role: seed.role,
          passwordHash,
          ...(pinHash ? { pinHash } : {}),
          passwordResetRequired: false,
          isActive: true,
        },
      });
      if (seed.salaryType || seed.phone) {
        await prisma.staffProfile.upsert({
          where: { userId: existing.id },
          update: {
            ...(seed.salaryType ? { salaryType: seed.salaryType } : {}),
            ...(seed.phone ? { phone: seed.phone } : {}),
          },
          create: {
            userId: existing.id,
            salaryType: seed.salaryType ?? SalaryType.MONTHLY,
            phone: seed.phone,
          },
        });
      }
      created.push({ email, role: seed.role, password: SEED_PASSWORD, pin: seed.pin });
      console.log(
        seed.pin
          ? `  = ${email} (${seed.role}) — PIN ${seed.pin}`
          : `  = ${email} (${seed.role}) — password set to the shared test password`,
      );
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: seed.name,
        role: seed.role,
        passwordHash,
        pinHash,
        passwordResetRequired: false,
      },
    });

    if (seed.salaryType || seed.phone) {
      await prisma.staffProfile.create({
        data: {
          userId: user.id,
          salaryType: seed.salaryType ?? SalaryType.MONTHLY,
          phone: seed.phone,
          startedAt: new Date(),
        },
      });
    }

    created.push({ email, role: seed.role, password: SEED_PASSWORD, pin: seed.pin });
    console.log(seed.pin ? `  + ${email} (${seed.role}) — PIN ${seed.pin}` : `  + ${email} (${seed.role})`);
  }

  for (const email of DEACTIVATE_EMAILS) {
    const legacy = await prisma.user.findUnique({ where: { email } });
    if (!legacy) continue;
    await prisma.user.update({
      where: { email },
      data: { isActive: false },
    });
    console.log(`  - ${email} deactivated (replaced by named cashiers)`);
  }

  return created;
}

async function seedExpenseCategories() {
  for (const [index, category] of EXPENSE_CATEGORIES.entries()) {
    await prisma.expenseCategory.upsert({
      where: { name: category.name },
      update: { isFixed: category.isFixed, sortOrder: index },
      create: { name: category.name, isFixed: category.isFixed, sortOrder: index },
    });
  }
  console.log(`  ${EXPENSE_CATEGORIES.length} expense categories`);
}

async function seedSettings() {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {}, // never clobber a value Karim has changed in the admin
      create: { key, value },
    });
  }
  console.log(`  ${Object.keys(SETTINGS).length} settings`);
}

async function seedMenu() {
  for (const [index, category] of menu.categories.entries()) {
    await prisma.menuCategory.upsert({
      where: { id: category.id },
      update: { name: category.name, description: category.description, sortOrder: index },
      create: {
        id: category.id,
        name: category.name,
        description: category.description,
        sortOrder: index,
      },
    });
  }

  // Preserve the order items appear in within their category in menu.json —
  // it is the order the kitchen and the printed menu already use.
  const perCategory = new Map<string, number>();

  for (const item of menu.items) {
    const sortOrder = perCategory.get(item.category) ?? 0;
    perCategory.set(item.category, sortOrder + 1);

    const data = {
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      categoryId: item.category,
      imageUrl: "image" in item ? (item.image as string) : null,
      isPopular: "popular" in item ? Boolean(item.popular) : false,
      isAvailable: "available" in item ? item.available !== false : true,
      tags: "tags" in item ? ((item.tags as string[]) ?? []) : [],
      sortOrder,
    };

    await prisma.menuItem.upsert({
      where: { slug: item.id },
      // Price and availability are Karim's to manage in the admin once seeded,
      // so a re-run refreshes the copy but leaves what he has changed alone.
      update: { name: data.name, description: data.description, categoryId: data.categoryId, sortOrder },
      create: { slug: item.id, ...data },
    });
  }

  console.log(`  ${menu.categories.length} categories, ${menu.items.length} menu items`);
}

async function main() {
  console.log("Seeding Anis back office…\n");

  console.log("Users:");
  const created = await seedUsers();

  console.log("\nReference data:");
  await seedExpenseCategories();
  await seedSettings();
  await seedMenu();

  if (created.length > 0) {
    console.log("\n" + "─".repeat(64));
    console.log("SEED LOGINS — change before launch.");
    console.log("─".repeat(64));
    for (const user of created) {
      if (user.pin) {
        console.log(`  ${user.email.padEnd(24)} first name + PIN ${user.pin}   (${user.role})`);
      } else {
        console.log(`  ${user.email.padEnd(24)} ${user.password}   (${user.role})`);
      }
    }
    console.log("─".repeat(64));
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
