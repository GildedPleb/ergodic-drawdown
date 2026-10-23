import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models";
import {
  ergodicOf,
  ModelsSheet,
  SAMPLE_BOUNDS,
  SAMPLES_LABEL,
  summaryOf,
  usedVariable,
  variableBounds,
} from "../../src/v2/app/models/ModelsSheet";
import { resolveEntry } from "../../src/v2/design/primitives/NumberField/entry";
import { defaultModelsValues, type ModelsValues } from "../../src/v2/app/models/values";
import { strings } from "../../src/v2/app/strings";
import { loadCmaps, uncovered } from "./support/cmaps";

const render = (patch: Partial<ModelsValues> = {}): string =>
  renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: { ...defaultModelsValues(), ...patch },
      onChange: () => undefined,
      initialOpen: ["bitcoin"],
    }),
  );

/** §1P: every field is live; the markup from the volatility row to the end of a row's group. */
const editor = (field: "volatility" | "samples" | "years"): string => {
  const html = render();
  const start = html.indexOf(`id="row-${field}"`);
  const rest = html.slice(start + 1).search(/id="row-[a-z]+"/);
  const next = rest < 0 ? -1 : start + 1 + rest;
  return html.slice(start, next < 0 ? undefined : next);
};

test("§1MP 7: Volatility and samples edit in place, each with its plain slider (1–10k for samples)", () => {
  expect(editor("volatility").includes('role="slider"')).toBe(true);
  expect(editor("samples").includes('role="slider"')).toBe(true);
  expect(editor("samples").includes('id="v2-samples"')).toBe(true);
  expect(editor("samples").includes('aria-valuemax="10000"')).toBe(true);
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

test("Models sheet: Years is main's years input, 1 to the live cap (120 before halvings load)", () => {
  expect(editor("years").includes('aria-valuemin="1"')).toBe(true);
  expect(editor("years").includes('aria-valuemax="120"')).toBe(true);
  const live = renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: defaultModelsValues(),
      onChange: () => undefined,
      initialOpen: ["bitcoin"],
      yearsMax: 117,
    }),
  );
  expect(live.includes('aria-valuemax="117"')).toBe(true);
});

/** Option names per listbox (plain names, or the LabelGlyphs data-text of an SVG label). */
const optionsOf = (html: string, id: string): string[] => {
  const at = html.indexOf(`id="${id}"`);
  const list = html.slice(at, html.indexOf("</div>", at));
  return [...list.matchAll(/role="option"[^>]*><span[^>]*>(.*?)<\/span>/g)].map(
    (m) => /data-text="([^"]+)"/.exec(m[1] ?? "")?.[1] ?? m[1] ?? "",
  );
};

test("§1MP 6: price model and walk are in-place listboxes; closed, only the pick shows", () => {
  const html = render();
  expect((html.match(/role="listbox"/g) ?? []).length).toBe(2);
  expect(html.includes('role="combobox"')).toBe(false);
  expect(optionsOf(html, "v2-model")).toEqual([modelsPaneSchema.defaultModel]);
  expect(optionsOf(html, "v2-walk")).toEqual([modelsPaneSchema.defaultWalk]);
  expect(tagWith(html, 'id="v2-model"').includes('aria-labelledby="grp-grow"')).toBe(true);
  expect(tagWith(html, 'id="v2-walk"').includes('aria-label="Walk Strategy:"')).toBe(true);
  // The pick carries its engine description beneath it.
  expect(html.includes(strings.models.walkDesc["Bubble"] ?? "?")).toBe(true);
});

test("§1MP 6: every engine model and walk has its description line", () => {
  for (const m of modelsPaneSchema.modelOrder)
    expect((strings.models.modelDesc[m] ?? "").length > 0).toBe(true);
  for (const w of modelsPaneSchema.walks)
    expect((strings.models.walkDesc[w] ?? "").length > 0).toBe(true);
});

const rows = (html: string): boolean[] => [
  html.includes('id="row-variable"'),
  html.includes('id="row-minmax"'),
];

