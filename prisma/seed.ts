/**
 * Seeds a usable Anis back office: the four real accounts, the expense
 * categories Karim actually spends against, the settings the app reads, and the
 * whole menu lifted out of src/data/menu.json.
 *
 * Safe to re-run. Everything upserts, so a second run updates rather than
 * duplicating — and it will never overwrite a password that has already been
 * changed in production.
 *
 *   npm run db:seed
 */
import { randomBytes } from "node:crypto";
import { PrismaClient, UserRole, SalaryType } from "../src/generated/prisma/index.js";
import { hashPassword } from "../src/lib/auth/password";
import menu from "../src/data/menu.json" with { type: "json" };

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  name: string;
  role: UserRole;
  salaryType?: SalaryType;
}

const USERS: SeedUser[] = [
  { email: "karim@anis.com", name: "Karim", role: UserRole.OWNER },
  { email: "it@anis.com", name: "IT Administrator", role: UserRole.SUPER_ADMIN },
  { email: "cashier1@anis.com", name: "Cashier One", role: UserRole.CASHIER, salaryType: SalaryType.MONTHLY },
  { email: "cashier2@anis.com", name: "Cashier Two", role: UserRole.CASHIER, salaryType: SalaryType.MONTHLY },
];

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
  pos_theme: "dark",
  admin_theme: "light",
};

/** Generates a readable but strong first password: 4 groups of 4 base32 chars. */
function initialPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
  const bytes = randomBytes(16);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

async function seedUsers() {
  const created: { email: string; role: string; password: string }[] = [];

  for (const seed of USERS) {
    const email = seed.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Never reset a live password. Keep role and name in step, nothing else.
      await prisma.user.update({
        where: { email },
        data: { name: seed.name, role: seed.role },
      });
      console.log(`  = ${email} (${seed.role}) — already exists, password untouched`);
      continue;
    }

    const password = initialPassword();
    const user = await prisma.user.create({
      data: {
        email,
        name: seed.name,
        role: seed.role,
        passwordHash: await hashPassword(password),
        // Everyone must choose their own password on first sign-in. The one
        // printed below is a delivery mechanism, not a credential to keep.
        passwordResetRequired: true,
      },
    });

    if (seed.salaryType) {
      await prisma.staffProfile.create({
        data: { userId: user.id, salaryType: seed.salaryType },
      });
    }

    created.push({ email, role: seed.role, password });
    console.log(`  + ${email} (${seed.role})`);
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
    console.log("FIRST-TIME PASSWORDS — shown once, not stored anywhere.");
    console.log("Give each person theirs directly. They must change it at first sign-in.");
    console.log("─".repeat(64));
    for (const user of created) {
      console.log(`  ${user.email.padEnd(22)} ${user.password}   (${user.role})`);
    }
    console.log("─".repeat(64));
    console.log("Cashiers set their 4-digit till PIN after their first sign-in.");
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
