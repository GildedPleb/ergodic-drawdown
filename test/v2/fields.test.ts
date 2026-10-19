import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

const prim = `${import.meta.dir}/../../src/v2/design/primitives`;

test("invalid is never a colour signal: --rule-strong border in --invalid, no --danger-floor", async () => {
  for (const c of ["Select", "NumberField"]) {
    const css = await file(`${prim}/${c}/${c}.module.css`).text();
    expect(css.includes("--danger-floor")).toBe(false);
    expect(css.includes("border: var(--rule-strong) solid var(--invalid);")).toBe(true);
    expect(css.includes("color: var(--invalid);")).toBe(true);
  }
  const sem = await file(`${prim}/../tokens/semantic.css`).text();
  const pairs = [...sem.matchAll(/--text: (var\(--[\w-]+\));\s*--invalid: (var\(--[\w-]+\));/g)];
  expect(pairs.length).toBe(2);
  for (const [, text, invalid] of pairs) expect(invalid).toBe(text);
});

test("LabelGlyphs: emoji walk is one role=img named 3 up, 1 down, drawn as SVG circles", async () => {
  const { LabelGlyphs } = await import("../../src/v2/design/primitives/LabelGlyphs");
  const html = renderToStaticMarkup(createElement(LabelGlyphs, { text: "🟢🟢🟢🔴" }));
  expect(html.includes('role="img"')).toBe(true);
  expect(html.includes('aria-label="3 up, 1 down"')).toBe(true);
  expect((html.match(/<circle /g) ?? []).length).toBe(4);
  // The emoji never reaches a text node (only attributes).
  expect(html.replace(/<[^>]*>/g, "").includes("🟢")).toBe(false);
  expect(renderToStaticMarkup(createElement(LabelGlyphs, { text: "Vote Count" }))).toBe(
    "Vote Count",
  );
  const css = await file(`${prim}/LabelGlyphs/LabelGlyphs.module.css`).text();
  expect(/border-radius/.test(css)).toBe(false);
});
