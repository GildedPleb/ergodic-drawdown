import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models";
import { ModelsSheet, SAMPLE_BOUNDS, SAMPLES_LABEL } from "../../src/v2/app/models/ModelsSheet";
import { resolveEntry } from "../../src/v2/design/primitives/NumberField/entry";
import { defaultModelsValues, type ModelsValues } from "../../src/v2/app/models/values";
import { strings } from "../../src/v2/app/strings";
import { loadCmaps, uncovered } from "./support/cmaps";

const render = (patch: Partial<ModelsValues> = {}): string =>
  renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: { ...defaultModelsValues(), ...patch },
      onChange: () => undefined,
      initialOpen: "bitcoin",
    }),
  );

/** §1P: every field is live; the markup from the volatility row to the end of a row's group. */
const editor = (field: "volatility" | "samples" | "epochs"): string => {
  const html = render();
  const start = html.indexOf(`id="row-${field}"`);
  const rest = html.slice(start + 1).search(/id="row-[a-z]+"/);
  const next = rest < 0 ? -1 : start + 1 + rest;
  return html.slice(start, next < 0 ? undefined : next);
};

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

test("Models sheet imports only design primitives, its module, schema, values, its press helper, strings and main's constants", async () => {
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
        "./outside", // §1V: the ledger's close-on-press listener (front end only)
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

test("1Q (supersedes the 0..1000 clamp): R (%) clamps at 0 only; 1000 is the slider's soft top", () => {
  const cagr = modelsPaneSchema.models.find((m) => m.name === "CAGR");
  expect([cagr?.default, cagr?.rangeMin, cagr?.rangeMax]).toEqual([20, 0, 1000]);
  const html = render({ model: "CAGR", variable: 28 });
  const field = html.slice(html.indexOf('id="v2-variable"') - 200, html.indexOf('id="row-minmax"'));
  // The value cell: no upper bound. The slider: aria-valuenow is the real value, "28 percent".
  expect(field.includes('aria-valuemin="0"') && !field.includes('aria-valuemax="1000" value')).toBe(
    true,
  );
  expect(
    field.includes('aria-valuenow="28"') && field.includes('aria-valuetext="28 percent"'),
  ).toBe(true);
  expect(field.includes('aria-valuemax="1000"')).toBe(true); // the slider's soft top
  // Typed 5000 is kept (no silent coercion), and -5 clamps to 0 with the standard message.
  const bounds = { min: 0, max: Infinity };
  expect(resolveEntry("5000", "float", bounds, 20)).toEqual({ kind: "ok", value: 5000 });
  expect(resolveEntry("-5", "float", bounds, 20)).toEqual({ kind: "clamped", value: 0, typed: -5 });
  expect(strings.fields.clamped({ name: "R (%)", plural: false }, 0, Infinity, 0)).toBe(
    "R (%) goes from 0 up. We used 0.",
  );
  // The focus marks: ticks at 0, 10, 25, 50; only 50 is labelled.
  expect((field.match(/>50</g) ?? []).length).toBe(1);
  // Typed 5000: the thumb pins at the right end, the slider still names the real value.
  const big = render({ model: "CAGR", variable: 5000 });
  const thumb = big.slice(big.indexOf('role="slider"') - 120, big.indexOf('role="slider"'));
  expect(thumb.includes("--dyn-at:100%")).toBe(true);
  expect(big.includes('aria-valuenow="5000"')).toBe(true);
});

// §1N: the Select tray and in-place editing (one file with the sheet: one module load).
const renderWith = render;
const open = renderWith;

/** The element that opens with `<tag ... id="id"` up to its closing `</tag>` (no nesting of tag). */
const tagWith = (html: string, attr: string): string => {
  const at = html.indexOf(attr);
  const start = html.lastIndexOf("<", at);
  return html.slice(start, html.indexOf(">", at) + 1);
};

test("1N strings: a tray is named for its choice", () => {
  expect(strings.models.settings("CAGR")).toBe("CAGR settings");
});

test("1N groups: left-aligned group labels; the engine's label names the walk Select", () => {
  const html = renderWith({ model: "CAGR" });
  expect(html.includes('data-level="section"')).toBe(false);
  expect((html.match(/data-level="group"/g) ?? []).length >= 3).toBe(true);
  expect(html.includes(">Walk Strategy:<")).toBe(true); // the Select's own (hidden) label
  expect(/data-level="group"[^>]*>(?:(?!<\/div>).)*Walk Strategy:/.test(html)).toBe(false);
});

test("1N tray: CAGR's fields hang in the model Select's tray, labelled '<choice> settings'", () => {
  const html = open({ model: "CAGR" });
  const tray = tagWith(html, 'id="v2-model-tray"');
  expect(tray.includes('role="group"') && tray.includes('aria-label="CAGR settings"')).toBe(true);
  const combo = tagWith(html, 'id="v2-model"');
  expect(combo.includes('aria-controls="v2-model-list v2-model-tray"')).toBe(true);
  const trayAt = html.indexOf('id="v2-model-tray"');
  expect(html.indexOf('id="row-variable"') > trayAt).toBe(true);
  expect(html.indexOf('id="row-minmax"') > trayAt).toBe(true);
  expect(html.indexOf('id="v2-walk"') > html.indexOf('id="row-minmax"')).toBe(true);
});

test("1N tray: a choice with no fields draws no tray; Historic gets just its one field", () => {
  const plain = open();
  expect(plain.includes('id="v2-model-tray"')).toBe(false);
  expect(tagWith(plain, 'id="v2-model"').includes('aria-controls="v2-model-list"')).toBe(true);
  const historic = open({ model: "Historic" });
  expect(tagWith(historic, 'id="v2-model-tray"').includes('aria-label="Historic settings"')).toBe(
    true,
  );
  expect(historic.includes('id="row-minmax"')).toBe(false);
});

test("1N tray: every walk's fields live in the walk Select's tray", () => {
  for (const [walk, said] of [
    ["Bubble", "Bubble"],
    ["Saw", "Saw"],
    ["\u{1F7E2}\u{1F7E2}\u{1F7E2}\u{1F534}", "3 up, 1 down"],
  ] as const) {
    const html = open({ walk });
    const trayAt = html.indexOf('id="v2-walk-tray"');
    expect(tagWith(html, 'id="v2-walk-tray"').includes(`aria-label="${said} settings"`)).toBe(true);
    expect(tagWith(html, 'id="v2-walk"').includes("v2-walk-tray")).toBe(true);
    expect(html.indexOf('id="row-volatility"') > trayAt).toBe(true);
    expect(html.indexOf('role="switch"', trayAt) > trayAt).toBe(true);
  }
});

test("1P live: every value cell is an input and its slider is there with no click; no duplicate", () => {
  const html = open({ model: "CAGR", variable: 20 });
  const start = html.indexOf('id="row-variable"');
  const row = html.slice(start, html.indexOf('id="row-minmax"'));
  expect(row.includes('id="v2-variable"') && row.includes('role="slider"')).toBe(true);
  expect(row.includes("<button")).toBe(false);
  // The label names the input (click focuses it); the value appears once, as the input's value.
  expect(row.includes('for="v2-variable"')).toBe(true);
  expect((row.match(/>20</g) ?? []).length).toBe(0);
  expect((row.match(/value="20"/g) ?? []).length).toBe(1);
  for (const id of ["v2-vol", "v2-samples", "v2-epochs"])
    expect(html.includes(`id="${id}"`)).toBe(true);
});

test('the samples label is exactly "Statistical Sample Count (1-10k):", from the real 1–10,000 bounds', async () => {
  expect([SAMPLE_BOUNDS.min, SAMPLE_BOUNDS.max]).toEqual([1, 10_000]);
  expect(SAMPLES_LABEL).toBe("Statistical Sample Count (1-10k):");
  // Derived, not a literal: other bounds read through.
  expect(strings.fields.samplesLabel(5, 2500)).toBe("Statistical Sample Count (5-2500):");
  const html = render();
  expect(html.includes(">Statistical Sample Count (1-10k):<")).toBe(true);
  expect(uncovered([SAMPLES_LABEL], await loadCmaps())).toEqual([]);
});
