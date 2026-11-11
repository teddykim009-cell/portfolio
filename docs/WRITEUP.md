# Net Price Planner: design writeup

## The problem

When you compare colleges, the first number you see is the sticker price. The numbers that matter are different: what you pay after grants and scholarships, how much of that you would have to borrow, and what the payment looks like after graduation. Most comparison tools stop at the first step, and a spreadsheet makes it painful to change one assumption (say, a scholarship you might not win) and see the whole picture move.

## What I built

A small static web app that takes yearly cost and grants for each college, a list of scholarships with deadlines and odds, and a few loan assumptions. It shows a stacked bar per college (free money, family savings, loans) and a comparison table with the borrowed amount, monthly payment, total interest, and the salary needed to keep payments under a chosen share of income.

## Decisions worth explaining

**Keep the math separate from the page.** All calculations are pure functions in `finance.js`. That made them easy to test with Node's built-in test runner, and it means a bug in the interface cannot silently change a financial number. There are 13 tests covering amortization against a known value, the zero-interest case, aid capped at the bill, school-specific scholarships, and interest capitalization.

**Scholarships are expected values.** A $2,500 award I have a 30% chance of winning counts as $750. This is simple and honest, but it hides variance: the real outcome is either $0 or $2,500. A natural next step is showing a best case and a worst case next to the average.

**Aid can never exceed the bill.** Grants and scholarships are capped at that year's cost. Real schools sometimes refund or restrict extra aid differently, so the cap errs on the cautious side.

**Interest is modeled in a way I can explain.** Each year's loan is disbursed at the start of the year and accrues simple interest until repayment begins (including a grace period). That interest is added to the balance, and the payment is standard fixed-rate amortization. This ignores origination fees and federal loan limits. I chose a simplified model I could test by hand over a more realistic one I could not verify. The unit test works through the interest arithmetic: borrowing $1,000 each year at 10% accrues exactly $1,000 of interest by graduation.

**No backend.** The numbers describe a family's finances, so nothing leaves the browser. That also meant I could host it on GitHub Pages for free, with a workflow that refuses to deploy if the tests fail.

## Limits

The model does not handle income-driven repayment, subsidized loans, taxes, work-study, or variable rates, and the example data is invented. It is a planning aid for comparing options, not a prediction.

## What I would do next

- Show best-case and worst-case outcomes for scholarships instead of only the average.
- Model federal loan limits and subsidized loans.
- Let people share a scenario through a link without a server.
- Add a "what if I get no aid" toggle to stress-test each college.
