#!/usr/bin/env node
/**
 * Wipe all sales activity so testing starts from a clean slate.
 *
 *   node scripts/reset-sales.mjs                          # preview: counts only, writes nothing
 *   node scripts/reset-sales.mjs --apply --i-understand   # backs up, then deletes
 *
 * Deleted (sales and till activity):
 *   orders, their lines and history, till shifts, cash movements, and the
 *   expenses that till "spends" created. Online-order customers too, with
 *   --customers.
 *
 * Kept (set-up and back-office records):
 *   menu, sizes, categories, staff and PINs, tables, settings, inventory,
 *   expenses entered in the back office, payroll, and the audit log (which
 *   records this reset).
 *
 * Before deleting, every row about to go is written to backups/sales-<time>.json
 * (git-ignored), so a mistake can still be undone by hand.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.argv.includes("--i-understand");
const CUSTOMERS = process.argv.includes("--customers");

function loadEnv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

// Children before parents, so no foreign key is ever left dangling.
const STEPS = [
  { table: "OrderEvent", where: "TRUE" },
  { table: "OrderItem", where: "TRUE" },
  { table: "Order", where: "TRUE" },
  // Till spends: the cash movement points at the expense it filed.
  { table: "CashMovement", where: "TRUE", keep: ["expenseId"] },
  { table: "Expense", where: `id = ANY($1)`, param: "tillExpenseIds" },
  { table: "PosSession", where: "TRUE" },
  ...(CUSTOMERS ? [{ table: "Customer", where: "TRUE" }] : []),
];

async function tableExists(client, table) {
  const { rows } = await client.query(`SELECT to_regclass($1) AS name`, [`"${table}"`]);
  return rows[0].name !== null;
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check .env.");
  const host = new URL(url).hostname;
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const { rows: spends } = await client.query(
      `SELECT "expenseId" FROM "CashMovement" WHERE "expenseId" IS NOT NULL`,
    );
    const params = { tillExpenseIds: spends.map((row) => row.expenseId) };

    const plan = [];
    for (const step of STEPS) {
      if (!(await tableExists(client, step.table))) continue;
      const args = step.param ? [params[step.param]] : [];
      const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${step.table}" WHERE ${step.where}`, args);
      plan.push({ ...step, args, count: rows[0].n });
    }

    console.log(`Database: ${host}\n`);
    for (const step of plan) {
      const label = step.table === "Expense" ? "Expense (till spends only)" : step.table;
      console.log(`  ${label.padEnd(28)} ${String(step.count).padStart(6)} rows`);
    }
    if (!CUSTOMERS) console.log(`  ${"Customer".padEnd(28)}   kept  (add --customers to clear)`);

    if (!APPLY) {
      console.log("\nPreview only. Nothing was changed.");
      console.log("To delete: node scripts/reset-sales.mjs --apply --i-understand");
      return;
    }
    if (!CONFIRMED) {
      console.log("\nAdd --i-understand as well: this permanently deletes the rows above.");
      return;
    }

    // Back up everything that is about to go.
    const backup = {};
    for (const step of plan) {
      const { rows } = await client.query(`SELECT * FROM "${step.table}" WHERE ${step.where}`, step.args);
      backup[step.table] = rows;
    }
    const dir = join(ROOT, "backups");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `sales-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    writeFileSync(file, JSON.stringify(backup, null, 1));
    console.log(`\nBacked up to ${file}`);

    await client.query("BEGIN");
    try {
      for (const step of plan) {
        const { rowCount } = await client.query(`DELETE FROM "${step.table}" WHERE ${step.where}`, step.args);
        console.log(`  deleted ${String(rowCount).padStart(6)} from ${step.table}`);
      }
      await client.query(
        `INSERT INTO "AuditLog" (id, action, resource, detail, "createdAt")
         VALUES (gen_random_uuid()::text, 'sales.reset', 'Order', $1, now())`,
        [JSON.stringify({ counts: Object.fromEntries(plan.map((step) => [step.table, step.count])), backup: file })],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    console.log("\nDone. Sales, shifts and cash-up are empty; the till opens a fresh shift on next sign-in.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
