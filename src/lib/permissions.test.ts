import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UserRole } from "@/generated/prisma";
import { canAccess, canVoidAtTill } from "./permissions";

describe("voiding at the till", () => {
  it("is for managers and owners", () => {
    assert.equal(canVoidAtTill(UserRole.OWNER), true);
    assert.equal(canVoidAtTill(UserRole.SUPER_ADMIN), true);
    assert.equal(canVoidAtTill(UserRole.MANAGER), true);
  });

  it("is never for a cashier", () => {
    assert.equal(canVoidAtTill(UserRole.CASHIER), false);
  });

  it("needs till access too", () => {
    // An accountant reads orders in the back office but does not work the till.
    assert.equal(canVoidAtTill(UserRole.ACCOUNTANT), false);
    assert.equal(canVoidAtTill(null), false);
  });
});

describe("filing expenses from the till", () => {
  it("is not open to cashiers", () => {
    assert.equal(canAccess(UserRole.CASHIER, "expenses"), false);
    assert.equal(canAccess(UserRole.MANAGER, "expenses"), true);
  });
});
