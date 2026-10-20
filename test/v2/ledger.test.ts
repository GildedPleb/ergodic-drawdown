import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { ModelsSheet, summaryOf } from "../../src/v2/app/models/ModelsSheet";
import { closeOnPress } from "../../src/v2/app/models/outside";
import { loadValues, pageStore, saveValues, STORE_KEY } from "../../src/v2/app/models/store";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import { strings } from "../../src/v2/app/strings";

// V32-BUILD §1M (Models pane as an asset ledger), as amended by §1V.
const render = (initialOpen: string | null, on = true): string =>
  renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: defaultModelsValues(),
      onChange: () => undefined,
      initialOpen,
      on,
    }),
  );

const rowOf = (html: string, asset: string): string =>
  /<div[^>]*role="listitem"[\s\S]*?(?=<div[^>]*role="listitem"|$)/g.exec(
    html.slice(html.indexOf(`data-asset="${asset}"`) - 40),
  )?.[0] ?? "";

test("1M: a list of Bitcoin, S&P, Inflation in that order; every row lands closed, header only", () => {
  const html = render(null);
  expect(
    html.includes('<ul class="ledger" aria-label="Assets">') ||
      html.includes('aria-label="Assets"'),
  ).toBe(true);
  expect([...html.matchAll(/data-asset="(\w+)"/g)].map((m) => m[1])).toEqual([
    "bitcoin",
    "sp",
    "inflation",
  ]);
  expect((html.match(/aria-expanded="false"/g) ?? []).length).toBe(3);
  // Closed means hidden: no settings, no trays, no bodies.
  expect(html.includes('role="combobox"')).toBe(false);
  expect(html.includes("-body")).toBe(true); // aria-controls names the body…
  expect(html.includes('id="asset-bitcoin-body"')).toBe(false); // …which isn't rendered
  expect(html.includes("tray")).toBe(false);
});

test("1V: S&P and Inflation are real stand-ins: header buttons, no tick box, normal text", () => {
  const html = render(null);
  for (const id of ["sp", "inflation"]) {
    const row = rowOf(html, id);
    expect(row.includes(`id="asset-${id}"`)).toBe(true);
    expect(row.includes('type="button"')).toBe(true);
    expect(row.includes('role="switch"') || row.includes("aria-checked")).toBe(false);
    expect(row.includes("data-state=")).toBe(false); // at rest: normal --text, not muted
    expect(row.includes(strings.models.notYet)).toBe(true);
  }
  expect(html.includes('aria-label="Show S&amp;P on chart"')).toBe(false);
  expect(rowOf(html, "bitcoin").includes("Show Bitcoin on chart")).toBe(true);
});

test("1V: the S&P body reads exactly its one line", () => {
  const html = render("sp");
  expect(strings.models.standIn("S&P")).toBe(
    "S&P isn\u2019t modelled yet. When it is, its settings will open here.",
  );
  expect(
    html.includes(
      "<p>S&amp;P isn\u2019t modelled yet. When it is, its settings will open here.</p>",
    ),
  ).toBe(true);
  expect(html.includes('role="combobox"')).toBe(false);
});

test("1V (interim): the open row's cues: ▴ (expanded), 'Bitcoin · price model', the others muted", () => {
  const html = render("bitcoin");
  const row = rowOf(html, "bitcoin");
  expect(row.includes('data-state="open"')).toBe(true);
  expect(row.includes('aria-expanded="true"')).toBe(true);
  expect(row.includes("Bitcoin \u00B7 price model")).toBe(true);
  expect(row.includes('id="v2-model"')).toBe(true);
  for (const id of ["sp", "inflation"])
    expect(rowOf(html, id).includes('data-state="dim"')).toBe(true);
  // Closed, the header reads just the name.
  const closed = rowOf(render(null), "bitcoin");
  expect(closed.includes("price model")).toBe(false);
});

