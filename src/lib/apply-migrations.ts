import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { isAlreadyThere, splitSql } from "@/lib/sql-statements";

const TABLE = "_anis_migrations";
const BOOKS_MIGRATION = "20260930043336_cash_movement_books";

/**
 * Books columns the till reads. Idempotent on purpose: the original migration
 * is a single script, and a pooler that rejects multi-statement queries leaves
 * the register closed even though most of the schema is already there.
 */
const BOOKS_REPAIR = [
  `DO $$ BEGIN
     CREATE TYPE "CashMovementKind" AS ENUM ('IN', 'SPEND', 'DEPOSIT');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`,
  `DO $$ BEGIN
     CREATE TYPE "DepositDestination" AS ENUM ('MOMO', 'BANK');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`,
  `ALTER TABLE "CashMovement" ADD COLUMN IF NOT EXISTS "destination" "DepositDestination"`,
  `ALTER TABLE "CashMovement" ADD COLUMN IF NOT EXISTS "expenseId" TEXT`,
  `ALTER TABLE "CashMovement" ADD COLUMN IF NOT EXISTS "kind" "CashMovementKind" NOT NULL DEFAULT 'IN'`,
  `UPDATE "CashMovement" SET "kind" = 'SPEND' WHERE "direction" = 'OUT' AND "kind" = 'IN'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CashMovement_expenseId_key" ON "CashMovement"("expenseId")`,
  `CREATE INDEX IF NOT EXISTS "CashMovement_kind_idx" ON "CashMovement"("kind")`,
  `DO $$ BEGIN
     ALTER TABLE "CashMovement"
       ADD CONSTRAINT "CashMovement_expenseId_fkey"
       FOREIGN KEY ("expenseId") REFERENCES "Expense"("id")
       ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`,
];

function migrationsDir(): string {
  return join(process.cwd(), "prisma", "migrations");
}

function migrationNames(): string[] {
  const dir = migrationsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}

function readMigration(name: string): { sql: string; checksum: string } {
  const sql = readFileSync(join(migrationsDir(), name, "migration.sql"), "utf8");
  return { sql, checksum: createHash("sha256").update(sql).digest("hex") };
}

function clientFor(url: string): pg.Client {
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  const disableSsl = /sslmode=disable/.test(url);
  return new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 20_000,
    ssl: local || disableSsl ? undefined : { rejectUnauthorized: false },
  });
}

async function kindPresent(client: pg.Client): Promise<boolean> {
  const rows = await client.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'CashMovement'
       AND column_name = 'kind'`,
  );
  return rows.rows.length > 0;
}

async function ensureTable(client: pg.Client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS "${TABLE}" (
       name        TEXT PRIMARY KEY,
       checksum    TEXT NOT NULL,
       applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
}

async function appliedNames(client: pg.Client): Promise<Map<string, string>> {
  const { rows } = await client.query<{ name: string; checksum: string }>(
    `SELECT name, checksum FROM "${TABLE}"`,
  );
  return new Map(rows.map((row) => [row.name, row.checksum]));
}

async function record(client: pg.Client, name: string, checksum: string) {
  await client.query(
    `INSERT INTO "${TABLE}" (name, checksum) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
    [name, checksum],
  );
}

/**
 * If the app tables are already there but the ledger is empty, 0001_init would
 * fail on "relation already exists" and every later update — including the
 * till's books — would never run.
 */
async function baselineInit(client: pg.Client, applied: Map<string, string>) {
  if (applied.has("0001_init")) return;
  if (!migrationNames().includes("0001_init")) return;
  const existing = await client.query<{ name: string | null }>(`SELECT to_regclass('public."User"') AS name`);
  if (!existing.rows[0]?.name) return;
  const { checksum } = readMigration("0001_init");
  await record(client, "0001_init", checksum);
  applied.set("0001_init", checksum);
  console.log("Baselined 0001_init — the tables were already there.");
}

async function applyStatement(client: pg.Client, statement: string) {
  await client.query("SAVEPOINT anis_stmt");
  try {
    await client.query(statement);
    await client.query("RELEASE SAVEPOINT anis_stmt");
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT anis_stmt");
    if (isAlreadyThere(error)) return;
    throw error;
  }
}

async function applyFile(client: pg.Client, name: string) {
  const { sql, checksum } = readMigration(name);
  const statements = splitSql(sql);
  await client.query("BEGIN");
  try {
    for (const statement of statements) {
      await applyStatement(client, statement);
    }
    await record(client, name, checksum);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function repairBooks(client: pg.Client) {
  await client.query("BEGIN");
  try {
    for (const statement of BOOKS_REPAIR) {
      await applyStatement(client, statement);
    }
    if (migrationNames().includes(BOOKS_MIGRATION)) {
      await record(client, BOOKS_MIGRATION, readMigration(BOOKS_MIGRATION).checksum);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

/**
 * Apply pending migrations in this process, then make sure the till's books
 * columns exist. Returns nothing on success. Throws with the database's own
 * message when the books columns still cannot be created.
 */
export async function applyPendingMigrations(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) return;

  const client = clientFor(databaseUrl);
  await client.connect();
  let failure: string | null = null;
  try {
    await ensureTable(client);
    const applied = await appliedNames(client);

    for (const [name, checksum] of applied) {
      if (!migrationNames().includes(name)) continue;
      const current = readMigration(name).checksum;
      if (current !== checksum) {
        console.error(
          `Migration "${name}" was edited after it was applied. Leaving the recorded copy in place.`,
        );
      }
    }

    await baselineInit(client, applied);

    for (const name of migrationNames()) {
      if (applied.has(name)) continue;
      try {
        await applyFile(client, name);
        applied.set(name, readMigration(name).checksum);
        console.log(`Applied ${name}`);
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
        console.error(`Migration "${name}" did not apply.`, failure);
      }
    }

    if (!(await kindPresent(client))) {
      try {
        await repairBooks(client);
        console.log("Repaired CashMovement books columns.");
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
        console.error("Cash movement books repair failed.", failure);
      }
    }

    if (!(await kindPresent(client))) {
      throw new Error(failure || "CashMovement.kind is still missing.");
    }
  } finally {
    await client.end();
  }
}
