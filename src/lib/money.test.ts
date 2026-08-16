import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changeDue,
  computeOrderTotals,
  formatGHS,
  lineTotal,
  roundMoney,
  sumMoney,
  toMoney,
} from "./money";

describe("roundMoney", () => {
  it("rounds half away from zero", () => {
    assert.equal(roundMoney(1.005), 1.01);
    assert.equal(roundMoney(2.675), 2.68);
    assert.equal(roundMoney(-1.005), -1.01);
  });

  it("survives the classic float errors", () => {
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
    assert.equal(roundMoney(1.1 * 3), 3.3);
  });

  it("leaves exact values alone", () => {
    assert.equal(roundMoney(0), 0);
    assert.equal(roundMoney(12.5), 12.5);
    assert.equal(roundMoney(140), 140);
  });

  it("rejects non-finite input rather than writing NaN to the ledger", () => {
    assert.throws(() => roundMoney(NaN), RangeError);
    assert.throws(() => roundMoney(Infinity), RangeError);
  });
});

describe("toMoney", () => {
  it("accepts the three shapes money arrives in", () => {
    assert.equal(toMoney(12.5), 12.5);
    assert.equal(toMoney("12.50"), 12.5);
    assert.equal(toMoney({ toString: () => "12.505" }), 12.51);
  });

  it("treats null and undefined as zero", () => {
    assert.equal(toMoney(null), 0);
    assert.equal(toMoney(undefined), 0);
  });

  it("rejects junk", () => {
    assert.throws(() => toMoney("abc"), RangeError);
  });
});

describe("lineTotal", () => {
  it("multiplies price by quantity", () => {
    assert.equal(lineTotal(35, 3), 105);
    assert.equal(lineTotal(12.5, 2), 25);
  });

  it("rejects fractional or negative quantities", () => {
    assert.throws(() => lineTotal(10, 1.5), RangeError);
    assert.throws(() => lineTotal(10, -1), RangeError);
  });

  it("returns zero for a zero quantity", () => {
    assert.equal(lineTotal(35, 0), 0);
  });
});

describe("sumMoney", () => {
  it("rounds once at the end, so long carts do not drift", () => {
    const lines = Array.from({ length: 100 }, () => 0.015);
    assert.equal(sumMoney(lines), 1.5);
  });

  it("is zero for an empty cart", () => {
    assert.equal(sumMoney([]), 0);
  });
});

describe("computeOrderTotals", () => {
  const lines = [
    { unitPrice: 35, quantity: 2 }, // 70
    { unitPrice: 12.5, quantity: 1 }, // 12.50
  ];

  it("totals a plain cart", () => {
    const totals = computeOrderTotals({ lines });
    assert.equal(totals.subtotal, 82.5);
    assert.equal(totals.discountAmount, 0);
    assert.equal(totals.taxAmount, 0);
    assert.equal(totals.total, 82.5);
  });

  it("applies a discount before tax", () => {
    const totals = computeOrderTotals({ lines, discountAmount: 10 });
    assert.equal(totals.taxableAmount, 72.5);
    assert.equal(totals.total, 72.5);
  });

  it("never lets a discount exceed the bill or go negative", () => {
    assert.equal(computeOrderTotals({ lines, discountAmount: 999 }).total, 0);
    assert.equal(computeOrderTotals({ lines, discountAmount: -5 }).discountAmount, 0);
  });

  it("computes tax when a rate is supplied", () => {
    const totals = computeOrderTotals({ lines, taxRate: 0.125 });
    assert.equal(totals.taxAmount, 10.31);
    assert.equal(totals.total, 92.81);
  });

  it("rejects a nonsense tax rate", () => {
    assert.throws(() => computeOrderTotals({ lines, taxRate: 1 }), RangeError);
    assert.throws(() => computeOrderTotals({ lines, taxRate: -0.1 }), RangeError);
  });

  it("handles an empty cart", () => {
    assert.deepEqual(computeOrderTotals({ lines: [] }), {
      subtotal: 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxAmount: 0,
      total: 0,
    });
  });
});

describe("changeDue", () => {
  it("returns the difference", () => {
    assert.equal(changeDue(82.5, 100), 17.5);
  });

  it("never returns negative change when the customer under-tenders", () => {
    assert.equal(changeDue(82.5, 50), 0);
  });
});

describe("formatGHS", () => {
  it("always shows two decimals with the cedi symbol", () => {
    assert.equal(formatGHS(5), "GH₵5.00");
    assert.equal(formatGHS(1234.5), "GH₵1,234.50");
  });

  it("puts the sign before the symbol for negatives", () => {
    assert.equal(formatGHS(-12), "−GH₵12.00");
  });
});
