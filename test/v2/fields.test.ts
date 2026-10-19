import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { NumberField } from "../../src/v2/design/primitives/NumberField";
import { Select } from "../../src/v2/design/primitives/Select";

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

test("invalid fields wire aria-invalid + aria-describedby to a ⚠ + plain-language message", () => {
  const error = "Volatility is above 1. Enter a number from 0 to 1.";
  const nf = renderToStaticMarkup(
    createElement(NumberField, { id: "f", label: "Volatility:", value: 4, invalid: true, error }),
  );
  const sel = renderToStaticMarkup(
    createElement(Select, {
      id: "s",
      label: "Walk Strategy:",
      options: ["Bubble"],
      value: "Bubble",
      invalid: true,
      error,
    }),
  );
  for (const [html, id] of [
    [nf, "f"],
    [sel, "s"],
  ] as const) {
    expect(html.includes('aria-invalid="true"')).toBe(true);
    expect(html.includes(`aria-describedby="${id}-error"`)).toBe(true);
    expect(html.includes(`id="${id}-error"`)).toBe(true);
    expect(html.includes(error)).toBe(true);
    expect(html.includes("M8 1.5 15 14H1Z")).toBe(true); // Icon "warning"
    expect(html.includes('data-invalid="true"')).toBe(true);
  }
});

test("LabelGlyphs: emoji walk is one role=img named with the exact string, drawn as SVG circles", async () => {
  const { LabelGlyphs } = await import("../../src/v2/design/primitives/LabelGlyphs");
  const html = renderToStaticMarkup(createElement(LabelGlyphs, { text: "🟢🟢🟢🔴" }));
  expect(html.includes('role="img"')).toBe(true);
  expect(html.includes('aria-label="🟢🟢🟢🔴"')).toBe(true);
  expect((html.match(/<circle /g) ?? []).length).toBe(4);
  // The emoji never reaches a text node (only attributes).
  expect(html.replace(/<[^>]*>/g, "").includes("🟢")).toBe(false);
  expect(renderToStaticMarkup(createElement(LabelGlyphs, { text: "Vote Count" }))).toBe(
    "Vote Count",
  );
  const css = await file(`${prim}/LabelGlyphs/LabelGlyphs.module.css`).text();
  expect(/border-radius/.test(css)).toBe(false);
});
