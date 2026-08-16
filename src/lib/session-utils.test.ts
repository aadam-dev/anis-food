import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessDay,
  businessDayRange,
  callNumber,
  formatOrderNumber,
  isStaleSession,
} from "./session-utils";

describe("businessDay", () => {
  it("uses Accra time, not the machine's clock", () => {
    // 23:30 UTC on the 16th is still the 16th in Accra (UTC+0).
    assert.equal(businessDay(new Date("2026-08-16T23:30:00Z")), "2026-08-16");
    assert.equal(businessDay(new Date("2026-08-17T00:10:00Z")), "2026-08-17");
  });

  it("is stable across the year — Accra has no daylight saving", () => {
    assert.equal(businessDay(new Date("2026-01-15T12:00:00Z")), "2026-01-15");
    assert.equal(businessDay(new Date("2026-07-15T12:00:00Z")), "2026-07-15");
  });
});

describe("isStaleSession", () => {
  it("is fine for a long Saturday shift", () => {
    // Opened 09:00, still trading at 22:45 the same day.
    assert.equal(
      isStaleSession(new Date("2026-08-15T09:00:00Z"), new Date("2026-08-15T22:45:00Z")),
      false,
    );
  });

  it("catches a till left open overnight", () => {
    assert.equal(
      isStaleSession(new Date("2026-08-15T22:00:00Z"), new Date("2026-08-16T08:00:00Z")),
      true,
    );
  });

  it("catches one left open for days", () => {
    assert.equal(
      isStaleSession(new Date("2026-08-10T10:00:00Z"), new Date("2026-08-16T10:00:00Z")),
      true,
    );
  });
});

describe("businessDayRange", () => {
  it("spans exactly 24 hours", () => {
    const { start, end } = businessDayRange("2026-08-16");
    assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
  });

  it("contains an order rung at 22:45 that day", () => {
    const { start, end } = businessDayRange("2026-08-15");
    const order = new Date("2026-08-15T22:45:00Z");
    assert.ok(order >= start && order < end);
  });

  it("excludes an order rung just after midnight", () => {
    const { start, end } = businessDayRange("2026-08-15");
    const order = new Date("2026-08-16T00:05:00Z");
    assert.ok(!(order >= start && order < end));
  });
});

describe("order numbers", () => {
  it("formats as ANIS-YYYYMMDD-NNNN", () => {
    assert.equal(formatOrderNumber("2026-08-16", 14), "ANIS-20260816-0014");
    assert.equal(formatOrderNumber("2026-08-16", 1), "ANIS-20260816-0001");
  });

  it("gives a short call number to shout", () => {
    assert.equal(callNumber("ANIS-20260816-0014"), "14");
    assert.equal(callNumber("ANIS-20260816-0001"), "1");
    assert.equal(callNumber("ANIS-20260816-0230"), "230");
  });
});
