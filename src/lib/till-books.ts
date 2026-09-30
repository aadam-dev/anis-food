import "server-only";
import { prisma } from "@/lib/db";
import { ensureMigrations, type MigrationResult } from "@/lib/ensure-migrations";

/**
 * The till may render only after the cash-movement books columns exist.
 *
 * Migrate is attempted first, but a failed child process must not keep the
 * register closed when `CashMovement.kind` is already on the database — that is
 * the Vercel case where `pg` was missing or the post-migrate snapshot copy
 * hit a read-only filesystem after SQL had already committed.
 */
export async function tillBooksReady(): Promise<MigrationResult> {
  if (!process.env.DATABASE_URL) return { ok: true };

  const migrated = await ensureMigrations();
  const columns = await cashMovementKindPresent();

  if (columns === true) return { ok: true };
  if (columns === "error") {
    return {
      ok: false,
      error: "The till's books could not be checked. The register stays closed until they can.",
    };
  }

  if (!migrated.ok) return migrated;
  return {
    ok: false,
    error: "The till's books update has not been applied yet. The register stays closed until it does.",
  };
}

async function cashMovementKindPresent(): Promise<true | false | "error"> {
  try {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CashMovement'
        AND column_name = 'kind'
    `;
    return rows.length > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The till's books could not be checked.";
    console.error("Till books check failed.", message);
    return "error";
  }
}
