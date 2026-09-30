import { execFile } from "node:child_process";

let started: Promise<void> | null = null;

/**
 * Apply pending SQL migrations once per server process.
 *
 * Vercel's build does not have a separate migrate step. Doing it here uses the
 * same database the running app already talks to, and a failure is logged
 * instead of taking the site down.
 */
export function ensureMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) return Promise.resolve();
  if (!started) {
    started = new Promise((resolve) => {
      const child = execFile(
        process.execPath,
        ["scripts/db-migrate.mjs", "up"],
        { cwd: process.cwd(), timeout: 25_000, env: process.env },
        (error) => {
          if (error) console.error("Pending migrations were not applied.", error.message);
          resolve();
        },
      );
      child.stdout?.on("data", (chunk) => console.log(String(chunk)));
      child.stderr?.on("data", (chunk) => console.error(String(chunk)));
    });
  }
  return started;
}
