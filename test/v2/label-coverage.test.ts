/**
 * Every engine / Models label must render from the SM sans faces or LabelGlyphs' SVG map, so no
 * label can ever fall back to a system (or emoji) font. Sources: the G12 schema (model names, walk
 * names, control labels) and the pane's own fixed strings.
 */
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models";
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
    c.epochs.label,
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

test("a label with an unmapped, uncovered character fails", async () => {
  const cmaps = await loadCmaps();
  expect(uncovered(["Walk ★", "🟡"], cmaps).length).toBe(2);
});
