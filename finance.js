/*
 * Net Price Planner - finance engine.
 * Pure functions, no DOM access, so it runs in the browser and under `node --test`.
 * All money is in US dollars; values are rounded only for display, never mid-calculation.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Finance = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const YEARS = 4;

  /** Standard fixed-rate amortization. annualRatePct is e.g. 6.5 for 6.5%. */
  function monthlyPayment(principal, annualRatePct, months) {
    if (principal <= 0 || months <= 0) return 0;
    const r = annualRatePct / 100 / 12;
    if (r === 0) return principal / months;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  }

  /** Expected value of one scholarship in one year (amount x chance of winning). */
  function expectedAward(sch) {
    const chance = Math.min(Math.max(Number(sch.chance) || 0, 0), 100) / 100;
    return Math.max(Number(sch.amount) || 0, 0) * chance;
  }

  function appliesTo(sch, schoolId) {
    return !sch.school || sch.school === schoolId;
  }

  /**
   * Plan four years at one school.
   * Assumptions (also written up in docs/WRITEUP.md):
   *  - Cost of attendance grows by school.inflation% each year.
   *  - Grants are a flat yearly amount; grants + scholarships can never exceed the bill.
   *  - Family savings cover what they can each year; the rest is borrowed at the start of the year.
   *  - Loans are unsubsidized: simple interest accrues during school and the grace period,
   *    then capitalizes (is added to the balance) when repayment begins.
   */
  function planSchool(school, scholarships, settings) {
    const rate = Number(settings.loanRate) || 0;
    const grace = Number(settings.graceMonths) || 0;
    const years = [];
    let capitalized = 0;
    const totals = { sticker: 0, grants: 0, scholarships: 0, family: 0, borrowed: 0 };

    for (let i = 0; i < YEARS; i++) {
      const sticker = school.coa * Math.pow(1 + (Number(school.inflation) || 0) / 100, i);
      const grants = Math.min(Math.max(Number(school.grants) || 0, 0), sticker);

      let schol = 0;
      for (const s of scholarships) {
        if (appliesTo(s, school.id) && i < Math.min(Math.max(Number(s.years) || 1, 1), YEARS)) {
          schol += expectedAward(s);
        }
      }
      schol = Math.min(schol, sticker - grants);

      const net = sticker - grants - schol;
      const family = Math.min(Math.max(Number(settings.savingsPerYear) || 0, 0), net);
      const borrowed = net - family;

      const yearsUntilRepayment = YEARS - i + grace / 12;
      capitalized += borrowed * (1 + (rate / 100) * yearsUntilRepayment);

      years.push({ sticker, grants, scholarships: schol, family, borrowed });
      totals.sticker += sticker;
      totals.grants += grants;
      totals.scholarships += schol;
      totals.family += family;
      totals.borrowed += borrowed;
    }

    const months = Math.round((Number(settings.loanTermYears) || 10) * 12);
    const payment = monthlyPayment(capitalized, rate, months);
    const totalRepaid = payment * months;
    const share = (Number(settings.incomeShare) || 10) / 100;

    return {
      id: school.id,
      name: school.name,
      years,
      ...totals,
      capitalized,
      payment,
      totalRepaid,
      interest: Math.max(totalRepaid - totals.borrowed, 0),
      salaryNeeded: share > 0 ? (payment * 12) / share : 0,
    };
  }

  function planAll(schools, scholarships, settings) {
    return schools.map((s) => planSchool(s, scholarships, settings));
  }

  /** Whole days from `today` to an ISO date string (yyyy-mm-dd); null if blank/invalid. */
  function daysUntil(iso, today) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split("-").map(Number);
    const due = Date.UTC(y, m - 1, d);
    const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((due - now) / 86400000);
  }

  return { YEARS, monthlyPayment, expectedAward, planSchool, planAll, daysUntil };
});
