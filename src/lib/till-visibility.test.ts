import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UserRole } from "@/generated/prisma";
import { seesAllTillOrders, tillStaffFilter } from "./till-visibility";

describe("till order visibility", () => {
  it("lets the owner, the manager and IT see the whole shift", () => {
    assert.equal(seesAllTillOrders(UserRole.OWNER), true);
    assert.equal(seesAllTillOrders(UserRole.MANAGER), true);
    assert.equal(seesAllTillOrders(UserRole.SUPER_ADMIN), true);
    assert.deepEqual(tillStaffFilter(UserRole.OWNER, "karim"), {});
  });

  it("limits a cashier to the tickets they rang", () => {
    assert.equal(seesAllTillOrders(UserRole.CASHIER), false);
    assert.deepEqual(tillStaffFilter(UserRole.CASHIER, "maxwell"), { staffId: "maxwell" });
  });

  it("does not open the till's books to an accountant", () => {
    assert.equal(seesAllTillOrders(UserRole.ACCOUNTANT), false);
  });
});
