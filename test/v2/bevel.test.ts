import { file } from "bun";
import { expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Bevel } from "../../src/v2/app/shell/Bevel";
import {
  bevelFor,
  bevelPaths,
  observeWith,
  px,
  watchBevel,
} from "../../src/v2/app/shell/bevel-path";

// V32-BUILD §1X: the bevel as SVG paths; the diagonals at --bevel-comp, the run at the rule width.
const v2 = `${import.meta.dir}/../../src/v2`;

test("1X: the bevel strokes its diagonals with var(--bevel-comp), its run with var(--rule-hair), miter joins", async () => {
  const source = await file(`${v2}/app/shell/Bevel.tsx`).text();
  expect(source.includes('strokeWidth="calc(var(--rule-hair) * var(--bevel-comp))"')).toBe(true);
  expect(source.includes('strokeWidth="var(--rule-hair)"')).toBe(true);
  expect(source.match(/strokeLinejoin="miter"/g)?.length).toBe(2);
  expect(source.match(/stroke="var\(--accent\)"/g)?.length).toBe(2);
  const tokens = await file(`${v2}/design/tokens/motion-etc.css`).text();
  expect(/--bevel-comp:\s*1\.4;/.test(tokens)).toBe(true);
  const css = await file(`${v2}/app/shell/AppShell.module.css`).text();
  expect(css.includes("linear-gradient")).toBe(false);
  expect(css.includes(".sheet::before")).toBe(false);
});

test("1X: the sheet's top edge: diagonal, run, diagonal, every stroke inside the clip", () => {
  const p = bevelPaths(390, 16, 1, 1.2, false);
  const c = 16 + 0.6 * Math.SQRT2; // 16.85
  const from = c - 0.5; // 16.35
  expect(p?.run).toBe(`M0 16.85L16.35 0.5L373.65 0.5L390 16.85`);
  expect(p?.diagonals).toBe(`M0 16.85L16.35 0.5M373.65 0.5L390 16.85`);
  // The diagonal's outer edge (centre minus half its stroke along the normal) is the clip line x + y = 16.
  expect(Math.abs(c - 0.6 * Math.SQRT2 - 16)).toBeLessThanOrEqual(1e-9);
  expect(from).toBeGreaterThanOrEqual(16);
});

test("1X: the side panel's left edge is the same edge with x and y swapped", () => {
  const p = bevelPaths(800, 16, 1, 1.2, true);
  expect(p?.run).toBe(`M16.85 0L0.5 16.35L0.5 783.65L16.85 800`);
});

test("1X: no bevel before the box is measured or when it is too small", () => {
  expect(bevelPaths(0, 16, 1, 1.2, false)).toBe(null);
  expect(bevelPaths(32, 16, 1, 1.2, false)).toBe(null);
  expect(bevelPaths(100, 0, 1, 1.2, false)).toBe(null);
  expect(px("1.2px")).toBe(1.2);
  expect(px("")).toBe(0);
});

test("1X: a measured sheet: --sheet-ch in rem or px, the computed strokes, the panel's height", () => {
  const box = { offsetWidth: 390, offsetHeight: 800 };
  expect(bevelFor(box, " 1rem", "16px", [1, 1.4], false)).toEqual(
    bevelPaths(390, 16, 1, 1.4, false),
  );
  expect(bevelFor(box, "16px", "20px", [1, 1.4], true)).toEqual(bevelPaths(800, 16, 1, 1.4, true));
  expect(bevelFor(box, "1rem", "16px", [], false)).toEqual(bevelPaths(390, 16, 1, 1, false));
});

test("1X: the server render is an empty, hidden SVG with both strokes (paths come on measure)", () => {
  const html = renderToStaticMarkup(createElement(Bevel, { className: "b", side: false }));
  expect(html.startsWith('<svg class="b" aria-hidden="true" focusable="false">')).toBe(true);
  expect(html.match(/<path/g)?.length).toBe(2);
});

test("1X: watchBevel measures now and on every resize, with the computed strokes; stop disconnects", () => {
  type Fake = { name: string; parentElement?: unknown };
  const box = { name: "box", offsetWidth: 390, offsetHeight: 800 };
  const run: Fake = { name: "run" };
  const diag: Fake = { name: "diag" };
  const svg = {
    name: "svg",
    parentElement: box,
    querySelectorAll: () => [run, diag],
  };
  const widths: Record<string, string> = { run: "1px", diag: "1.4px" };
  const style = (el: Fake) => ({
    getPropertyValue: (n: string) => (n === "--sheet-ch" && el.name === "svg" ? "1rem" : ""),
    strokeWidth: widths[el.name] ?? "",
    fontSize: el.name === "html" ? "16px" : "",
  });
  const seen: unknown[] = [];
  const hooks: { resize?: () => void } = {};
  let stopped = false;
  const stop = watchBevel<Fake>(svg, false, (p) => seen.push(p), {
    style,
    root: { name: "html" },
    observe: (_, fn) => {
      hooks.resize = fn;
      return () => {
        stopped = true;
      };
    },
  });
  expect(seen).toEqual([bevelPaths(390, 16, 1, 1.4, false)]);
  box.offsetWidth = 1440;
  hooks.resize?.();
  expect(seen[1]).toEqual(bevelPaths(1440, 16, 1, 1.4, false));
  stop();
  expect(stopped).toBe(true);
  // No sheet yet, or no ResizeObserver: nothing to watch, one measure at most.
  expect(
    watchBevel<Fake>(null, false, (p) => seen.push(p), { style, root: { name: "html" } })(),
  ).toBe(undefined);
  const orphan = { ...svg, parentElement: null };
  watchBevel<Fake>(orphan, false, (p) => seen.push(p), { style, root: { name: "html" } })();
  watchBevel<Fake>(svg, true, (p) => seen.push(p), { style, root: { name: "html" } })();
  expect(seen.length).toBe(3);
  expect(seen[2]).toEqual(bevelPaths(800, 16, 1, 1.4, true));
});

test("1X: observeWith wraps a ResizeObserver: observe the box, disconnect on stop; none on the server", () => {
  const log: string[] = [];
  class FakeObserver {
    constructor(fn: () => void) {
      log.push(typeof fn);
    }
    observe(box: string): void {
      log.push(`observe ${box}`);
    }
    disconnect(): void {
      log.push("disconnect");
    }
  }
  const observe = observeWith<string>(FakeObserver);
  const stop = observe?.("sheet", () => undefined);
  stop?.();
  expect(log).toEqual(["function", "observe sheet", "disconnect"]);
  expect(observeWith<string>(undefined)).toBe(undefined);
});
