import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyNumpadKey } from "./Numpad";

const qty = { maxDigits: 3, allowDecimal: false };
const money = { maxDigits: 7, allowDecimal: true };

describe("numpad", () => {
  it("builds a quantity and stops at three digits", () => {
    let value = "";
    for (const key of ["1", "2", "5", "9"]) value = applyNumpadKey(value, key, qty);
    assert.equal(value, "125");
  });

  it("replaces a lone zero instead of leading with it", () => {
    assert.equal(applyNumpadKey("0", "7", qty), "7");
  });

  it("ignores a decimal point on a quantity", () => {
    assert.equal(applyNumpadKey("12", ".", qty), "12");
  });

  it("allows two decimal places on money and no more", () => {
    let value = "";
    for (const key of ["4", "5", ".", "5", "0", "1"]) value = applyNumpadKey(value, key, money);
    assert.equal(value, "45.50");
  });

  it("starts a bare decimal with a zero", () => {
    assert.equal(applyNumpadKey("", ".", money), "0.");
  });

  it("backspaces and clears", () => {
    assert.equal(applyNumpadKey("123", "back", qty), "12");
    assert.equal(applyNumpadKey("123", "clear", qty), "");
  });
});
