import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roundMoney } from "./money";
import {
  DISABLED_TAX,
  GHANA_STANDARD_COMPONENTS,
  GHANA_FLAT_RATE_COMPONENTS,
  taxFromGross,
  taxFromNet,
  taxBreakdown,
  type TaxConfig,
} from "./tax";

const standardInclusive: TaxConfig = {
  enabled: true,
  inclusive: true,
  components: GHANA_STANDARD_COMPONENTS,
};
const standardExclusive: TaxConfig = {
  enabled: true,
  inclusive: false,
  components: GHANA_STANDARD_COMPONENTS,
};

describe("disabled tax", () => {
  it("touches nothing", () => {
    const result = taxBreakdown(100, DISABLED_TAX);
    assert.equal(result.net, 100);
    assert.equal(result.taxTotal, 0);
    assert.equal(result.gross, 100);
    assert.deepEqual(result.lines, []);
  });
});

describe("Ghana standard, tax added on top (exclusive)", () => {
  const r = taxFromNet(100, standardExclusive);

  it("charges the three levies on the net", () => {
    const byCode = Object.fromEntries(r.lines.map((l) => [l.code, l.amount]));
    assert.equal(byCode.NHIL, 2.5);
    assert.equal(byCode.GETFUND, 2.5);
    assert.equal(byCode.COVID, 1);
  });

  it("charges VAT on net plus levies, not bare net", () => {
    const byCode = Object.fromEntries(r.lines.map((l) => [l.code, l.amount]));
    // 15% of (100 + 6) = 15.90, never 15.00
    assert.equal(byCode.VAT, 15.9);
  });

  it("totals to 21.9% and a gross of 121.90", () => {
    assert.equal(r.taxTotal, 21.9);
    assert.equal(r.gross, 121.9);
  });
});

describe("Ghana standard, price already includes tax (inclusive)", () => {
  it("backs the tax out of a 121.90 gross to a 100.00 net", () => {
    const r = taxFromGross(121.9, standardInclusive);
    assert.equal(r.net, 100);
    assert.equal(r.taxTotal, 21.9);
    assert.equal(r.gross, 121.9);
  });

  it("always reconciles: net + tax equals gross to the pesewa", () => {
    for (const gross of [10, 55.55, 80, 99.99, 150, 12345.67]) {
      const r = taxFromGross(gross, standardInclusive);
      assert.equal(roundMoney(r.net + r.taxTotal), r.gross, `failed at ${gross}`);
    }
  });
});

describe("VAT flat rate scheme (3%)", () => {
  it("adds a single 3% line and nothing else", () => {
    const config: TaxConfig = { enabled: true, inclusive: false, components: GHANA_FLAT_RATE_COMPONENTS };
    const r = taxFromNet(100, config);
    assert.equal(r.lines.length, 1);
    assert.equal(r.lines[0].code, "VFRS");
    assert.equal(r.taxTotal, 3);
    assert.equal(r.gross, 103);
  });
});
