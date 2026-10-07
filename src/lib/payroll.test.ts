import { test } from "node:test";
import assert from "node:assert/strict";
import { payLine } from "./payroll";

test("monthly pay ignores units", () => {
  const pay = payLine({ salaryType: "MONTHLY", rate: 1500, units: 12, bonuses: 100 });
  assert.equal(pay.base, 1500);
  assert.equal(pay.net, 1600);
});

test("daily and hourly pay multiply the rate", () => {
  assert.equal(payLine({ salaryType: "DAILY", rate: 80, units: 22 }).base, 1760);
  assert.equal(payLine({ salaryType: "HOURLY", rate: 12.5, units: 41 }).base, 512.5);
});

test("SSNIT takes 5.5% of base only, on top of other deductions", () => {
  const pay = payLine({ salaryType: "MONTHLY", rate: 2000, units: 0, bonuses: 300, otherDeductions: 50, ssnit: true });
  assert.equal(pay.ssnit, 110);
  assert.equal(pay.deductions, 160);
  assert.equal(pay.net, 2140);
  assert.match(pay.note() ?? "", /SSNIT 5.5%: 110.00/);
});

test("no deductions leaves no note for monthly pay", () => {
  assert.equal(payLine({ salaryType: "MONTHLY", rate: 1000, units: 0 }).note(), null);
});
