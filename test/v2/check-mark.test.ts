/**
 * V32-BUILD K1/K2: one check mark. The AssetRow key and the TickToggle draw the same CheckMark
 * markup (so they are pixel-identical at the same size and colour), no parent module redraws its
 * geometry, and the large size keeps the default's proportions.
 */
import { file } from "bun";
import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AssetRow } from "../../src/v2/design/primitives/AssetRow";
import { CheckMark } from "../../src/v2/design/primitives/CheckMark";
import { Swatches } from "../../src/v2/design/primitives/Swatches";
import { TickToggle } from "../../src/v2/design/primitives/TickToggle";

const PRIMITIVES = `${import.meta.dir}/../../src/v2/design/primitives`;

/** The CheckMark root class, read from a bare render. */
const ROOT = /class="([^"]+)"/.exec(
  renderToStaticMarkup(createElement(CheckMark, { on: true })),
)?.[1];

/** The CheckMark spans in some markup. */
const marks = (html: string): string[] =>
  [...html.matchAll(/<span class="([^"]*)"[^>]*><\/span>/g)]
    .filter((m) => m[1] === ROOT)
    .map((m) => m[0]);

const row = (on: boolean): string =>
  renderToStaticMarkup(
    createElement(AssetRow, {
      id: "a",
      asset: "btc",
      name: "Bitcoin",
      colour: "var(--asset-btc)",
      open: false,
      onToggle: () => undefined,
      summary: "s",
      square: { on, label: "Show Bitcoin" },
    }),
  );

test("K2: the AssetRow key and the TickToggle render the identical default CheckMark", () => {
  for (const on of [true, false]) {
    const tick = marks(
      renderToStaticMarkup(createElement(TickToggle, { label: "Max", checked: on })),
    );
    const key = marks(row(on));
    const bare = marks(renderToStaticMarkup(createElement(CheckMark, { on })));
    expect(tick.length).toBe(1);
    expect(key).toEqual(tick);
    expect(tick).toEqual(bare);
  }
});

test("K2: Swatches render large CheckMarks, the core only on the pick, and no ✓", () => {
  const html = renderToStaticMarkup(
    createElement(Swatches, {
      labelledBy: "c",
      value: "b",
      options: [
        { name: "a", colour: "var(--path-plan-1)" },
        { name: "b", colour: "var(--path-plan-2)" },
      ],
    }),
  );
  const got = marks(html);
  expect(got.length).toBe(2);
  expect(got.every((m) => m.includes('data-size="large"'))).toBe(true);
  expect(got.map((m) => m.includes('data-state="on"'))).toEqual([false, true]);
  expect(html.includes("<svg")).toBe(false);
});

test("K2: only CheckMark draws the mark; parents set colour and their focus ring only", async () => {
  for (const name of ["TickToggle", "AssetRow", "Swatches"]) {
    const css = await file(`${PRIMITIVES}/${name}/${name}.module.css`).text();
    for (const m of css.matchAll(/\.mark \{([^}]*)\}/g)) {
      const props = [...(m[1] ?? "").matchAll(/([\w-]+):/g)].map((p) => p[1]);
      expect(props.every((p) => ["color", "outline", "outline-offset"].includes(p ?? ""))).toBe(
        true,
      );
    }
    expect(/0\.6875rem|1\.25rem|::after \{[^}]*background-clip/.test(css)).toBe(false);
  }
});

const REM = 16;
const px = (v: string): number =>
  v.endsWith("rem") ? Number.parseFloat(v) * REM : Number.parseFloat(v);

const local = (block: string, name: string): number =>
  px(new RegExp(`${name}: ([\\d.]+(?:rem|px))`).exec(block)?.[1] ?? "");

const geo = (mark: number, line: number, inset: number) => ({
  mark,
  line,
  inset,
  core: mark - 2 * (line + inset),
});

test("K2: a large mark scaled to the default size keeps the default's proportions (±0.6px)", async () => {
  const css = await file(`${PRIMITIVES}/CheckMark/CheckMark.module.css`).text();
  const tokens = await file(`${PRIMITIVES}/../tokens/space.css`).text();
  const s = (n: string): number => px(new RegExp(`--s-${n}: ([\\d.]+rem)`).exec(tokens)?.[1] ?? "");
  const base = /\.root \{[^}]*\}/.exec(css)?.[0] ?? "";
  const large = /\.root\[data-size="large"\] \{[^}]*\}/.exec(css)?.[0] ?? "";
  expect(base.includes("padding: var(--s-0);")).toBe(true);
  expect(large.includes("padding: var(--s-1);")).toBe(true);
  const d = geo(local(base, "--_mark"), local(base, "--_line"), s("0"));
  const l = geo(local(large, "--_mark"), local(large, "--_line"), s("1"));
  expect(d).toEqual({ mark: 11, line: 1, inset: 2, core: 5 });
  expect(l).toEqual({ mark: 20, line: 2, inset: 4, core: 8 });
  const k = d.mark / l.mark;
  for (const part of ["line", "inset", "core"] as const) {
    expect(Math.abs(l[part] * k - d[part]) < 0.6).toBe(true);
  }
});

/** The declarations of the first rule whose selector is exactly `selector`. */
const ruleOf = (css: string, selector: string): string => {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};

test("K5: hover is a 1px currentColor ring at --s-0, on enabled parents only; focus --s-1 outside it", async () => {
  const css = await file(`${PRIMITIVES}/CheckMark/CheckMark.module.css`).text();
  const hover = ruleOf(css, ":where(:enabled:not([aria-disabled]):hover) .root");
  expect(hover.includes("outline: 1px solid currentColor;")).toBe(true);
  expect(ruleOf(css, ".root").includes("outline-offset: var(--s-0);")).toBe(true);
  // Disabled parents fall outside :enabled:not([aria-disabled]).
  const tick = renderToStaticMarkup(
    createElement(TickToggle, { label: "Max", checked: true, disabled: true }),
  );
  expect(/<button[^>]* disabled=""/.test(tick)).toBe(true);
  const key = renderToStaticMarkup(
    createElement(AssetRow, {
      id: "a",
      asset: "sp",
      name: "S&P",
      colour: "var(--path-sp)",
      open: false,
      onToggle: () => undefined,
      summary: "s",
      square: { on: false, inert: true, label: "Show S&P" },
    }),
  );
  expect(key.includes('aria-disabled="true"')).toBe(true);
  // Focus on the key: --focus-w --focus at --s-1, past the hover ring (--s-0 + 1px).
  const asset = await file(`${PRIMITIVES}/AssetRow/AssetRow.module.css`).text();
  const focus = ruleOf(asset, ".key:focus-visible .mark");
  expect(focus.includes("outline: var(--focus-w) solid var(--focus);")).toBe(true);
  expect(focus.includes("outline-offset: var(--s-1);")).toBe(true);
});
