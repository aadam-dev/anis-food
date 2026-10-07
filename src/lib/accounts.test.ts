import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { balanceOf, expenseAccount, statementOf, type Flow } from "./accounts";

const at = (day: string, hour = 12) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
const flow = (partial: Partial<Flow> & Pick<Flow, "account" | "direction" | "amount" | "at">): Flow => ({
  label: "x",
  kind: "TEST",
  ...partial,
});

describe("money accounts", () => {
  const flows: Flow[] = [
    flow({ account: "MOMO", direction: "IN", amount: 300, at: at("2026-10-01"), kind: "SALES" }),
    flow({ account: "MOMO", direction: "IN", amount: 500, at: at("2026-10-02"), opening: true, kind: "OPENING_BALANCE" }),
    flow({ account: "MOMO", direction: "IN", amount: 200, at: at("2026-10-03"), kind: "TILL_DEPOSIT" }),
    flow({ account: "MOMO", direction: "OUT", amount: 150, at: at("2026-10-04"), kind: "PAYROLL" }),
    flow({ account: "BANK", direction: "IN", amount: 1000, at: at("2026-10-04"), kind: "BOLT_PAYOUT" }),
  ];

  it("starts again from the latest opening balance", () => {
    // 300 before the opening balance is ignored: 500 + 200 - 150.
    assert.equal(balanceOf(flows.filter((f) => f.account === "MOMO"), at("2026-10-05")), 550);
  });

  it("only counts movements up to the moment asked", () => {
    assert.equal(balanceOf(flows.filter((f) => f.account === "MOMO"), at("2026-10-03", 18)), 700);
  });

  it("builds a statement with a running balance", () => {
    const statement = statementOf("MOMO", flows, at("2026-10-03", 0), at("2026-10-05", 0));
    assert.equal(statement.opening, 500);
    assert.deepEqual(
      statement.lines.map((line) => line.balance),
      [700, 550],
    );
    assert.equal(statement.closing, 550);
    assert.equal(statement.moneyIn, 200);
    assert.equal(statement.moneyOut, 150);
  });

  it("restarts the running total at an opening balance inside the period", () => {
    const statement = statementOf("MOMO", flows, at("2026-10-01", 0), at("2026-10-05", 0));
    assert.equal(statement.opening, 0);
    assert.deepEqual(
      statement.lines.map((line) => line.balance),
      [500, 700, 550],
    );
  });

  it("keeps accounts apart", () => {
    assert.equal(balanceOf(flows.filter((f) => f.account === "BANK"), at("2026-10-05")), 1000);
  });

  it("maps how an expense was paid to the account it left", () => {
    assert.equal(expenseAccount("MOMO"), "MOMO");
    assert.equal(expenseAccount("BANK_TRANSFER"), "BANK");
    assert.equal(expenseAccount("CARD"), "BANK");
    assert.equal(expenseAccount("CASH"), "SAFE");
  });
});
