import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectedCash, momoDeposits, splitMovements, walletTotals } from "./cash";
import {
  blocksShiftClose,
  countsInDrawer,
  movementBooks,
  saleBooks,
  splitAddsUp,
} from "./till-rules";

describe("Bolt Food", () => {
  it("is not drawer cash", () => {
    const books = saleBooks("BOLT_FOOD");
    assert.equal(books.paymentStatus, "PENDING");
    assert.equal(books.needsOpenShift, true);
    assert.equal(countsInDrawer(books.paymentStatus), false);
    assert.equal(countsInDrawer("PAID"), true);
  });

  it("does not block the Z-out", () => {
    assert.equal(
      blocksShiftClose({ paymentStatus: "PENDING", paymentMethod: "BOLT_FOOD", status: "PREPARING" }),
      false,
    );
    assert.equal(
      blocksShiftClose({ paymentStatus: "PENDING", paymentMethod: "UNPAID", status: "PREPARING" }),
      true,
    );
    assert.equal(
      blocksShiftClose({ paymentStatus: "PENDING", paymentMethod: "UNPAID", status: "CANCELLED" }),
      false,
    );
  });
});

describe("split payments", () => {
  it("accepts legs that add up to the bill", () => {
    const result = splitAddsUp(30, [
      { method: "CASH", amount: 10 },
      { method: "MOMO", amount: 20 },
    ]);
    assert.equal(result.ok, true);
  });

  it("rejects a split that does not add up", () => {
    const result = splitAddsUp(30, [
      { method: "CASH", amount: 10 },
      { method: "CARD", amount: 15 },
    ]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /GH₵25.00/);
  });

  it("rejects a zero leg and Bolt inside a split", () => {
    assert.equal(splitAddsUp(20, [{ amount: 20 }, { amount: 0 }]).ok, false);
    assert.equal(
      splitAddsUp(20, [
        { method: "CASH", amount: 10 },
        { method: "BOLT_FOOD", amount: 10 },
      ]).ok,
      false,
    );
  });
});

describe("till movements and the books", () => {
  it("files a spend as an expense and takes it out of the drawer", () => {
    const books = movementBooks("SPEND");
    assert.equal(books.filesExpense, true);
    assert.equal(books.direction, "OUT");
    assert.equal(books.raisesMomo("MOMO"), false);
    assert.equal(expectedCash({ openingFloat: 200, cashRevenue: 0, cashOut: 40 }), 160);
  });

  it("a MoMo deposit lowers expected cash and raises expected MoMo", () => {
    const books = movementBooks("DEPOSIT");
    assert.equal(books.filesExpense, false);
    assert.equal(books.raisesMomo("MOMO"), true);
    assert.equal(books.raisesMomo("BANK"), false);
    const movements = [
      { direction: "OUT" as const, amount: 80, kind: "DEPOSIT" as const, destination: "MOMO" as const },
    ];
    const { cashOut } = splitMovements(movements);
    const deposits = momoDeposits(movements);
    assert.equal(expectedCash({ openingFloat: 200, cashRevenue: 50, cashOut }), 170);
    assert.equal(walletTotals({ openingMomo: 20, momoRevenue: 50, momoDeposits: deposits }).expected, 150);
  });

  it("a bank deposit leaves the drawer and does not change MoMo", () => {
    const deposits = momoDeposits([
      { direction: "OUT", amount: 80, kind: "DEPOSIT", destination: "BANK" },
    ]);
    assert.equal(deposits, 0);
    assert.equal(walletTotals({ openingMomo: 20, momoRevenue: 0, momoDeposits: deposits }).expected, 20);
  });

  it("leaves expected MoMo unknowable when the opening balance was never written down", () => {
    assert.equal(
      walletTotals({ openingMomo: null, momoRevenue: 50, momoDeposits: 80 }).expected,
      null,
    );
  });

  it("put-in is not an expense", () => {
    const books = movementBooks("IN");
    assert.equal(books.filesExpense, false);
    assert.equal(books.direction, "IN");
  });
});
