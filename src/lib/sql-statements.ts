/**
 * Split a Prisma migration file into statements the driver can run one at a time.
 *
 * node-postgres sends a multi-statement string through a protocol that rejects
 * it ("cannot insert multiple commands into a prepared statement"). Supabase's
 * transaction pooler does the same. One statement per query is what actually
 * applies.
 */
export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inSingle) {
      current += ch;
      if (ch === "'" && sql[i + 1] === "'") {
        current += sql[i + 1];
        i++;
      } else if (ch === "'") {
        inSingle = false;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      current += ch;
      continue;
    }

    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const comment = end === -1 ? sql.slice(i) : sql.slice(i, end + 1);
      current += comment;
      i += comment.length - 1;
      continue;
    }

    if (ch === ";") {
      push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  push(current);
  return statements;

  function push(raw: string) {
    const code = raw
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim();
    if (code) statements.push(raw.trim());
  }
}

/** Postgres "already there" codes. A retry after a partial apply must not fail on these. */
const ALREADY_THERE = new Set([
  "42710", // duplicate_object (types, constraints)
  "42P07", // duplicate_table / duplicate index
  "42701", // duplicate_column
  "42723", // duplicate_function
]);

export function isAlreadyThere(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return !!code && ALREADY_THERE.has(code);
}
