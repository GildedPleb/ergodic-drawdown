/**
 * Every engine / Models label must render from the SM sans faces or LabelGlyphs' SVG map, so no
 * label can ever fall back to a system (or emoji) font. Sources: the G12 schema (model names, walk
 * names, control labels) and the pane's own fixed strings.
 */
import { file } from "bun";
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models";
import { GLYPH_MAP } from "../../src/v2/design/primitives/LabelGlyphs/LabelGlyphs";
import { readWoff2 } from "./support/woff2";

const fontsDir = `${import.meta.dir}/../../src/v2/design/fonts`;
/** Pane labels render in --f-sans (SM Jost) at both shipped weights. */
const SANS = ["SMJost-500.woff2", "SMJost-600.woff2"] as const;
const PANE_STRINGS = ["Model", "Price model", "Walk Strategy:", "+/-"];

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
    ...PANE_STRINGS,
  ].filter((s) => s.length > 0);
};

const loadCmaps = async (): Promise<Set<number>[]> =>
  Promise.all(
    SANS.map(
      async (n) =>
        readWoff2(new Uint8Array(await file(`${fontsDir}/${n}`).arrayBuffer())).codepoints,
    ),
  );

const uncovered = (list: string[], cmaps: Set<number>[]): string[] => {
  const out: string[] = [];
  for (const label of list) {
    for (const ch of Array.from(label)) {
      if (GLYPH_MAP.has(ch)) continue;
      const cp = ch.codePointAt(0) ?? 0;
      if (cmaps.some((m) => !m.has(cp)))
        out.push(`"${label}": U+${cp.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  }
  return out;
};

test("every Models label is in the SM Jost cmaps or the LabelGlyphs map", async () => {
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
