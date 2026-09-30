import { execFile } from "node:child_process";

export type MigrationResult = { ok: true } | { ok: false; error: string };

let started: Promise<MigrationResult> | null = null;

/**
 * Apply pending SQL migrations once per server process.
 *
 * Vercel's build does not have a separate migrate step. Doing it here uses the
 * same database the running app already talks to. A failure is logged and
 * returned — the public site still renders. The till is the one that refuses
 * to open until this succeeds, because it reads columns this update adds.
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

function runMigrations(): Promise<MigrationResult> {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      ["scripts/db-migrate.mjs", "up"],
      { cwd: process.cwd(), timeout: 25_000, env: process.env },
      (error) => {
        if (error) {
          console.error("Pending migrations were not applied.", error.message);
          resolve({
            ok: false,
            error: "The till's books update did not apply. The register stays closed until it does.",
          });
          return;
        }
        resolve({ ok: true });
      },
    );
    child.stdout?.on("data", (chunk) => console.log(String(chunk)));
    child.stderr?.on("data", (chunk) => console.error(String(chunk)));
  });
}
