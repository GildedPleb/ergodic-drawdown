import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models";
import { ModelsSheet } from "../../src/v2/app/models/ModelsSheet";
import { defaultModelsValues, type ModelsValues } from "../../src/v2/app/models/values";
import { strings } from "../../src/v2/app/strings";
import { loadCmaps, uncovered } from "./support/cmaps";

const render = (patch: Partial<ModelsValues> = {}): string =>
  renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: { ...defaultModelsValues(), ...patch },
      onChange: () => undefined,
    }),
  );

const editor = (field: "volatility" | "samples" | "epochs"): string =>
  renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: defaultModelsValues(),
      onChange: () => undefined,
      initialEditing: field,
    }),
  );

test("Models sheet: an open row edits in place, with a slider only when both bounds are finite", () => {
  expect(editor("volatility").includes('role="slider"')).toBe(true);
  expect(editor("samples").includes('role="slider"')).toBe(false);
  expect(editor("samples").includes('id="v2-samples"')).toBe(true);
});

test("Models sheet: epochs clamp to the engine's 30, not the old input's 100 (Gap 10)", () => {
  expect(editor("epochs").includes('aria-valuemax="30"')).toBe(true);
});

const radios = (html: string): string[] =>
  [
    ...html.matchAll(
      /role="radio"[^>]*>(?:<span[^>]*><\/span>)?<span[^>]*>(.*?)<\/span><\/button>/g,
    ),
  ].map((m) => (m[1] ?? "").replace(/<[^>]+>/g, "").replace(/^$/, "svg"));

test("Models sheet: one radio row per model and per walk, in the back end's order", () => {
  const html = render();
  const names = radios(html);
  expect(names.slice(0, 7)).toEqual(modelsPaneSchema.modelOrder);
  expect(names.length).toBe(modelsPaneSchema.modelOrder.length + modelsPaneSchema.walks.length);
});

test("Models sheet: the defaults are the checked radios", () => {
  const checked = [
    ...render().matchAll(
      /aria-checked="true"[^>]*>(?:<span[^>]*><\/span>)<span[^>]*>(.*?)<\/span>/g,
    ),
  ];
  expect(checked.map((m) => m[1])).toEqual([
    modelsPaneSchema.defaultModel,
    modelsPaneSchema.defaultWalk,
  ]);
});

const rows = (html: string): boolean[] => [
  html.includes('id="row-variable"'),
  html.includes('id="row-minmax"'),
];

test("Models sheet: CAGR shows the variable and +/- rows; Power Law removes them", () => {
  expect(rows(render())).toEqual([false, false]);
  expect(rows(render({ model: "CAGR", variable: 50 }))).toEqual([true, true]);
});

test("Models sheet imports only design primitives, its module, schema, values and strings", async () => {
  const src = await file(`${import.meta.dir}/../../src/v2/app/models/ModelsSheet.tsx`).text();
  const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");
  const bad = imports.filter(
    (s) =>
      s !== "react" &&
      !s.startsWith("../../design/primitives/") &&
      !["./ModelsSheet.module.css", "./schema", "./values", "../strings"].includes(s),
  );
  expect(bad).toEqual([]);
});

const decode = (s: string): string =>
  s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'");

test("Form m2: every string the sheet and shell copy render is in the SM cmaps", async () => {
  const out: string[] = [];
  for (const model of modelsPaneSchema.modelOrder) {
    const html = render({ model });
    for (const m of html.matchAll(/>([^<]+)</g)) out.push(decode(m[1] ?? ""));
    for (const m of html.matchAll(/aria-label="([^"]*)"/g)) out.push(decode(m[1] ?? ""));
  }
  const f = strings.fields;
  for (const who of Object.values(f.nouns)) {
    out.push(f.clamped(who, 0, 10_000, 1000), f.invalid(who, "int", 1, Infinity, 0.1));
  }
  out.push(
    f.years(40),
    strings.headline.sentence(1_200_000, 2066, 400_000, 3_100_000),
    strings.headline.kicker(1000, modelsPaneSchema.defaultModel),
    strings.headline.pending,
    strings.headline.phoneTitle,
    strings.chart.today("Oct \u201926"),
    strings.chart.caption,
    strings.chart.endLabel(1_200_000, 400_000, 3_100_000),
    ...Object.values(strings.sections),
    ...Object.values(strings.dock).filter((v) => typeof v === "string"),
    ...Object.values(strings.dock.grab),
  );
  const list = [...new Set(out)].filter((s) => s.trim().length > 0);
  expect(list.includes("Model")).toBe(true);
  expect(uncovered(list, await loadCmaps())).toEqual([]);
});
