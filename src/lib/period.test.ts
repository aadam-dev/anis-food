import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePeriod, previousPeriod, addDays, dayCount, daysIn } from "./period";

const TODAY = "2026-10-07"; // a Wednesday

test("presets resolve to inclusive business-day ranges", () => {
  assert.deepEqual(pick(resolvePeriod({ period: "today" }, "month", TODAY)), ["2026-10-07", "2026-10-07"]);
  assert.deepEqual(pick(resolvePeriod({ period: "yesterday" }, "month", TODAY)), ["2026-10-06", "2026-10-06"]);
  // Weeks start Monday.
  assert.deepEqual(pick(resolvePeriod({ period: "week" }, "month", TODAY)), ["2026-10-05", "2026-10-07"]);
  assert.deepEqual(pick(resolvePeriod({ period: "last-week" }, "month", TODAY)), ["2026-09-28", "2026-10-04"]);
  assert.deepEqual(pick(resolvePeriod({ period: "month" }, "today", TODAY)), ["2026-10-01", "2026-10-07"]);
  assert.deepEqual(pick(resolvePeriod({ period: "last-month" }, "today", TODAY)), ["2026-09-01", "2026-09-30"]);
});

test("last month handles January and leap years", () => {
  assert.deepEqual(pick(resolvePeriod({ period: "last-month" }, "today", "2027-01-15")), ["2026-12-01", "2026-12-31"]);
  assert.deepEqual(pick(resolvePeriod({ period: "last-month" }, "today", "2028-03-02")), ["2028-02-01", "2028-02-29"]);
});

test("custom ranges are validated, ordered and capped", () => {
  const swapped = resolvePeriod({ from: "2026-10-05", to: "2026-10-01" }, "month", TODAY);
  assert.deepEqual(pick(swapped), ["2026-10-01", "2026-10-05"]);
  assert.equal(swapped.preset, "custom");
  const long = resolvePeriod({ from: "2024-01-01", to: "2026-01-01" }, "month", TODAY);
  assert.equal(dayCount(long.from, long.to), 366);
  // Garbage falls back to the default rather than throwing.
  assert.deepEqual(pick(resolvePeriod({ from: "nope" }, "today", TODAY)), [TODAY, TODAY]);
});

test("old month= and day= links keep working", () => {
  assert.deepEqual(pick(resolvePeriod({ month: "2026-02" }, "today", TODAY)), ["2026-02-01", "2026-02-28"]);
  assert.deepEqual(pick(resolvePeriod({ day: "2026-09-12" }, "today", TODAY)), ["2026-09-12", "2026-09-12"]);
});

test("previous period is the same length, immediately before", () => {
  assert.deepEqual(previousPeriod({ from: "2026-10-01", to: "2026-10-07" }), { from: "2026-09-24", to: "2026-09-30" });
  assert.deepEqual(previousPeriod({ from: "2026-10-07", to: "2026-10-07" }), { from: "2026-10-06", to: "2026-10-06" });
});

test("day helpers cross month boundaries", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.deepEqual(daysIn("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
});

function pick(period: { from: string; to: string }) {
  return [period.from, period.to];
}