test("Models sheet: CAGR shows the variable and +/- rows; Power Law removes them", () => {
  expect(rows(render())).toEqual([false, false]);
  expect(rows(render({ model: "CAGR", variable: 50 }))).toEqual([true, true]);
  expect(rows(render({ model: "Historic", variable: 2 }))).toEqual([true, false]);
});

test("§1MP 3: the landing ledger is Bitcoin, S&P, Inflation, all collapsed, then Simulation", () => {
  const html = renderToStaticMarkup(
    createElement(ModelsSheet, { values: defaultModelsValues(), onChange: () => undefined }),
  );
  const names = [...html.matchAll(/id="asset-([a-z]+)"[^>]*aria-expanded="([a-z]+)"/g)];
  expect(names.map((m) => [m[1], m[2]])).toEqual([
    ["bitcoin", "false"],
    ["sp", "false"],
    ["inflation", "false"],
  ]);
  expect(html.includes('id="v2-model"')).toBe(false);
  expect(html.indexOf('id="grp-sim"') > html.indexOf('id="asset-inflation"')).toBe(true);
  expect(html.includes('id="v2-years"')).toBe(true);
  // Bitcoin's summary is live; the stand-ins say "Not yet modelled" and their squares are inert.
  expect(html.includes(summaryOf(defaultModelsValues()))).toBe(true);
  expect((html.match(/aria-disabled="true"/g) ?? []).length).toBe(2);
  expect(html.includes('aria-label="S&amp;P on chart (not yet modelled)"')).toBe(true);
});

test("§1MP 9: the summary is '{model part}, {walk} walk, volatility {v}'", () => {
  const v = defaultModelsValues();
  expect(summaryOf({ ...v, model: "CAGR", variable: 20, walk: "Bubble", volatility: 0.1 })).toBe(
    "Grows 20% a year, Bubble walk, volatility 0.1",
  );
  expect(summaryOf({ ...v, model: "Historic", variable: 2 })).toBe(
    `Replays 2 past halving cycles, ${v.walk} walk, volatility ${String(v.volatility)}`,
  );
  expect(summaryOf({ ...v, model: "Rainbow Chart" }).startsWith("Rainbow Chart, ")).toBe(true);
});

test("§1MP 7: ergodic needs volatility, clamps for Random/Sin, and ≥ 0.05 for Random", () => {
  const base = { walk: "Bubble", volatility: 0.1, clampTop: false, clampBottom: false };
  expect(ergodicOf(base)).toBe(true);
  expect(ergodicOf({ ...base, volatility: 0 })).toBe(false);
  expect(ergodicOf({ ...base, walk: "Sin" })).toBe(false);
  expect(ergodicOf({ ...base, walk: "Sin", clampTop: true, clampBottom: true })).toBe(true);
  expect(ergodicOf({ ...base, walk: "Random", clampTop: true, clampBottom: true })).toBe(true);
  expect(
    ergodicOf({ ...base, walk: "Random", volatility: 0.04, clampTop: true, clampBottom: true }),
  ).toBe(false);
  expect(render().includes(">ergodic<")).toBe(true);
  expect(render({ volatility: 0 }).includes(">not ergodic<")).toBe(true);
});

