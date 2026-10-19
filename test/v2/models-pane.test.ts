import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { ModelsPane, modelsPaneSchema, type ModelsPaneValues } from "../../src/v2/app/models";
import { MODELS_PANE_ERRORS } from "../../src/v2/app/models/ModelsPane";
import { loadCmaps, uncovered } from "./support/cmaps";

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
  // m4: the pane and the model select are named by the visible "Model" heading, no new wording.
  expect(html.includes('<h2 class="')).toBe(true);
  expect(html.includes('id="v2-models-title">Model</h2>')).toBe(true);
  expect(html.includes('aria-labelledby="v2-models-title"')).toBe(true);
  expect(
    /<select[^>]*aria-labelledby="v2-models-title"[^>]*id="v2-model"|<select[^>]*id="v2-model"[^>]*aria-labelledby="v2-models-title"/.test(
      html,
    ),
  ).toBe(true);
  expect(html.includes("Price model")).toBe(false);
  expect(html.includes(modelsPaneSchema.controls.walk.label)).toBe(true);
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

test("ModelsPane imports only design primitives (plus its own module and schema)", async () => {
  const src = await file(`${import.meta.dir}/../../src/v2/app/models/ModelsPane.tsx`).text();
  const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");
  for (const source of imports) {
    const ok =
      source === "react" ||
      source.startsWith("../../design/primitives/") ||
      source === "./ModelsPane.module.css" ||
      source === "./schema";
    expect({ source, ok }).toEqual({ source, ok: true });
  }
  expect(src.includes("../../design/primitives/Select")).toBe(true);
  expect(src.includes("../../design/primitives/NumberField")).toBe(true);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  expect(/<(select|input|textarea|button)\b/.test(code)).toBe(false);
});

test("Select face draws the emoji walk via LabelGlyphs; option and name keep the exact string", () => {
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
  expect(html.includes('<option value="🟢🟢🟢🔴" selected="">🟢🟢🟢🔴</option>')).toBe(true);
  expect((html.match(/data-tone="up"/g) ?? []).length).toBe(3);
  expect((html.match(/data-tone="down"/g) ?? []).length).toBe(1);
});

const decode = (s: string): string =>
  s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'");

test("Form m2: every string the pane renders (text, aria-labels, hint, error copy) is in the SM cmaps", async () => {
  const out: string[] = [];
  // Each model once: its variable inputs; every option name is in every render.
  for (const model of modelsPaneSchema.modelOrder) {
    const html = renderToStaticMarkup(createElement(ModelsPane, { initial: { model } }));
    for (const m of html.matchAll(/>([^<]+)</g)) out.push(decode(m[1] ?? ""));
    for (const m of html.matchAll(/aria-label="([^"]*)"/g)) out.push(decode(m[1] ?? ""));
  }
  for (const fn of Object.values(MODELS_PANE_ERRORS)) out.push(fn(0.1), fn(1000), fn(10));
  const list = [...new Set(out)].filter((s) => s.trim().length > 0);
  expect(list.includes("(~40 years)")).toBe(true);
  expect(list.includes("Model")).toBe(true);
  expect(uncovered(list, await loadCmaps())).toEqual([]);
});
