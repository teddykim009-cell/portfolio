const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../finance.js");

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} not within ${eps} of ${b}`);
const base = { savingsPerYear: 0, loanRate: 0, loanTermYears: 10, graceMonths: 0, incomeShare: 10 };

test("monthlyPayment matches a known amortization value", () => {
  near(F.monthlyPayment(10000, 6, 120), 111.02);
});

test("monthlyPayment handles zero rate and empty loans", () => {
  near(F.monthlyPayment(12000, 0, 120), 100);
  assert.equal(F.monthlyPayment(0, 6, 120), 0);
});

test("expectedAward multiplies amount by chance and clamps bad input", () => {
  near(F.expectedAward({ amount: 1000, chance: 50 }), 500);
  near(F.expectedAward({ amount: 1000, chance: 250 }), 1000);
  assert.equal(F.expectedAward({ amount: -5, chance: 50 }), 0);
});

test("with no aid, no savings, no interest, everything is borrowed", () => {
  const p = F.planSchool({ id: "a", name: "A", coa: 20000, grants: 0, inflation: 0 }, [], base);
  near(p.sticker, 80000);
  near(p.borrowed, 80000);
  near(p.payment, 80000 / 120);
});

test("savings that cover the bill mean no loan", () => {
  const p = F.planSchool({ id: "a", name: "A", coa: 10000, grants: 0, inflation: 0 }, [], { ...base, savingsPerYear: 10000 });
  assert.equal(p.borrowed, 0);
  assert.equal(p.payment, 0);
});

test("aid can never exceed the bill", () => {
  const p = F.planSchool({ id: "a", name: "A", coa: 10000, grants: 50000, inflation: 0 }, [{ id: "s", amount: 9000, years: 4, chance: 100, school: "" }], base);
  near(p.grants + p.scholarships, p.sticker);
  assert.equal(p.borrowed, 0);
});

test("cost inflation compounds year over year", () => {
  const p = F.planSchool({ id: "a", name: "A", coa: 100, grants: 0, inflation: 10 }, [], base);
  near(p.years[1].sticker, 110);
  near(p.years[3].sticker, 133.1);
});

test("school-specific scholarships only apply to that school", () => {
  const sch = [{ id: "s", amount: 1000, years: 4, chance: 100, school: "b" }];
  const a = F.planSchool({ id: "a", name: "A", coa: 10000, grants: 0, inflation: 0 }, sch, base);
  const b = F.planSchool({ id: "b", name: "B", coa: 10000, grants: 0, inflation: 0 }, sch, base);
  assert.equal(a.scholarships, 0);
  near(b.scholarships, 4000);
});

test("scholarship years limit how many years it pays out", () => {
  const sch = [{ id: "s", amount: 1000, years: 2, chance: 100, school: "" }];
  const p = F.planSchool({ id: "a", name: "A", coa: 10000, grants: 0, inflation: 0 }, sch, base);
  near(p.scholarships, 2000);
});

test("unsubsidized interest accrues until repayment and capitalizes", () => {
  // Borrow 1000 every year at 10% simple interest, no grace period:
  // accrual = 1000 * 0.10 * (4 + 3 + 2 + 1) = 1000, so 5000 capitalizes.
  const p = F.planSchool({ id: "a", name: "A", coa: 1000, grants: 0, inflation: 0 }, [], { ...base, loanRate: 10 });
  near(p.borrowed, 4000);
  near(p.capitalized, 5000);
});

test("grace period adds extra accrued interest", () => {
  const noGrace = F.planSchool({ id: "a", name: "A", coa: 1000, grants: 0, inflation: 0 }, [], { ...base, loanRate: 10 });
  const grace = F.planSchool({ id: "a", name: "A", coa: 1000, grants: 0, inflation: 0 }, [], { ...base, loanRate: 10, graceMonths: 6 });
  assert.ok(grace.capitalized > noGrace.capitalized);
});

test("salaryNeeded keeps payments at the chosen share of income", () => {
  const p = F.planSchool({ id: "a", name: "A", coa: 20000, grants: 0, inflation: 0 }, [], base);
  near(p.salaryNeeded, (p.payment * 12) / 0.1);
});

test("daysUntil counts whole days and rejects bad dates", () => {
  const today = new Date(2026, 10, 10);
  assert.equal(F.daysUntil("2026-11-20", today), 10);
  assert.equal(F.daysUntil("2026-11-05", today), -5);
  assert.equal(F.daysUntil("", today), null);
  assert.equal(F.daysUntil("soon", today), null);
});