test("§1MP 7: Clamp is one row of two named switches, Min then Max", () => {
  const html = render();
  const row = html.slice(html.indexOf('id="row-clamp"'), html.indexOf('id="row-volatility"'));
  const names = [...row.matchAll(/role="switch"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
  expect(names).toEqual(["Clamp minimum price", "Clamp maximum price"]);
  expect(row.includes(">Min<") && row.indexOf(">Min<") < row.indexOf(">Max<")).toBe(true);
});

test("§1MP 8: Colour is one radiogroup of eight named chips, ₿ orange picked", () => {
  const html = render();
  const group = tagWith(html, 'role="radiogroup"');
  expect(group.includes('aria-labelledby="row-colour-label"')).toBe(true);
  const chips = [
    ...html.matchAll(/role="radio" aria-checked="(true|false)" aria-label="([^"]+)"/g),
  ];
  expect(chips.map((m) => decode(m[2] ?? ""))).toEqual(strings.models.colours.map((c) => c.name));
  expect(chips.filter((m) => m[1] === "true").map((m) => m[2])).toEqual(["\u20BF orange"]);
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
        "../shell/useMedia", // §1MP 6: the pane reads the desktop query itself
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
    strings.headline.sentence(
      { kind: "ninety", median: 1_200_000, low: 400_000, high: 3_100_000 },
      2066,
    ),
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
  expect(list.includes("How prices grow")).toBe(true);
  expect(uncovered(list, await loadCmaps())).toEqual([]);
});

test("Form §1MP ruling 2: R (%) is the engine's 0–1000 and clamps to the nearest limit; +/- has no top, min 1.01", () => {
  const cagr = modelsPaneSchema.models.find((m) => m.name === "CAGR");
  // The back end's own limit (src/data/models/cagr.ts rangeMax, G12-mirrored).
  expect([cagr?.default, cagr?.rangeMin, cagr?.rangeMax]).toEqual([20, 0, 1000]);
  const bounds = variableBounds(cagr);
  expect(bounds).toEqual({ min: 0, max: 1000 });
  const html = render({ model: "CAGR", variable: 28 });
  const field = html.slice(html.indexOf('id="v2-variable"') - 200, html.indexOf('id="row-minmax"'));
  expect(tagWith(field, 'role="spinbutton"').includes('aria-valuemax="1000"')).toBe(true);
  expect(
    field.includes('aria-valuenow="28"') && field.includes('aria-valuetext="28 percent"'),
  ).toBe(true);
  expect(resolveEntry("5000", "float", bounds, 20)).toEqual({
    kind: "clamped",
    value: 1000,
    typed: 5000,
  });
  expect(resolveEntry("-5", "float", bounds, 20)).toEqual({ kind: "clamped", value: 0, typed: -5 });
  expect(strings.fields.clamped({ name: "R (%)", plural: false }, 0, 1000, 1000)).toBe(
    "R (%) goes from 0 to 1,000. We used 1,000.",
  );
  // The focus marks: ticks at 0, 10, 25, 50; only 50 is labelled.
  expect((field.match(/>50</g) ?? []).length).toBe(1);
  // A 5000 kept from before the ruling reads as the 1000 the back end gets: thumb at the end.
  const big = render({ model: "CAGR", variable: 5000 });
  const thumb = big.slice(big.indexOf('role="slider"') - 120, big.indexOf('role="slider"'));
  expect(thumb.includes("--dyn-at:100%")).toBe(true);
  expect(big.includes('aria-valuenow="1000"') && !big.includes('aria-valuenow="5000"')).toBe(true);
  // +/-: from 1.01 up, no top.
  const mm = tagWith(html.slice(html.indexOf('id="row-minmax"')), 'role="spinbutton"');
  expect(mm.includes('aria-valuemin="1.01"') && !mm.includes("aria-valuemax")).toBe(true);
});

/** The opening tag that carries `attr`. */
const tagWith = (html: string, attr: string): string => {
  const at = html.indexOf(attr);
  const start = html.lastIndexOf("<", at);
  return html.slice(start, html.indexOf(">", at) + 1);
};

test("1P live: every value cell is an input and its slider is there with no click; no duplicate", () => {
  const html = render({ model: "CAGR", variable: 20 });
  const start = html.indexOf('id="row-variable"');
  const row = html.slice(start, html.indexOf('id="row-minmax"'));
  expect(row.includes('id="v2-variable"') && row.includes('role="slider"')).toBe(true);
  expect(row.includes("<button")).toBe(false);
  // The label names the input (click focuses it); the value appears once, as the input's value.
  expect(row.includes('for="v2-variable"')).toBe(true);
  expect((row.match(/>20</g) ?? []).length).toBe(0);
  expect((row.match(/value="20"/g) ?? []).length).toBe(1);
  for (const id of ["v2-vol", "v2-samples", "v2-years"])
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

const metaOf = (name: string) => modelsPaneSchema.models.find((m) => m.name === name);

test("Probe 1MP M3: Previous Halvings is 2–3 with a slider; R (%) is 0–1000 (ruling 2)", () => {
  expect(variableBounds(metaOf("Historic"))).toEqual({ min: 2, max: 3 });
  expect(variableBounds(metaOf("CAGR"))).toEqual({ min: 0, max: 1000 });
  expect(resolveEntry("1000", "float", variableBounds(metaOf("Historic")), null)).toEqual({
    kind: "clamped",
    value: 3,
    typed: 1000,
  });
  expect(strings.fields.clamped({ name: "Previous Halvings", plural: true }, 2, 3, 3)).toBe(
    "Previous Halvings go from 2 to 3. We used 3.",
  );
  const v = { ...defaultModelsValues(), model: "Historic" as const, variable: 1000 };
  // A count stored before the clamp reads as what the back end uses (3), formatted like the field.
  expect(usedVariable(v)).toBe(3);
  expect(summaryOf(v).startsWith("Replays 3 past halving cycles")).toBe(true);
  expect(summaryOf({ ...v, model: "CAGR", variable: 5000 }).startsWith("Grows 1,000% a year")).toBe(
    true,
  );
  const html = renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: { ...v, variable: 2 },
      onChange: () => undefined,
      initialOpen: ["bitcoin"],
    }),
  );
  expect(html.includes('role="slider"') && html.includes('aria-label="Previous Halvings"')).toBe(
    true,
  );
});

