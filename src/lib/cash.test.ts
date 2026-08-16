import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countedTotal,
  differenceLabel,
  drawerDifference,
  expectedCash,
  splitMovements,
  walletTotals,
} from "./cash";

describe("expectedCash", () => {
  it("is float plus cash takings plus cash in minus cash out", () => {
    assert.equal(
      expectedCash({ openingFloat: 200, cashRevenue: 1450.5, cashIn: 30, cashOut: 50 }),
      1630.5,
    );
  });

  it("defaults movements to zero", () => {
    assert.equal(expectedCash({ openingFloat: 200, cashRevenue: 100 }), 300);
  });

  it("can go below the opening float when more went out than came in", () => {
    assert.equal(expectedCash({ openingFloat: 200, cashRevenue: 0, cashOut: 250 }), -50);
  });
});

describe("walletTotals", () => {
  it("keeps 'never recorded' distinct from zero", () => {
    const untouched = walletTotals({ openingMomo: null, momoRevenue: 500 });
    assert.equal(untouched.opening, null);
    assert.equal(untouched.expected, null, "expected must be unknowable, not 500");

    const recorded = walletTotals({ openingMomo: 0, momoRevenue: 500 });
    assert.equal(recorded.opening, 0);
    assert.equal(recorded.expected, 500);
  });

  it("adds a recorded opening balance to revenue", () => {
    assert.equal(walletTotals({ openingMomo: 120.25, momoRevenue: 300 }).expected, 420.25);
  });
});

describe("drawerDifference", () => {
  it("is positive when the drawer is over", () => {
    assert.equal(drawerDifference(1000, 1012), 12);
  });

  it("is negative when the drawer is short", () => {
    assert.equal(drawerDifference(1000, 988), -12);
  });

  it("is null when nothing has been counted", () => {
    assert.equal(drawerDifference(1000, null), null);
    assert.equal(drawerDifference(null, 1000), null);
  });

  it("distinguishes a balanced drawer from an uncounted one", () => {
    assert.equal(drawerDifference(1000, 1000), 0);
    assert.notEqual(drawerDifference(1000, 1000), null);
  });
});

describe("differenceLabel", () => {
  it("speaks plainly", () => {
    assert.equal(differenceLabel(12), "Over by GH₵12.00");
    assert.equal(differenceLabel(-12), "Short by GH₵12.00");
    assert.equal(differenceLabel(0), "Balanced");
    assert.equal(differenceLabel(null), "Not counted yet");
  });

  it("never says the word 'variance'", () => {
    for (const value of [12, -12, 0, null]) {
      assert.ok(!differenceLabel(value).toLowerCase().includes("variance"));
    }
  });
});

describe("countedTotal", () => {
  it("totals a denomination breakdown", () => {
    assert.equal(countedTotal({ "50": 3, "20": 11, "1": 4, "0.5": 2 }), 375);
  });

  it("is zero for nothing counted", () => {
    assert.equal(countedTotal(null), 0);
    assert.equal(countedTotal({}), 0);
  });

  it("rejects impossible counts", () => {
    assert.throws(() => countedTotal({ "50": -1 }), RangeError);
    assert.throws(() => countedTotal({ "50": 1.5 }), RangeError);
    assert.throws(() => countedTotal({ abc: 1 }), RangeError);
  });
});

describe("splitMovements", () => {
  it("separates money in from money out", () => {
    const { cashIn, cashOut } = splitMovements([
      { direction: "IN", amount: 30 },
      { direction: "OUT", amount: 50 },
      { direction: "OUT", amount: 20.5 },
    ]);
    assert.equal(cashIn, 30);
    assert.equal(cashOut, 70.5);
  });

  it("is zero for a shift with no movements", () => {
    assert.deepEqual(splitMovements([]), { cashIn: 0, cashOut: 0 });
  });
});

describe("the drawer story end to end", () => {
  it("reconciles a full shift", () => {
    // Open with GH₵200. Cash sales of 1450.50. Gas refill 50 out, 30 in.
    const { cashIn, cashOut } = splitMovements([
      { direction: "OUT", amount: 50 },
      { direction: "IN", amount: 30 },
    ]);
    const expected = expectedCash({
      openingFloat: 200,
      cashRevenue: 1450.5,
      cashIn,
      cashOut,
    });
    assert.equal(expected, 1630.5);

    // Cashier counts the drawer and comes up GH₵0.50 short.
    const counted = countedTotal({ "200": 5, "100": 6, "20": 1, "5": 2 });
    assert.equal(counted, 1630);
    assert.equal(differenceLabel(drawerDifference(expected, counted)), "Short by GH₵0.50");
  });
});
