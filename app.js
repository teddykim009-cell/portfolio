(function () {
  "use strict";
  const KEY = "netprice.v1";
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const $ = (sel) => document.querySelector(sel);

  const EXAMPLE = () => ({
    isExample: true,
    settings: { savingsPerYear: 8000, loanRate: 6.5, loanTermYears: 10, graceMonths: 6, incomeShare: 10 },
    schools: [
      { id: "a", name: "Example private college", coa: 90000, grants: 30000, inflation: 3 },
      { id: "b", name: "Example out-of-state public", coa: 65000, grants: 8000, inflation: 3 },
      { id: "c", name: "Example in-state public", coa: 35000, grants: 2000, inflation: 3 },
    ],
    scholarships: [
      { id: "s1", name: "Example local scholarship", amount: 2500, years: 4, chance: 30, school: "", deadline: "2027-02-15" },
      { id: "s2", name: "Example merit award", amount: 10000, years: 4, chance: 50, school: "a", deadline: "" },
    ],
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.settings && Array.isArray(s.schools) && Array.isArray(s.scholarships)) return s;
      }
    } catch (e) { /* storage blocked or corrupt: fall back to example data */ }
    return EXAMPLE();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep working in memory */ }
  }
  function uid() { return "id" + Math.random().toString(36).slice(2, 9); }

  function el(tag, props, children) {
    const n = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === "text") n.textContent = v;
      else if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (children || []).forEach((c) => n.append(c));
    return n;
  }
  function cell(child, label) {
    const td = el("td", {}, [child]);
    if (label) td.dataset.label = label;
    return td;
  }

  function numberInput(value, onChange, opts) {
    const i = el("input", Object.assign({ type: "number", inputmode: "decimal", min: "0", step: "any", value: String(value) }, opts || {}));
    i.addEventListener("input", () => onChange(i.value === "" ? 0 : Number(i.value)));
    return i;
  }
  function textInput(value, onChange, label) {
    const i = el("input", { type: "text", value: value, "aria-label": label });
    i.addEventListener("input", () => onChange(i.value));
    return i;
  }
  function changed(rerenderResults) {
    state.isExample = false;
    $("#notice").hidden = true;
    save();
    if (rerenderResults !== false) renderResults();
  }

  /* ---------- assumptions ---------- */
  const SETTINGS = [
    ["savingsPerYear", "Family savings per year ($)", "0"],
    ["loanRate", "Loan interest rate (%)", "0"],
    ["loanTermYears", "Repayment length (years)", "1"],
    ["graceMonths", "Grace period after graduating (months)", "0"],
    ["incomeShare", "Max share of income for payments (%)", "1"],
  ];
  function renderSettings() {
    const box = $("#settings");
    box.textContent = "";
    SETTINGS.forEach(([key, label, min]) => {
      const input = numberInput(state.settings[key], (v) => { state.settings[key] = v; changed(); }, { min: min });
      box.append(el("label", { class: "field" }, [el("span", { text: label }), input]));
    });
  }

  /* ---------- colleges ---------- */
  function renderSchools() {
    const body = $("#schools tbody");
    body.textContent = "";
    state.schools.forEach((s) => {
      const remove = el("button", { type: "button", class: "remove", "aria-label": "Remove " + (s.name || "college"), text: "Remove" });
      remove.addEventListener("click", () => {
        state.schools = state.schools.filter((x) => x.id !== s.id);
        state.scholarships.forEach((sc) => { if (sc.school === s.id) sc.school = ""; });
        changed(false); renderSchools(); renderScholarships(); renderResults();
      });
      body.append(el("tr", {}, [
        cell(textInput(s.name, (v) => { s.name = v; changed(); refreshSchoolOptions(); }, "College name")),
        cell(numberInput(s.coa, (v) => { s.coa = v; changed(); }, { "aria-label": "Yearly cost of " + s.name })),
        cell(numberInput(s.grants, (v) => { s.grants = v; changed(); }, { "aria-label": "Yearly grants at " + s.name })),
        cell(numberInput(s.inflation, (v) => { s.inflation = v; changed(); }, { "aria-label": "Yearly cost increase percent at " + s.name })),
        cell(remove),
      ]));
    });
  }

  /* ---------- scholarships ---------- */
  function schoolSelect(sch) {
    const sel = el("select", { "aria-label": "Which college " + (sch.name || "scholarship") + " applies to" });
    sel.append(el("option", { value: "", text: "Any college" }));
    state.schools.forEach((s) => sel.append(el("option", { value: s.id, text: s.name || "Unnamed college" })));
    sel.value = sch.school || "";
    sel.addEventListener("change", () => { sch.school = sel.value; changed(); });
    sel.dataset.schol = sch.id;
    return sel;
  }
  function refreshSchoolOptions() {
    document.querySelectorAll("select[data-schol]").forEach((sel) => {
      const sch = state.scholarships.find((x) => x.id === sel.dataset.schol);
      if (!sch) return;
      sel.textContent = "";
      sel.append(el("option", { value: "", text: "Any college" }));
      state.schools.forEach((s) => sel.append(el("option", { value: s.id, text: s.name || "Unnamed college" })));
      sel.value = sch.school || "";
    });
  }
  function dueNote(iso) {
    const d = Finance.daysUntil(iso, new Date());
    const n = el("span", { class: "due" });
    if (d === null) return n;
    if (d < 0) n.textContent = "Deadline passed";
    else if (d === 0) { n.textContent = "Due today"; n.classList.add("soon"); }
    else { n.textContent = "Due in " + d + (d === 1 ? " day" : " days"); if (d <= 30) n.classList.add("soon"); }
    return n;
  }
  function renderScholarships() {
    const body = $("#scholarships tbody");
    body.textContent = "";
    if (!state.scholarships.length) {
      body.append(el("tr", {}, [el("td", { colspan: "7", class: "empty", text: "No scholarships yet. Add one to see how it changes what you borrow." })]));
      return;
    }
    state.scholarships.forEach((sch) => {
      const remove = el("button", { type: "button", class: "remove", "aria-label": "Remove " + (sch.name || "scholarship"), text: "Remove" });
      remove.addEventListener("click", () => {
        state.scholarships = state.scholarships.filter((x) => x.id !== sch.id);
        changed(false); renderScholarships(); renderResults();
      });
      const due = el("input", { type: "date", value: sch.deadline || "", "aria-label": "Deadline for " + sch.name });
      const note = el("span", {});
      note.append(dueNote(sch.deadline));
      due.addEventListener("input", () => { sch.deadline = due.value; changed(false); note.textContent = ""; note.append(dueNote(sch.deadline)); });
      body.append(el("tr", {}, [
        cell(textInput(sch.name, (v) => { sch.name = v; changed(false); }, "Scholarship name")),
        cell(numberInput(sch.amount, (v) => { sch.amount = v; changed(); }, { "aria-label": "Yearly amount of " + sch.name })),
        cell(numberInput(sch.years, (v) => { sch.years = Math.min(Math.max(Math.round(v) || 1, 1), 4); changed(); }, { min: "1", max: "4", step: "1", "aria-label": "Years " + sch.name + " pays out" })),
        cell(numberInput(sch.chance, (v) => { sch.chance = Math.min(v, 100); changed(); }, { max: "100", "aria-label": "Percent chance of winning " + sch.name })),
        cell(schoolSelect(sch)),
        cell(el("div", {}, [due, note])),
        cell(remove),
      ]));
    });
  }

  /* ---------- results ---------- */
  function renderResults() {
    const plans = Finance.planAll(state.schools, state.scholarships, state.settings);
    const legend = $("#legend"), bars = $("#bars"), detail = $("#detail");
    legend.textContent = ""; bars.textContent = ""; detail.textContent = "";

    if (!plans.length) {
      bars.append(el("p", { class: "empty", text: "Add a college to see what it would cost you." }));
      return;
    }
    [["aid", "Grants and scholarships (free money)"], ["family", "Family savings"], ["loan", "Loans you repay"]].forEach(([cls, text]) => {
      legend.append(el("li", {}, [el("span", { class: "swatch " + cls }), el("span", { text: text })]));
    });

    const maxSticker = Math.max.apply(null, plans.map((p) => p.sticker)) || 1;
    plans.forEach((p) => {
      const aid = p.grants + p.scholarships;
      const pct = (v) => (v / maxSticker * 100).toFixed(2) + "%";
      const bar = el("div", { class: "bar", role: "img", "aria-label": p.name + ": " + usd.format(aid) + " in aid, " + usd.format(p.family) + " from savings, " + usd.format(p.borrowed) + " borrowed" }, [
        el("div", { class: "aid", style: "width:" + pct(aid) }),
        el("div", { class: "family", style: "width:" + pct(p.family) }),
        el("div", { class: "loan", style: "width:" + pct(p.borrowed) }),
      ]);
      bars.append(el("div", { class: "school" }, [
        el("div", { class: "school-head" }, [
          el("strong", { text: p.name || "Unnamed college" }),
          el("span", { text: p.borrowed > 0 ? "You would borrow " + usd.format(p.borrowed) : "No loans needed" }),
        ]),
        bar,
        el("div", { class: "school-nums" }, [
          el("span", { text: "Aid " + usd.format(aid) }),
          el("span", { text: "Savings " + usd.format(p.family) }),
          el("span", { text: "Loans " + usd.format(p.borrowed) }),
        ]),
      ]));
    });

    const rows = [
      ["Four-year sticker cost", (p) => p.sticker, false],
      ["Grants", (p) => p.grants, false],
      ["Scholarships (expected)", (p) => p.scholarships, false],
      ["Family savings used", (p) => p.family, false],
      ["Borrowed", (p) => p.borrowed, true, "min"],
      ["Interest paid over the loan", (p) => p.interest, false],
      ["Monthly payment", (p) => p.payment, true, "min"],
      ["Total repaid", (p) => p.totalRepaid, false],
      ["Salary needed to stay under " + (Number(state.settings.incomeShare) || 10) + "% of income", (p) => p.salaryNeeded, false, "min"],
    ];
    const head = el("tr", {}, [el("th", { scope: "col", text: "Four-year view" })].concat(plans.map((p) => el("th", { scope: "col", text: p.name || "Unnamed" }))));
    detail.append(el("thead", {}, [head]));
    const tb = el("tbody");
    rows.forEach(([label, fn, key, best]) => {
      const vals = plans.map(fn);
      const lowest = Math.min.apply(null, vals);
      const tr = el("tr", key ? { class: "key" } : {}, [el("th", { scope: "row", text: label })]);
      vals.forEach((v) => {
        const td = el("td", { text: usd.format(v) });
        if (best === "min" && plans.length > 1 && v === lowest) td.className = "best";
        tr.append(td);
      });
      tb.append(tr);
    });
    detail.append(tb);
  }

  /* ---------- wiring ---------- */
  $("#add-school").addEventListener("click", () => {
    state.schools.push({ id: uid(), name: "New college", coa: 50000, grants: 0, inflation: 3 });
    changed(false); renderSchools(); renderScholarships(); renderResults();
  });
  $("#add-schol").addEventListener("click", () => {
    state.scholarships.push({ id: uid(), name: "New scholarship", amount: 1000, years: 1, chance: 25, school: "", deadline: "" });
    changed(false); renderScholarships(); renderResults();
  });
  $("#reset").addEventListener("click", () => {
    state = EXAMPLE(); save(); renderAll();
  });

  function renderAll() {
    $("#notice").hidden = !state.isExample;
    renderSettings(); renderSchools(); renderScholarships(); renderResults();
  }
  renderAll();
})();
