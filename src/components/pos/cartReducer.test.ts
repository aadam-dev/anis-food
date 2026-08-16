import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cartReducer, emptyCart, cartCount, type CartState } from "./cartReducer";
import type { PosMenuItem } from "./types";

const jollof: PosMenuItem = {
  id: "item-1",
  slug: "jollof",
  name: "Jollof",
  price: 50,
  categoryId: "rice",
  imageUrl: null,
  isPopular: true,
};

const waakye: PosMenuItem = { ...jollof, id: "item-2", slug: "waakye", name: "Waakye", price: 35 };

describe("cart", () => {
  it("adds an item", () => {
    const state = cartReducer(emptyCart, { type: "add", item: jollof });
    assert.equal(state.lines.length, 1);
    assert.equal(state.lines[0].quantity, 1);
  });

  it("stacks a repeated tap instead of adding a second line", () => {
    let state = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "add", item: jollof });
    assert.equal(state.lines.length, 1);
    assert.equal(state.lines[0].quantity, 2);
  });

  it("keeps different items on separate lines", () => {
    let state = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "add", item: waakye });
    assert.equal(state.lines.length, 2);
  });

  it("removes the line when the quantity reaches zero", () => {
    let state = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "decrement", menuItemId: jollof.id });
    assert.equal(state.lines.length, 0);
  });

  it("never goes negative", () => {
    let state = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "decrement", menuItemId: jollof.id });
    state = cartReducer(state, { type: "decrement", menuItemId: jollof.id });
    assert.equal(state.lines.length, 0);
  });

  it("caps a fat-fingered quantity", () => {
    let state = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "setQuantity", menuItemId: jollof.id, quantity: 5000 });
    assert.equal(state.lines[0].quantity, 99);
  });

  it("clears completely, discount included", () => {
    let state: CartState = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "setDiscount", amount: 10 });
    state = cartReducer(state, { type: "clear" });
    assert.deepEqual(state, emptyCart);
    assert.equal(state.discount, 0, "a discount must not survive into the next customer's bill");
  });

  it("refuses a negative discount", () => {
    const state = cartReducer(emptyCart, { type: "setDiscount", amount: -5 });
    assert.equal(state.discount, 0);
  });

  it("counts items for the badge", () => {
    let state = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "add", item: jollof });
    state = cartReducer(state, { type: "add", item: waakye });
    assert.equal(cartCount(state), 3);
  });

  it("attaches a note to the right line", () => {
    let state = cartReducer(emptyCart, { type: "add", item: jollof });
    state = cartReducer(state, { type: "add", item: waakye });
    state = cartReducer(state, { type: "setNotes", menuItemId: waakye.id, notes: "No pepper" });
    assert.equal(state.lines.find((l) => l.menuItemId === waakye.id)?.notes, "No pepper");
    assert.equal(state.lines.find((l) => l.menuItemId === jollof.id)?.notes, undefined);
  });
});