test("Probe R2 m3 / ruling 4: a huge value cell is spoken in words, never digits", () => {
  const html = render({ model: "CAGR", variable: 20, minMaxMultiple: 1e300 });
  const mm = tagWith(html.slice(html.indexOf('id="row-minmax"')), 'role="spinbutton"');
  expect(mm.includes('aria-valuetext="1 times 10 to the 300"')).toBe(true);
  expect(mm.includes('value="1\u00A0×\u00A010³⁰⁰"')).toBe(true);
  expect(strings.fields.focus["R (%)"]?.spoken(1000)).toBe("1,000 percent");
});

test("Probe N3: the ledger's one column may shrink below its rows' min-content (320px: nothing past the pane)", async () => {
  const css = await file(
    `${import.meta.dir}/../../src/v2/app/models/ModelsSheet.module.css`,
  ).text();
  const rule = /\.root,\s*\.assets \{([^}]*)\}/.exec(css)?.[1] ?? "";
  // An implicit `auto` track grows to the Clamp row's min-content (275.3px in a 268px column).
  expect(rule.includes("grid-template-columns: minmax(0, 1fr);")).toBe(true);
  expect(rule.includes("min-inline-size: 0;")).toBe(true);
});

test("Form 2a: Previous Halvings is a count; R (%) and +/- rest at 2 decimals", async () => {
  const { COUNT_FIELDS, placesOf } = await import("../../src/v2/app/models/ModelsSheet");
  expect(COUNT_FIELDS).toEqual([metaOf("Historic")?.varInput]);
  expect(COUNT_FIELDS.includes(metaOf("CAGR")?.varInput ?? "")).toBe(false);
  // Form 2f: Volatility rests at 2 decimals too.
  expect([placesOf("R (%)"), placesOf("+/-"), placesOf("Volatility (0-1):")]).toEqual([2, 2, 2]);
  expect(placesOf("Previous Halvings")).toBe(undefined);
  const src = await file(`${import.meta.dir}/../../src/v2/app/models/ModelsSheet.tsx`).text();
  expect(src.includes("whole={COUNT_FIELDS.includes(meta.varInput)}")).toBe(true);
  expect(src.includes("places={placesOf(meta.varInput)}")).toBe(true);
  const minmax = src.slice(src.indexOf('id="minmax"'), src.indexOf("onCommit={(minMaxMultiple)"));
  expect(minmax.includes('places={placesOf("+/-")}')).toBe(true);
  // At rest the CAGR R field shows 2 decimals.
  const html = render({ model: "CAGR", variable: 12.3456 });
  expect(html.includes('value="12.35"')).toBe(true);
});

