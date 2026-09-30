import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closeProblem, resolveClosingCash, saleBlockedReason } from "./shift-close";

describe("saleBlockedReason", () => {
  it("allows sales with no shift or a shift from today", () => {
    assert.equal(saleBlockedReason(null), null);
    assert.equal(
      saleBlockedReason(new Date("2026-08-15T09:00:00Z"), new Date("2026-08-15T22:45:00Z")),
      null,
    );
  });

  it("blocks new sales on a shift left open overnight", () => {
    const reason = saleBlockedReason(
      new Date("2026-08-15T22:00:00Z"),
      new Date("2026-08-16T08:00:00Z"),
    );
    assert.ok(reason);
    assert.match(reason!, /2026-08-15/);
  });
});

describe("resolveClosingCash", () => {
  it("prefers the note-by-note count over a typed total", () => {
    assert.equal(resolveClosingCash({ cashCount: { "100": 1, "20": 1 }, closingCash: 999 }), 120);
  });

  it("accepts a typed total when nothing was counted note by note", () => {
    assert.equal(resolveClosingCash({ closingCash: 85.5 }), 85.5);
    assert.equal(resolveClosingCash({ cashCount: {}, closingCash: 40 }), 40);
  });

  it("is null when nothing was counted", () => {
    assert.equal(resolveClosingCash({}), null);
    assert.equal(resolveClosingCash({ cashCount: {} }), null);
  });
});

describe("closeProblem", () => {
  it("blocks while tickets are unpaid", () => {
    assert.match(
      closeProblem({ unpaidCount: 1, expectedCash: 120, closingCash: 120 })!,
      /1 order/,
    );
  });

  it("blocks when the drawer was not counted", () => {
    assert.match(closeProblem({ unpaidCount: 0, expectedCash: 120, closingCash: null })!, /Count/);
  });

  it("closes a balanced drawer without a note", () => {
    assert.equal(closeProblem({ unpaidCount: 0, expectedCash: 120, closingCash: 120 }), null);
  });

  it("needs a note when the drawer is short or over", () => {
    assert.ok(closeProblem({ unpaidCount: 0, expectedCash: 120, closingCash: 100 }));
    assert.ok(closeProblem({ unpaidCount: 0, expectedCash: 120, closingCash: 100, notes: "  " }));
    assert.equal(
      closeProblem({
        unpaidCount: 0,
        expectedCash: 120,
        closingCash: 100,
        notes: "Paid the gas man, forgot to record",
      }),
      null,
    );
  });
});
