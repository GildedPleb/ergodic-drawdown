/**
 * Form m2: labels render in EB Garamond 400, values/hints/errors in Jost 500, the title in Jost 600.
 * Every pane string must be in every one of those cmaps, so no string can fall back anywhere.
 */
import { file } from "bun";

import { GLYPH_MAP } from "../../../src/v2/design/primitives/LabelGlyphs/LabelGlyphs";
import { readWoff2 } from "./woff2";

const fontsDir = `${import.meta.dir}/../../../src/v2/design/fonts`;
const FACES = ["SMEBGaramond-400.woff2", "SMJost-500.woff2", "SMJost-600.woff2"] as const;

export const loadCmaps = async (): Promise<Set<number>[]> =>
  Promise.all(
    FACES.map(
      async (n) =>
        readWoff2(new Uint8Array(await file(`${fontsDir}/${n}`).arrayBuffer())).codepoints,
    ),
  );

export const uncovered = (list: string[], cmaps: Set<number>[]): string[] => {
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
