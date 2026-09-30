import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAlreadyThere, splitSql } from "./sql-statements";

describe("splitSql", () => {
  it("splits a migration into one statement per command", () => {
    const sql = `
-- CreateEnum
CREATE TYPE "CashMovementKind" AS ENUM ('IN', 'SPEND', 'DEPOSIT');

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN "kind" "CashMovementKind" NOT NULL DEFAULT 'IN';
`;
    const statements = splitSql(sql);
    assert.equal(statements.length, 2);
    assert.match(statements[0], /CREATE TYPE/);
    assert.match(statements[1], /ADD COLUMN/);
  });

  it("keeps semicolons that live inside a string", () => {
    const sql = `UPDATE "Setting" SET "value" = 'a;b' WHERE "key" = 'pos_theme';`;
    assert.deepEqual(splitSql(sql), [
      `UPDATE "Setting" SET "value" = 'a;b' WHERE "key" = 'pos_theme'`,
    ]);
  });

  it("keeps a doubled quote inside a string", () => {
    const sql = `UPDATE "User" SET "name" = 'O''Brien' WHERE "email" = 'a@b.c';`;
    assert.equal(splitSql(sql).length, 1);
    assert.match(splitSql(sql)[0], /O''Brien/);
  });

  it("drops a file that is only comments", () => {
    assert.deepEqual(splitSql("-- nothing to do\n"), []);
  });
});

describe("isAlreadyThere", () => {
  it("recognises duplicate column and type", () => {
    assert.equal(isAlreadyThere({ code: "42701" }), true);
    assert.equal(isAlreadyThere({ code: "42710" }), true);
    assert.equal(isAlreadyThere({ code: "42P01" }), false);
    assert.equal(isAlreadyThere(new Error("nope")), false);
  });
});
