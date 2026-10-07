import { test } from "node:test";
import assert from "node:assert/strict";
import { editVerdict, settleDifference } from "./order-edit-rules";

const unpaid = { status: "PREPARING", paymentStatus: "PENDING", paymentMethod: "UNPAID", shiftStatus: "OPEN" as const };
const paid = { status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "CASH", shiftStatus: "OPEN" as const };

test("anyone may edit an unpaid ticket, even before a shift is open", () => {
  assert.deepEqual(editVerdict(unpaid, false), { ok: true, paid: false });
  assert.deepEqual(editVerdict({ ...unpaid, shiftStatus: null }, false), { ok: true, paid: false });
});

test("paid orders need a manager and an open shift", () => {
  assert.equal(editVerdict(paid, false).ok, false);
  assert.deepEqual(editVerdict(paid, true), { ok: true, paid: true });
  assert.equal(editVerdict({ ...paid, shiftStatus: null }, true).ok, false);
});

test("closed shifts, voids and refunds are locked for everyone", () => {
  assert.equal(editVerdict({ ...paid, shiftStatus: "CLOSED" }, true).ok, false);
  assert.equal(editVerdict({ ...unpaid, shiftStatus: "CLOSED" }, true).ok, false);
  assert.equal(editVerdict({ ...paid, status: "CANCELLED" }, true).ok, false);
  assert.equal(editVerdict({ ...paid, paymentStatus: "REFUNDED" }, true).ok, false);
});

test("Bolt orders count as paid for editing", () => {
  const bolt = { status: "PREPARING", paymentStatus: "PENDING", paymentMethod: "BOLT_FOOD", shiftStatus: "OPEN" as const };
  assert.equal(editVerdict(bolt, false).ok, false);
  assert.equal(editVerdict(bolt, true).ok, true);
});

test("the difference says whether to collect or give back", () => {
  assert.deepEqual(settleDifference(100, 130), { kind: "collect", amount: 30 });
  assert.deepEqual(settleDifference(100, 75.5), { kind: "refund", amount: 24.5 });
  assert.deepEqual(settleDifference(100, 100.004), { kind: "none", amount: 0 });
});
