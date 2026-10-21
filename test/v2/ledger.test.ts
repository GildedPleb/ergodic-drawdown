import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { ModelsSheet, summaryOf } from "../../src/v2/app/models/ModelsSheet";
import {
  defaultView,
  loadValues,
  loadView,
  pageStore,
  saveValues,
  saveView,
  STORE_KEY,
  VIEW_KEY,
} from "../../src/v2/app/models/store";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import { strings } from "../../src/v2/app/strings";

// V32-BUILD §1MP (supersedes §1M, §1N, §1V, §1W, §1Y): the Models pane as an asset ledger.
const render = (initialOpen: readonly string[], on = true): string =>
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

test("1MP 3: a list of Bitcoin, S&P, Inflation in that order; every row lands closed, header only", () => {
  const html = render([]);
  expect(html.includes('role="list" aria-label="Assets"')).toBe(true);
  expect([...html.matchAll(/data-asset="(\w+)"/g)].map((m) => m[1])).toEqual([
    "bitcoin",
    "sp",
    "inflation",
  ]);
  expect((html.match(/aria-expanded="false"/g) ?? []).length).toBe(3);
  // Closed means unrendered: no settings, no bodies, and nothing points at a missing body.
  expect(html.includes('role="listbox"')).toBe(false);
  expect(html.includes("-body")).toBe(false);
});

test("1MP 5: S&P and Inflation carry inert squares, named as not yet modelled", () => {
  const html = render([]);
  for (const [id, name] of [
    ["sp", "S&amp;P"],
    ["inflation", "Inflation"],
  ] as const) {
    const row = rowOf(html, id);
    expect(row.includes(`id="asset-${id}"`)).toBe(true);
    expect(row.includes(`aria-label="${name} on chart (not yet modelled)"`)).toBe(true);
    expect(row.includes('aria-pressed="false" aria-disabled="true"')).toBe(true);
    expect(row.includes(strings.models.notYet)).toBe(true);
  }
  const btc = rowOf(html, "bitcoin");
  expect(btc.includes('aria-label="Show Bitcoin on chart"')).toBe(true);
  expect(btc.includes('aria-pressed="true"') && !btc.includes("aria-disabled")).toBe(true);
});

test("1MP: the S&P body reads exactly its one stand-in line, and no settings", () => {
  const html = render(["sp"]);
  expect(strings.models.standIn("S&P")).toBe(
    "S&P isn\u2019t modelled yet. When it is, its settings will open here.",
  );
  const row = rowOf(html, "sp");
  expect(
    row.includes(">S&amp;P isn\u2019t modelled yet. When it is, its settings will open here.</p>"),
  ).toBe(true);
  expect(row.includes('role="listbox"') || row.includes('role="slider"')).toBe(false);
});

test("1MP 10: an open row pins its header, drops its summary and flips ▾; several can be open", () => {
  const html = render(["bitcoin", "sp"]);
  const row = rowOf(html, "bitcoin");
  expect(row.includes('data-state="open"')).toBe(true);
  expect(row.includes('aria-expanded="true"')).toBe(true);
  expect(row.includes("data-pin")).toBe(true);
  expect(row.includes(summaryOf(defaultModelsValues()))).toBe(false);
  expect(row.includes('id="v2-model"')).toBe(true);
  expect(rowOf(html, "sp").includes('aria-expanded="true"')).toBe(true);
  expect(rowOf(html, "inflation").includes("data-state")).toBe(false);
  // Closed, the header reads the name and the live summary.
  expect(rowOf(render([]), "bitcoin").includes(summaryOf(defaultModelsValues()))).toBe(true);
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

test("1MP 5: Bitcoin OFF keeps its square (outline only) and dims its header", () => {
  const row = rowOf(render([], false), "bitcoin");
  expect(row.includes('data-on="false"')).toBe(true);
  expect(row.includes('aria-pressed="false"')).toBe(true);
  expect(row.includes("OFF")).toBe(false);
});

const PRIMITIVES = `${import.meta.dir}/../../src/v2/design/primitives`;

test("1MP 2: no row draws a box, a rule or a divider; the open header pins without a line", async () => {
  const css = await file(`${PRIMITIVES}/AssetRow/AssetRow.module.css`).text();
  expect(css.includes("double")).toBe(false);
  expect(/border-block/.test(css)).toBe(false);
  // The only border: the colour square's 1px outline.
  expect(css.match(/border:\s*[^;]*;/g)?.toSorted()).toEqual([
    "border: 0;",
    "border: 0;",
    "border: 1px solid currentColor;",
  ]);
  expect(/\[data-state="open"\] > \.head \{[^}]*position: sticky;/.test(css)).toBe(true);
});

test("1MP 7: the tick box is a single 1px line, filled --accent with a --ground ✓ when on", async () => {
  const css = await file(`${PRIMITIVES}/TickToggle/TickToggle.module.css`).text();
  expect(css.includes("rule-double")).toBe(false);
  expect(css.includes("border: 1px solid var(--control-line);")).toBe(true);
  expect(
    /\[data-state="on"\] \.box \{\s*color: var\(--ground\);\s*background: var\(--accent\);/.test(
      css,
    ),
  ).toBe(true);
});

test("Form ruling 3: Show historic price, the colour and Bitcoin's on/off survive a reload (v2's own key)", () => {
  const data = new Map<string, string>();
  const store = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
  expect(loadView(store)).toEqual({ bitcoin: true, historic: false, colour: "₿ orange" });
  const kept = { bitcoin: false, historic: true, colour: strings.models.colours[2].name };
  saveView(store, kept);
  expect(data.has(VIEW_KEY) && !data.has(STORE_KEY)).toBe(true); // the Models values untouched
  expect(loadView(store)).toEqual(kept);
  // Field by field: a bad colour or a non-boolean falls back alone.
  data.set(VIEW_KEY, JSON.stringify({ bitcoin: "no", historic: true, colour: "Mauve" }));
  expect(loadView(store)).toEqual({ ...defaultView(), historic: true });
  data.set(VIEW_KEY, "{not json");
  expect(loadView(store)).toEqual(defaultView());
  expect(loadView(undefined)).toEqual(defaultView());
  // The sheet shows a kept colour and reports a change up.
  const html = renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: defaultModelsValues(),
      onChange: () => undefined,
      colour: kept.colour,
      initialOpen: ["bitcoin"],
    }),
  );
  expect(html.includes(`>${kept.colour}</span>`)).toBe(true);
});

test("Form ruling 6: S&P and Inflation headers keep the pointer; only their inert square is the arrow", async () => {
  const css = await file(
    `${import.meta.dir}/../../src/v2/design/primitives/AssetRow/AssetRow.module.css`,
  ).text();
  // The square takes the press cursor only when it isn't inert; the header toggle always does.
  expect(css.includes(".key:not([aria-disabled]) {\n    cursor: var(--cursor-press);")).toBe(true);
  const toggle = /\.toggle \{([^}]*)\}/.exec(css)?.[1] ?? "";
  expect(toggle.includes("cursor: var(--cursor-press);")).toBe(true);
  const pane = await file(`${import.meta.dir}/../../src/v2/app/shell/PaneScroll.module.css`).text();
  expect(pane.includes("cursor: var(--cursor-rest);")).toBe(true); // what an inert square shows
  const html = renderToStaticMarkup(
    createElement(ModelsSheet, { values: defaultModelsValues(), onChange: () => undefined }),
  );
  expect((html.match(/aria-disabled="true"/g) ?? []).length >= 2).toBe(true); // S&P, Inflation
});