test("Form ruling (summaries): every line outside a focused field uses the field's rest format", async () => {
  const { restOf } = await import("../../src/v2/app/models/ModelsSheet");
  const r = { ...defaultModelsValues(), model: "CAGR" as const, variable: 123.456789 };
  // The header's summary (closed and open: one string, also what's spoken), as the field rests.
  expect(summaryOf(r).startsWith("Grows 123.46% a year")).toBe(true);
  expect(summaryOf(r).includes(restOf("R (%)")(123.456789))).toBe(true);
  const closed = renderToStaticMarkup(
    createElement(ModelsSheet, { values: r, onChange: () => undefined, initialOpen: [] }),
  );
  expect(closed.includes(">Grows 123.46% a year, Bubble walk, volatility 0.1<")).toBe(true);
  // Open, the full value is only ever the numeric aria-valuenow (field and slider); every shown
  // and spoken text is the rest form.
  const open = render(r);
  expect(open.split("123.456789").length - 1).toBe(
    open.split('aria-valuenow="123.456789"').length - 1,
  );
  expect(
    open.includes('aria-valuetext="123.46"') && open.includes('aria-valuetext="123.46 percent"'),
  ).toBe(true);
  // The R slider's spoken value and the clamp / invalid messages: the same rest text.
  expect(strings.fields.focus["R (%)"]?.spoken(123.456789)).toBe("123.46 percent");
  const noun = { name: "R (%)", plural: false };
  expect(strings.fields.clamped(noun, 0, 1000, 12.3456, 2).endsWith("We used 12.35.")).toBe(true);
  expect(
    strings.fields.invalid(noun, "float", 0, 1000, 12.3456, 2).includes("Your last value, 12.35,"),
  ).toBe(true);
  // Form 2f: volatility rests at 2 decimals as well; halvings keep their own (full) rest text.
  expect(summaryOf({ ...r, volatility: 0.123456789 }).endsWith("volatility 0.12")).toBe(true);
  expect(summaryOf({ ...r, model: "Historic", variable: 2 }).startsWith("Replays 2 past")).toBe(
    true,
  );
});

test("Form 2f: Volatility rests at 2 decimals, trailing zeros dropped; the full value while focused", async () => {
  const { restOf } = await import("../../src/v2/app/models/ModelsSheet");
  const rest = restOf(modelsPaneSchema.controls.volatility.label);
  expect([0.123456789, 0.1, 0.5, 1, 0.005].map(rest)).toEqual(["0.12", "0.1", "0.5", "1", "0.01"]);
  const html = render({ volatility: 0.123456789 });
  const row = html.slice(html.indexOf('id="row-volatility"'));
  const field = row.slice(row.indexOf('id="v2-vol"') - 200, row.indexOf('id="v2-vol"') + 400);
  expect(field.includes('value="0.12"')).toBe(true);
  expect(field.includes('aria-valuenow="0.123456789"')).toBe(true);
  // Focused it edits the full value (the draft is editNumber, unchanged for decimal fields).
  const src = await file(`${import.meta.dir}/../../src/v2/app/models/ModelsSheet.tsx`).text();
  expect(src.includes("places={placesOf(controls.volatility.label)}")).toBe(true);
});

test("Form 4d / 2e: every sheet field gets the short limit note and the whole-number note", async () => {
  const src = await file(`${import.meta.dir}/../../src/v2/app/models/ModelsSheet.tsx`).text();
  expect(src.includes("limitNote={(used, b) => strings.fields.limit(used === b.max, used)}")).toBe(
    true,
  );
  expect(src.includes("wholeMessage={strings.fields.wholeOnly}")).toBe(true);
  expect(strings.fields.wholeOnly).toBe("Whole numbers only");
});
