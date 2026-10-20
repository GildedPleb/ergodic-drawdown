import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models";
import { ModelsSheet, SAMPLE_BOUNDS } from "../../src/v2/app/models/ModelsSheet";
import { resolveEntry } from "../../src/v2/design/primitives/NumberField/entry";
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

test("m2 (Gap 10): samples clamp to 1..10,000 with the standard clamp message; 0 is never used", () => {
  expect(SAMPLE_BOUNDS).toEqual({ min: 1, max: 10_000 });
  expect(editor("samples").includes('aria-valuemin="1"')).toBe(true);
  expect(resolveEntry("0", "int", SAMPLE_BOUNDS, 1000)).toEqual({
    kind: "clamped",
    value: 1,
    typed: 0,
  });
  expect(resolveEntry("-1", "int", SAMPLE_BOUNDS, 1000)).toEqual({
    kind: "clamped",
    value: 1,
    typed: -1,
  });
  expect(strings.fields.clamped(strings.fields.nouns.samples, 1, 10_000, 1)).toBe(
    "Samples go from 1 to 10,000. We used 1.",
  );
});

test("Models sheet: epochs clamp to the engine's 30, not the old input's 100 (Gap 10)", () => {
  expect(editor("epochs").includes('aria-valuemax="30"')).toBe(true);
});

/** Option text per listbox: plain names, or the LabelGlyphs data-text of an SVG label. */
const optionsOf = (html: string, id: string): string[] => {
  const list = new RegExp(`id="${id}-list"[^>]*>(.*?)</ul>`).exec(html)?.[1] ?? "";
  return [
    ...list.matchAll(/role="option"[^>]*>(?:<span[^>]*><\/span>)<span[^>]*>(.*?)<\/span><\/li>/g),
  ].map((m) => /data-text="([^"]+)"/.exec(m[1] ?? "")?.[1] ?? m[1] ?? "");
};

test("1L.3: price model and walk are Certificate Selects whose options are the engine's names", () => {
  const html = render();
  expect(html.includes('role="radio"')).toBe(false);
  expect((html.match(/role="combobox"/g) ?? []).length).toBe(2);
  expect(optionsOf(html, "v2-model")).toEqual([...modelsPaneSchema.modelOrder]);
  expect(optionsOf(html, "v2-walk")).toEqual([...modelsPaneSchema.walks]);
  expect(html.includes('id="v2-model" class')).toBe(true);
  expect(html.includes('aria-labelledby="grp-price-model"')).toBe(true);
  expect(html.includes('aria-labelledby="lbl-walk"')).toBe(true);
});

test("1L.3: the defaults are the Selects' values (■ on the current option)", () => {
  const html = render();
  const on = [
    ...html.matchAll(/data-state="on"[^>]*>(?:<span[^>]*><\/span>)<span[^>]*>(.*?)<\/span>/g),
  ];
  expect(on.map((m) => m[1])).toEqual([
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

test("Models sheet imports only design primitives, its module, schema, values, strings and main's constants", async () => {
  const src = await file(`${import.meta.dir}/../../src/v2/app/models/ModelsSheet.tsx`).text();
  const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");
  const bad = imports.filter(
    (s) =>
      s !== "react" &&
      !s.startsWith("../../design/primitives/") &&
      ![
        "./ModelsSheet.module.css",
        "./schema",
        "./values",
        "../strings",
        "../../../constants",
      ].includes(s),
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

test("main 98d6d60: CAGR R (%) defaults to 20 and clamps to 0..1000 with the standard message", () => {
  const cagr = modelsPaneSchema.models.find((m) => m.name === "CAGR");
  expect([cagr?.default, cagr?.rangeMin, cagr?.rangeMax]).toEqual([20, 0, 1000]);
  const html = renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: { ...defaultModelsValues(), model: "CAGR", variable: 20 },
      onChange: () => undefined,
      initialEditing: "variable",
    }),
  );
  expect(html.includes('aria-valuemax="1000"') && html.includes('aria-valuemin="0"')).toBe(true);
  const bounds = { min: 0, max: 1000 };
  expect(resolveEntry("1500", "float", bounds, 20)).toEqual({
    kind: "clamped",
    value: 1000,
    typed: 1500,
  });
  expect(strings.fields.clamped({ name: "R (%)", plural: false }, 0, 1000, 1000)).toBe(
    "R (%) goes from 0 to 1,000. We used 1,000.",
  );
});
