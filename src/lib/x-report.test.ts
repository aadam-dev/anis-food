import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildXReport } from "./x-report";

const base = {
  openingFloat: 200,
  openingMomo: 50,
  orders: [] as Parameters<typeof buildXReport>[0]["orders"],
  movements: [] as Parameters<typeof buildXReport>[0]["movements"],
};

describe("buildXReport", () => {
  it("keeps Bolt out of the drawer and out of sales until it is paid", () => {
    const report = buildXReport({
      ...base,
      orders: [
        { paymentMethod: "CASH", paymentStatus: "PAID", status: "COMPLETED", total: 40 },
        { paymentMethod: "BOLT_FOOD", paymentStatus: "PENDING", status: "PREPARING", total: 80 },
        { paymentMethod: "BOLT_FOOD", paymentStatus: "PAID", status: "COMPLETED", total: 25 },
      ],
    });

    assert.equal(report.gross, 65);
    assert.equal(report.cashSales, 40);
    assert.equal(report.expectedCash, 240);
    assert.equal(report.boltAwaiting.count, 1);
    assert.equal(report.boltAwaiting.amount, 80);
    assert.equal(report.byTender.find((entry) => entry.method === "BOLT_FOOD")?.amount, 25);
  });

  it("leaves voids and refunds out of sales", () => {
    const report = buildXReport({
      ...base,
      orders: [
        { paymentMethod: "CASH", paymentStatus: "PAID", status: "COMPLETED", total: 30 },
        { paymentMethod: "CASH", paymentStatus: "PENDING", status: "CANCELLED", total: 12 },
        { paymentMethod: "MOMO", paymentStatus: "REFUNDED", status: "CANCELLED", total: 18 },
      ],
    });

    assert.equal(report.gross, 30);
    assert.equal(report.salesCount, 1);
    assert.deepEqual(report.voids, { count: 1, amount: 12 });
    assert.deepEqual(report.refunds, { count: 1, amount: 18 });
    assert.equal(report.expectedCash, 230);
    assert.equal(report.expectedMomo, 50);
  });

  it("treats a deposit as a transfer, not a spend, and moves MoMo when it lands there", () => {
    const report = buildXReport({
      ...base,
      openingFloat: 200,
      orders: [{ paymentMethod: "CASH", paymentStatus: "PAID", status: "COMPLETED", total: 100 }],
      movements: [
        { direction: "OUT", kind: "SPEND", amount: 20, reason: "Gas", destination: null },
        { direction: "OUT", kind: "DEPOSIT", amount: 60, reason: "Banking", destination: "MOMO" },
        { direction: "IN", kind: "IN", amount: 10, reason: "Change", destination: null },
      ],
    });

    assert.equal(report.spends.amount, 20);
    assert.equal(report.deposits.momo, 60);
    assert.equal(report.deposits.bank, 0);
    assert.equal(report.cashIn.amount, 10);
    assert.equal(report.expectedCash, 230);
    assert.equal(report.expectedMomo, 110);
    assert.notEqual(report.spends.amount, report.spends.amount + report.deposits.momo);
  });

  it("splits a paid bill into its legs", () => {
    const report = buildXReport({
      ...base,
      openingMomo: null,
      orders: [
        {
          paymentMethod: "SPLIT",
          paymentStatus: "PAID",
          status: "COMPLETED",
          total: 50,
          splitPayments: [
            { method: "CASH", amount: 20 },
            { method: "CARD", amount: 30 },
          ],
        },
      ],
    });

    assert.equal(report.gross, 50);
    assert.equal(report.cashSales, 20);
    assert.equal(report.expectedCash, 220);
    assert.equal(report.expectedMomo, null);
    assert.equal(report.byTender.find((entry) => entry.method === "CARD")?.amount, 30);
  });
});
