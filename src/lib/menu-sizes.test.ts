import { test } from "node:test";
import assert from "node:assert/strict";
import { fromPrice, lineName, resolveLine, type SizedDish } from "./menu-sizes";

const jollof: SizedDish = {
  id: "d1",
  name: "Jollof with Grilled Chicken",
  price: 50,
  costPrice: null,
  isAvailable: true,
  sizes: [
    { id: "s", label: "Small", price: 50, costPrice: 18, isAvailable: true },
    { id: "l", label: "Large", price: 60, costPrice: "21.50", isAvailable: true },
    { id: "x", label: "Family", price: 150, costPrice: null, isAvailable: false },
  ],
};

test("a sized dish takes price and cost from the size", () => {
  const line = resolveLine(jollof, "l");
  assert.ok(line.ok);
  if (line.ok) {
    assert.equal(line.unitPrice, 60);
    assert.equal(line.unitCost, 21.5);
    assert.equal(line.sizeLabel, "Large");
  }
});

test("a sized dish needs an available size", () => {
  assert.equal(resolveLine(jollof).ok, false);
  assert.equal(resolveLine(jollof, "x").ok, false);
  assert.equal(resolveLine(jollof, "nope").ok, false);
});

test("a dish without sizes rejects a size and uses its own price", () => {
  const water = { ...jollof, name: "Water", price: 5, costPrice: 2, sizes: [] };
  assert.equal(resolveLine(water, "l").ok, false);
  const line = resolveLine(water);
  assert.ok(line.ok && line.unitPrice === 5 && line.unitCost === 2 && line.sizeId === null);
});

test("unavailable dishes cannot be sold", () => {
  assert.equal(resolveLine({ ...jollof, isAvailable: false }, "s").ok, false);
});

test("from price ignores unavailable sizes; names read with the size", () => {
  assert.equal(fromPrice({ price: 99, sizes: [{ price: 60, isAvailable: true }, { price: 40, isAvailable: false }] }), 60);
  assert.equal(fromPrice({ price: 99, sizes: [] }), 99);
  assert.equal(lineName("Jollof", "Large"), "Jollof · Large");
  assert.equal(lineName("Water", null), "Water");
});
