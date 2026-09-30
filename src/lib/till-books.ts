import "server-only";
import { prisma } from "@/lib/db";
import { ensureMigrations, type MigrationResult } from "@/lib/ensure-migrations";

/**
 * The till may render only after the cash-movement books columns exist.
 * A swallowed migrate used to let /pos query `kind` and crash into the public
 * error page, with no way back to the office.
 */
export async function tillBooksReady(): Promise<MigrationResult> {
  const migrated = await ensureMigrations();
  if (!migrated.ok) return migrated;
  if (!process.env.DATABASE_URL) return { ok: true };

  try {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CashMovement'
        AND column_name = 'kind'
    `;
    if (rows.length === 0) {
      return {
        ok: false,
        error: "The till's books update has not been applied yet. The register stays closed until it does.",
      };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The till's books could not be checked.";
    console.error("Till books check failed.", message);
    return {
      ok: false,
      error: "The till's books could not be checked. The register stays closed until they can.",
    };
  }
}
