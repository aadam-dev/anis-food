#!/usr/bin/env node
/**
 * Migration runner for Anis.
 *
 * Why this exists instead of `prisma migrate`: our Supabase project only serves
 * the *transaction* pooler (port 6543). The session pooler (5432) refuses
 * connections and the direct host is IPv6-only, which this network cannot
 * reach. `prisma migrate` and `prisma db push` both need session-level advisory
 * locks, so they hang forever against a transaction pooler. Plain SQL over the
 * same pooler works fine — so we generate the SQL with Prisma (offline, no DB
 * needed) and apply it ourselves.
 *
 * If the direct connection ever becomes reachable, this can be swapped back to
 * `prisma migrate deploy` without changing the migration files: they are the
 * same format Prisma writes.
 *
 *   node scripts/db-migrate.mjs new <name>   generate SQL for schema changes
 *   node scripts/db-migrate.mjs up           apply pending migrations
 *   node scripts/db-migrate.mjs status       list applied vs pending
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "prisma", "migrations");
const SCHEMA = join(ROOT, "prisma", "schema.prisma");
/** Snapshot of the schema as of the last generated migration. Lets us diff
 *  offline, without the shadow database `--from-migrations` would require. */
const APPLIED_SNAPSHOT = join(ROOT, "prisma", ".applied-schema.prisma");
const EMPTY_SNAPSHOT = join(ROOT, "prisma", ".empty-schema.prisma");

const TABLE = "_anis_migrations";

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

function migrationDirs() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(MIGRATIONS_DIR, e.name, "migration.sql")))
    .map((e) => e.name)
    .sort();
}

function readMigration(name) {
  const sql = readFileSync(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
  return { sql, checksum: createHash("sha256").update(sql).digest("hex") };
}

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check .env.");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(
    `CREATE TABLE IF NOT EXISTS "${TABLE}" (
       name        TEXT PRIMARY KEY,
       checksum    TEXT NOT NULL,
       applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  return client;
}

async function appliedMap(client) {
  const { rows } = await client.query(`SELECT name, checksum FROM "${TABLE}"`);
  return new Map(rows.map((r) => [r.name, r.checksum]));
}

function generate(name) {
  if (!name) throw new Error("Usage: db-migrate new <name>");
  if (!existsSync(EMPTY_SNAPSHOT)) {
    writeFileSync(
      EMPTY_SNAPSHOT,
      'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n',
    );
  }
  const from = existsSync(APPLIED_SNAPSHOT) ? APPLIED_SNAPSHOT : EMPTY_SNAPSHOT;
  const sql = execFileSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-schema-datamodel",
      from,
      "--to-schema-datamodel",
      SCHEMA,
      "--script",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );

  if (!sql.trim() || /^\s*--\s*This is an empty migration/i.test(sql)) {
    console.log("No schema changes to migrate.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const dir = join(MIGRATIONS_DIR, `${stamp}_${name}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "migration.sql"), sql);
  console.log(`Created ${dir}/migration.sql`);
  console.log("Review it, then run: npm run db:migrate");
}

async function up() {
  const client = await connect();
  try {
    const applied = await appliedMap(client);
    const pending = migrationDirs().filter((n) => !applied.has(n));

    for (const [name, checksum] of applied) {
      if (!existsSync(join(MIGRATIONS_DIR, name, "migration.sql"))) continue;
      if (readMigration(name).checksum !== checksum) {
        throw new Error(
          `Migration "${name}" was edited after it was applied. ` +
            `Never rewrite an applied migration — add a new one instead.`,
        );
      }
    }

    if (pending.length === 0) {
      console.log("Database is up to date.");
      return;
    }

    for (const name of pending) {
      const { sql, checksum } = readMigration(name);
      process.stdout.write(`Applying ${name} … `);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO "${TABLE}" (name, checksum) VALUES ($1, $2)`, [
          name,
          checksum,
        ]);
        await client.query("COMMIT");
        console.log("ok");
      } catch (err) {
        await client.query("ROLLBACK");
        console.log("failed");
        throw err;
      }
    }
    copyFileSync(SCHEMA, APPLIED_SNAPSHOT);
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

async function status() {
  const client = await connect();
  try {
    const applied = await appliedMap(client);
    const all = migrationDirs();
    if (all.length === 0) console.log("No migrations on disk.");
    for (const name of all) {
      console.log(`${applied.has(name) ? "applied" : "PENDING"}  ${name}`);
    }
    for (const name of applied.keys()) {
      if (!all.includes(name)) console.log(`applied  ${name}  (missing on disk)`);
    }
  } finally {
    await client.end();
  }
}

loadEnv();
const [cmd, arg] = process.argv.slice(2);
const run = { new: () => generate(arg), up, status }[cmd];
if (!run) {
  console.error("Usage: db-migrate <new <name>|up|status>");
  process.exit(1);
}
await run();