test("1V: the summary names the settings: 'CAGR 28% · Bubble · 1,000 futures'", () => {
  const v = {
    ...defaultModelsValues(),
    model: "CAGR",
    variable: 28,
    walk: "Bubble",
    samples: 1000,
  };
  expect(summaryOf(v)).toBe("CAGR 28% \u00B7 Bubble \u00B7 1,000 futures");
  expect(summaryOf({ ...v, model: "Power Law Regression Median", samples: 1 })).toBe(
    "Power Law Regression Median \u00B7 Bubble \u00B7 1 future",
  );
});

const memory = (): {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  data: Map<string, string>;
} => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
};

test("1V: settings survive a reload through the one store; bad or missing data reads as defaults", () => {
  const store = memory();
  expect(loadValues(store)).toEqual(defaultModelsValues());
  const changed = { ...defaultModelsValues(), model: "CAGR", variable: 28, samples: 2500 };
  saveValues(store, changed);
  expect(store.data.has(STORE_KEY)).toBe(true);
  expect(loadValues(store)).toEqual(changed);
  store.setItem(STORE_KEY, JSON.stringify({ ...changed, model: "Not a model" }));
  expect(loadValues(store)).toEqual(defaultModelsValues());
  store.setItem(STORE_KEY, JSON.stringify({ ...changed, samples: "many" }));
  expect(loadValues(store)).toEqual(defaultModelsValues());
  store.setItem(STORE_KEY, "{not json");
  expect(loadValues(store)).toEqual(defaultModelsValues());
  const full = {
    getItem: () => null,
    setItem: () => {
      throw new Error("full");
    },
  };
  saveValues(full, changed);
  expect(loadValues(undefined)).toEqual(defaultModelsValues());
  expect(pageStore()).toBe(undefined);
});

test("1M: Bitcoin OFF still renders its tick box, unchecked", () => {
  const row = rowOf(render(null, false), "bitcoin");
  expect(row.includes("OFF")).toBe(true);
});

test("1V: a press that lands in the sheet outside the ledger closes the open row; detach stops it", () => {
  const doc = new EventTarget();
  let outside = true;
  let closes = 0;
  const detach = closeOnPress(
    doc,
    () => outside,
    () => {
      closes += 1;
    },
  );
  doc.dispatchEvent(new Event("pointerdown"));
  outside = false;
  doc.dispatchEvent(new Event("pointerdown"));
  expect(closes).toBe(1);
  detach();
  outside = true;
  doc.dispatchEvent(new Event("pointerdown"));
  expect(closes).toBe(1);
});

const PRIMITIVES = `${import.meta.dir}/../../src/v2/design/primitives`;

test("interim ledger: no row draws a box or double rule; one hairline between rows; nothing before the name", async () => {
  const css = await file(`${PRIMITIVES}/AssetRow/AssetRow.module.css`).text();
  expect(css.includes("double")).toBe(false);
  // No border shorthand but the header button's reset (border: 0).
  expect(/(^|[^-])border:\s*(?!0;)\S/m.test(css)).toBe(false);
  expect(css.includes("border-inline")).toBe(false);
  // The only rule: one hairline on the top of every row after the first.
  expect(css.match(/border-block-(start|end)\s*:[^;]*;/g)).toEqual([
    "border-block-start: var(--rule-hair) solid var(--control-line);",
  ]);
  expect(/\.root \+ \.root\s*\{\s*border-block-start/.test(css)).toBe(true);
  // The colour mark and ■ are hidden (the markup stays until Form's replacement spec).
  expect(/\.mark,\s*\.sel,[^{]*\{\s*display: none;/.test(css)).toBe(true);
  // The open row keeps its --hover fill as the cue; the body is inset 1rem on both sides.
  expect(/\[data-state="open"\]\s*\{\s*background: var\(--hover\);\s*\}/.test(css)).toBe(true);
  expect(css.includes("padding: 0 var(--tray-indent) var(--s-4);")).toBe(true);
});

test("interim ledger: the tick box is a single line (no inner rule)", async () => {
  const css = await file(`${PRIMITIVES}/TickToggle/TickToggle.module.css`).text();
  expect(css.includes("::before")).toBe(false);
  expect(css.includes("rule-double-gap")).toBe(false);
  expect(css.includes("border: var(--rule-double-line) solid var(--control-line);")).toBe(true);
});
