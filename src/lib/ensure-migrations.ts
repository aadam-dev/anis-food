import { applyPendingMigrations } from "@/lib/apply-migrations";

export type MigrationResult = { ok: true } | { ok: false; error: string };

let started: Promise<MigrationResult> | null = null;

/**
 * Apply pending SQL migrations once per server process.
 *
 * This used to spawn `scripts/db-migrate.mjs`. On Vercel that child resolves
 * `pg` from a traced slice of node_modules and dies on a missing `pg-int8`
 * before any SQL runs — so `CashMovement.kind` never appears and the till
 * stays on the recovery screen. Running in-process lets the server bundle
 * follow `pg`'s real dependency tree, one statement at a time.
 *
 * A failed attempt is not cached, so Try again runs the migrator again.
 */
export function ensureMigrations(): Promise<MigrationResult> {
  if (!process.env.DATABASE_URL) return Promise.resolve({ ok: true });
  if (!started) {
    started = runMigrations().then((result) => {
      if (!result.ok) started = null;
      return result;
    });
  }
  return started;
}

async function runMigrations(): Promise<MigrationResult> {
  try {
    await applyPendingMigrations();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Pending migrations were not applied.", message);
    return {
      ok: false,
      error: "The till's books update did not apply. The register stays closed until it does.",
    };
  }
}
