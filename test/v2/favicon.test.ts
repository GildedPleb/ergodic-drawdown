import { expect, test } from "bun:test";

import { fanOf, faviconSvg } from "../../src/v2/design/brand/favicon";

const INK = { ground: "#000001", surface: "#000002", accent: "#000003" };
const widths = (svg: string, tag: string): number[] =>
  [...svg.matchAll(new RegExp(`<${tag}[^>]*stroke-width="([\\d.]+)"`, "g"))].map((m) =>
    Number(m[1]),
  );

test("favicon (Form): the fan opens to the RIGHT from the diamond's left point", () => {
  for (const lines of [3, 7] as const) {
    const { origin, ends, diamond } = fanOf(32, 2, lines);
    expect(origin).toEqual([2, 16]);
    expect(diamond[3]).toEqual(origin);
    expect(ends.length).toBe(lines);
    expect(ends.every(([x]) => x > origin[0] + 8)).toBe(true);
    expect(ends.some(([, y]) => y < origin[1]) && ends.some(([, y]) => y > origin[1])).toBe(true);
  }
});

test("favicon: 16px reads at size: heavier strokes and only the two outer fan lines", () => {
  const big = faviconSvg(32, INK);
  const small = faviconSvg(16, INK);
  expect(widths(big, "line").length).toBe(7);
  expect(widths(small, "line").length).toBe(2);
  expect(Math.min(...widths(small, "line")) > Math.max(...widths(big, "line"))).toBe(true);
  expect((widths(small, "path")[0] ?? 0) >= 1.5).toBe(true);
  // The ground behind it, the surface inside the diamond, the accent on every stroke.
  for (const svg of [big, small]) {
    expect(svg.includes(`fill="${INK.ground}"`)).toBe(true);
    expect(svg.includes(`fill="${INK.surface}" stroke="${INK.accent}"`)).toBe(true);
    expect(svg.includes("SM")).toBe(false);
  }
});
