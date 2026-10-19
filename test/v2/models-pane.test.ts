import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { ModelsPane, modelsPaneSchema, type ModelsPaneValues } from "../../src/v2/app/models";

test("ModelsPane source lists every schema model and walk in order", async () => {
  const src = await file(`${import.meta.dir}/../../src/v2/app/models/ModelsPane.tsx`).text();
  expect(src.includes("modelsPaneSchema.modelOrder")).toBe(true);
  expect(src.includes("modelsPaneSchema.walks")).toBe(true);
  expect(modelsPaneSchema.modelOrder[0]).toBe("Power Law Regression Median");
  expect(modelsPaneSchema.walks[0]).toBe("Bubble");
});

test("ModelsPane SSR includes all 7 models and 9 walks with defaults selected", () => {
  const html = renderToStaticMarkup(createElement(ModelsPane));
  for (const name of modelsPaneSchema.modelOrder) {
    expect(html.includes(`value="${name}"`)).toBe(true);
  }
  for (const name of modelsPaneSchema.walks) {
    expect(html.includes(`value="${name}"`)).toBe(true);
  }
  expect(html.includes('aria-label="Model"')).toBe(true);
  expect(html.includes("Power Law Regression Median")).toBe(true);
  expect(html.includes("Bubble")).toBe(true);
});

test("ModelsPane SSR shows variable and +/- for CAGR; hides them for Power Law", () => {
  const pl: ModelsPaneValues = {
    model: "Power Law Regression Median",
    variable: 0,
    minMaxMultiple: 3,
    walk: "Bubble",
    volatility: 0.1,
    clampTop: false,
    clampBottom: false,
    samples: 1000,
    epochCount: 10,
  };
  const plHtml = renderToStaticMarkup(createElement(ModelsPane, { value: pl }));
  expect(plHtml.includes('id="v2-variable"')).toBe(false);
  expect(plHtml.includes('id="v2-minmax"')).toBe(false);

  const cagr: ModelsPaneValues = { ...pl, model: "CAGR", variable: 50 };
  const cagrHtml = renderToStaticMarkup(createElement(ModelsPane, { value: cagr }));
  expect(cagrHtml.includes('id="v2-variable"')).toBe(true);
  expect(cagrHtml.includes('id="v2-minmax"')).toBe(true);
  expect(cagrHtml.includes("R (%)")).toBe(true);
});

test("ModelsPane SSR shows LabelGlyphs when emoji walk is selected", () => {
  const values: ModelsPaneValues = {
    model: "Power Law Regression Median",
    variable: 0,
    minMaxMultiple: 3,
    walk: "🟢🟢🟢🔴",
    volatility: 0.1,
    clampTop: false,
    clampBottom: false,
    samples: 1000,
    epochCount: 10,
  };
  const html = renderToStaticMarkup(createElement(ModelsPane, { value: values }));
  expect(html.includes("🟢🟢🟢🔴")).toBe(true);
});
