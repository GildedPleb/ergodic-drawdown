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

test("ModelsPane passes G12 ranges and steps through to the native controls", () => {
  const values: ModelsPaneValues = {
    model: "CAGR",
    variable: 50,
    minMaxMultiple: 3,
    walk: "Bubble",
    volatility: 0.1,
    clampTop: false,
    clampBottom: false,
    samples: 1000,
    epochCount: 10,
  };
  const html = renderToStaticMarkup(createElement(ModelsPane, { value: values }));
  const c = modelsPaneSchema.controls;
  const input = (id: string): string =>
    new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(html)?.[0] ?? "";
  expect((input("v2-vol") ?? "").includes(`step="${c.volatility.stepBubble}"`)).toBe(true);
  expect((input("v2-vol") ?? "").includes(`min="${c.volatility.min}"`)).toBe(true);
  expect((input("v2-vol") ?? "").includes(`max="${c.volatility.max}"`)).toBe(true);
  expect((input("v2-samples") ?? "").includes(`max="${c.samples.max}"`)).toBe(true);
  expect((input("v2-epochs") ?? "").includes(`max="${c.epochs.max}"`)).toBe(true);
  expect((input("v2-minmax") ?? "").includes(`min="${c.minMaxMultiple.min}"`)).toBe(true);
  expect((input("v2-minmax") ?? "").includes(`step="${c.minMaxMultiple.step}"`)).toBe(true);
  expect((input("v2-variable") ?? "").includes(`step="${c.variable.step}"`)).toBe(true);
  const other = renderToStaticMarkup(
    createElement(ModelsPane, { value: { ...values, walk: "Random" } }),
  );
  expect(
    (/<input[^>]*id="v2-vol"[^>]*>/.exec(other)?.[0] ?? "").includes(
      `step="${c.volatility.stepOther}"`,
    ),
  ).toBe(true);
  // Option order equals the schema exactly.
  const opts = [...html.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
  expect(opts).toEqual([...modelsPaneSchema.modelOrder, ...modelsPaneSchema.walks]);
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
