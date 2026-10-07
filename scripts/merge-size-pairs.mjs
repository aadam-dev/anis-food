#!/usr/bin/env node
/**
 * One-off: turn dishes that were entered once per portion, like
 *
 *   Regular Jollof with Grilled Chicken (Small)   GH₵50
 *   Regular Jollof with Grilled Chicken (Large)   GH₵60
 *
 * into one dish with sizes Small and Large.
 *
 *   node scripts/merge-size-pairs.mjs           # dry run: prints the plan, writes nothing
 *   node scripts/merge-size-pairs.mjs --apply   # does it, in one transaction per dish
 *
 * The largest portion becomes the dish (it keeps its photo, popular flag and
 * slug) and takes the plain name. Each portion's price and cost move onto its
 * size, and the kept dish's past order lines are linked to its size. The other
 * portions are switched off, never deleted: past orders point at them, and
 * their receipts and reports must not change.
 *
 * Needs the sizes migration (20261006230322_sizes_and_order_edits) applied first.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const SIZE_ORDER = ["Small", "Medium", "Large"];
const PORTION = /^(.*\S)\s*\((Small|Medium|Large)\)\s*$/i;

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

const label = (word) => word[0].toUpperCase() + word.slice(1).toLowerCase();

/** "Large portion of authentic jollof rice…" → "Authentic jollof rice…" */
function plainDescription(text) {
  const stripped = text.replace(/^(small|medium|large)\s+portion\s+of\s+/i, "");
  return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : text;
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check .env.");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const { rows: table } = await client.query(`SELECT to_regclass('"MenuItemSize"') AS name`);
    if (!table[0].name) {
      throw new Error("The MenuItemSize table does not exist. Apply the sizes migration first (npm run db:migrate).");
    }

    const { rows: dishes } = await client.query(`
      SELECT m.id, m.slug, m.name, m.description, m.price, m."costPrice", m."isAvailable", m."categoryId",
             (SELECT count(*) FROM "MenuItemSize" s WHERE s."menuItemId" = m.id)::int AS "sizeCount",
             (SELECT count(*) FROM "OrderItem" o WHERE o."menuItemId" = m.id)::int AS sold
      FROM "MenuItem" m
      ORDER BY m."categoryId", m.name`);

    // Group live portions of the same dish in the same category.
    const groups = new Map();
    for (const dish of dishes) {
      const match = dish.name.match(PORTION);
      if (!match || !dish.isAvailable) continue;
      const key = `${dish.categoryId}::${match[1].toLowerCase()}`;
      const group = groups.get(key) ?? { base: match[1], portions: [] };
      group.portions.push({ ...dish, size: label(match[2]) });
      groups.set(key, group);
    }

    const plans = [...groups.values()]
      .filter((group) => group.portions.length >= 2)
      .filter((group) => new Set(group.portions.map((p) => p.size)).size === group.portions.length)
      .map((group) => {
        const portions = [...group.portions].sort(
          (a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size),
        );
        const keeper = portions[portions.length - 1];
        return { base: group.base, portions, keeper };
      })
      .filter((plan) => {
        if (plan.keeper.sizeCount > 0) {
          console.log(`Skipping "${plan.base}": ${plan.keeper.name} already has sizes.`);
          return false;
        }
        return true;
      });

    if (plans.length === 0) {
      console.log("Nothing to merge: no live dishes named like “… (Small)” / “… (Large)” in the same category.");
      return;
    }

    for (const plan of plans) {
      console.log(`\n${plan.base}`);
      console.log(`  becomes one dish (kept: ${plan.keeper.slug}, ${plan.keeper.sold} past order lines)`);
      for (const portion of plan.portions) {
        const cost = portion.costPrice === null ? "no cost" : `cost GH₵${portion.costPrice}`;
        const fate = portion.id === plan.keeper.id ? "the dish itself" : `switched off (${portion.sold} past order lines keep it)`;
        console.log(`  · ${portion.size.padEnd(6)} GH₵${portion.price}, ${cost}  ← ${portion.slug}: ${fate}`);
      }
    }

    if (!APPLY) {
      console.log("\nDry run. Nothing was changed. Run again with --apply to do it.");
      return;
    }

    for (const plan of plans) {
      await client.query("BEGIN");
      try {
        for (const [index, portion] of plan.portions.entries()) {
          const sizeId = randomUUID();
          await client.query(
            `INSERT INTO "MenuItemSize" (id, "menuItemId", label, price, "costPrice", "sortOrder", "isAvailable", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, true, now(), now())`,
            [sizeId, plan.keeper.id, portion.size, portion.price, portion.costPrice, index],
          );
          // The kept dish's past sales were all this size: link them, so costing
          // the size later fills in their profit too. Names on receipts are untouched.
          if (portion.id === plan.keeper.id) {
            await client.query(
              `UPDATE "OrderItem" SET "sizeId" = $1, "sizeLabel" = $2 WHERE "menuItemId" = $3 AND "sizeId" IS NULL`,
              [sizeId, portion.size, plan.keeper.id],
            );
          }
        }
        const cheapest = Math.min(...plan.portions.map((portion) => Number(portion.price)));
        await client.query(
          `UPDATE "MenuItem" SET name = $2, description = $3, price = $4, "costPrice" = NULL, "updatedAt" = now() WHERE id = $1`,
          [plan.keeper.id, plan.base, plainDescription(plan.keeper.description ?? ""), cheapest],
        );
        const others = plan.portions.filter((portion) => portion.id !== plan.keeper.id).map((portion) => portion.id);
        await client.query(`UPDATE "MenuItem" SET "isAvailable" = false, "updatedAt" = now() WHERE id = ANY($1)`, [others]);
        await client.query("COMMIT");
        console.log(`Merged: ${plan.base}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    console.log("\nDone. The website menu refreshes within a minute; the till on its next menu load.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
