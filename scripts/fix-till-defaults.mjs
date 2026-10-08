#!/usr/bin/env node
/**
 * One-off live fixes:
 *   1. Set the till's default opening float to 0 (it was 200).
 *   2. Remove the unused "Store Manager" demo login (manager@anis.com) and its
 *      staff record — but only if it has never been used.
 *
 *   node scripts/fix-till-defaults.mjs            # preview, writes nothing
 *   node scripts/fix-till-defaults.mjs --apply    # does it
 *
 * The Store Manager removal refuses to run if the account has any activity, so
 * it can never delete a real person's record.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

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

const ACTIVITY = [
  ["Order", '"staffId"'],
  ["PosSession", '"openedById"'],
  ["PosSession", '"closedById"'],
  ["CashMovement", '"createdById"'],
  ["OrderEvent", '"actorId"'],
  ["AuditLog", '"actorId"'],
  ["PayrollRecord", '"userId"'],
];

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check .env.");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    console.log(`Database: ${new URL(url).hostname}\n`);

    // 1. Opening float
    const floatRow = (await client.query(`SELECT value FROM "Setting" WHERE key = 'default_opening_float'`)).rows[0];
    console.log(`Opening float: currently ${floatRow ? `"${floatRow.value}"` : "(unset, defaults to 0)"} → "0"`);

    // 2. Store Manager
    const sm = (await client.query(`SELECT id, email, name, role, "lastLoginAt" FROM "User" WHERE email = 'manager@anis.com'`)).rows[0];
    let safeToDelete = false;
    if (!sm) {
      console.log("\nStore Manager: no manager@anis.com login found. Nothing to remove.");
    } else {
      let activity = 0;
      for (const [table, col] of ACTIVITY) {
        activity += Number((await client.query(`SELECT count(*) FROM "${table}" WHERE ${col} = $1`, [sm.id])).rows[0].count);
      }
      safeToDelete = sm.role === "MANAGER" && sm.lastLoginAt === null && activity === 0;
      console.log(
        `\nStore Manager (${sm.email}): role ${sm.role}, last login ${sm.lastLoginAt ?? "never"}, ${activity} activity record(s).`,
      );
      console.log(safeToDelete ? "  → will remove the staff record and the login." : "  → NOT removing: it has activity or is not a plain manager login.");
    }

    if (!APPLY) {
      console.log("\nPreview only. Run again with --apply to make these changes.");
      return;
    }

    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('default_opening_float', '0', now())
         ON CONFLICT (key) DO UPDATE SET value = '0', "updatedAt" = now()`,
      );
      console.log("\nSet default_opening_float = 0");

      if (sm && safeToDelete) {
        const staff = await client.query(`DELETE FROM "Staff" WHERE "userId" = $1`, [sm.id]);
        const user = await client.query(`DELETE FROM "User" WHERE id = $1`, [sm.id]);
        console.log(`Removed Store Manager: ${staff.rowCount} staff record, ${user.rowCount} login.`);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    console.log("\nDone.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
