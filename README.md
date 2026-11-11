# Net Price Planner

Compare what each college really costs after aid, then see what the loans look like.

Sticker prices are not what families pay. This tool takes each college's yearly cost and grants, adds the scholarships you're chasing (weighted by your honest odds of winning), and shows for every school:

- how much you would borrow over four years,
- the monthly payment and total interest after graduation,
- the salary you would need to keep payments under a share of your income you choose.

**Live demo:** `https://<your-username>.github.io/<repo-name>/` (see "Deploy" below)

## Why I built it

I'm a high school senior comparing colleges, and I kept ending up with spreadsheets that stopped at "tuition minus aid." The number that actually matters is what you still owe ten years later. This project turns that into something I can change one assumption at a time and watch.

## How it works

The math lives in `finance.js` as pure functions with no DOM code, so it can be unit-tested on its own. `app.js` only handles the page.

For each school, over four years:

1. Cost of attendance grows by the yearly increase you enter (default 3%).
2. Grants are a flat yearly amount. Grants plus scholarships can never exceed the bill.
3. Each scholarship counts as `amount x chance of winning`, only for the years it pays out, and only at the college it applies to.
4. Your family's savings cover what they can each year; the rest is borrowed at the start of that year.
5. Loans are treated as unsubsidized: simple interest builds up during school and the grace period, then is added to the balance when repayment begins.
6. The monthly payment uses standard fixed-rate amortization.

## Run it

No build step and no dependencies.

```bash
# open the page
open index.html          # or just double-click it

# run the tests (Node 20+)
npm test
```

## Deploy to GitHub Pages

1. Create a new GitHub repository and push this folder to the `main` branch.
2. In the repo, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Push any change. The workflow in `.github/workflows/pages.yml` runs the tests first and only deploys if they pass.

## Privacy

Everything runs in your browser. Numbers you type are saved in your browser's local storage and are never sent anywhere. There is no backend, no account, and no analytics.

## What it leaves out

This is a planning estimate, not financial advice. It does not model federal loan rules (subsidized loans, borrowing limits), income-driven repayment, Pell grants, work-study, taxes, or loans that change rate. Scholarship odds are treated as an average, so it shows the expected result, not the best or worst case. The example data is made up; use each school's net price calculator for real figures.

## Project layout

```
index.html, styles.css   the page
app.js                   rendering and input handling
finance.js               the calculations (tested)
test/finance.test.js     unit tests (node:test, no packages)
docs/WRITEUP.md          the design decisions in more detail
```

## License

MIT
