/**
 * Every engine / Models label must render from the SM sans faces or LabelGlyphs' SVG map, so no
 * label can ever fall back to a system (or emoji) font. Sources: the G12 schema (model names, walk
 * names, control labels) and the pane's own fixed strings.
 */
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models";
import { strings } from "../../src/v2/app/strings";
import { fmtUSD } from "../../src/v2/design/format/money";
import { loadCmaps, uncovered } from "./support/cmaps";

const PANE_STRINGS = ["+/-", "ON", "OFF"];

const labels = (): string[] => {
  const c = modelsPaneSchema.controls;
  return [
    ...modelsPaneSchema.modelOrder,
    ...modelsPaneSchema.models.map((m) => m.varInput),
    ...modelsPaneSchema.walks,
    c.clamp.label,
    c.clamp.topLabel,
    c.clamp.bottomLabel,
    c.volatility.label,
    c.years.label,
    strings.fields.yearsLabel,
    c.samples.label,
    modelsPaneSchema.title,
    c.walk.label,
    ...PANE_STRINGS,
  ].filter((s) => s.length > 0);
};

test("every pane string (labels, values, hints, errors) is in the EB 400 + Jost 500/600 cmaps or the LabelGlyphs map", async () => {
  const cmaps = await loadCmaps();
  const list = labels();
  expect(list.length > 20).toBe(true);
  expect(list.includes("🟢🟢🟢🔴")).toBe(true);
  expect(uncovered(list, cmaps)).toEqual([]);
});

test("n4 revision: scientific $ labels ($1.23×10²¹ … $1.00×10³⁰⁸) are in the EB 400 + Jost 500/600 cmaps", async () => {
  const sci = [1.23e21, 4.56e45, 7.89e67, 1e308].map((v) => fmtUSD(v));
  expect(sci.join(" ")).toBe(
    "$1.23\u00D710\u00B2\u00B9 $4.56\u00D710\u2074\u2075 $7.89\u00D710\u2076\u2077 $1.00\u00D710\u00B3\u2070\u2078",
  );
  expect(
    uncovered(
      [...sci, "\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079"],
      await loadCmaps(),
    ),
  ).toEqual([]);
});

test("a label with an unmapped, uncovered character fails", async () => {
  const cmaps = await loadCmaps();
  expect(uncovered(["Walk ★", "🟡"], cmaps).length).toBe(2);
});
