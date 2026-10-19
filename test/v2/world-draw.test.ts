import { expect, test } from "bun:test";

import { priceBands, type PriceBands } from "../../src/v2/app/world/bands";
import { type Ctx2D, drawWorld, endLabelAt, type Paint } from "../../src/v2/app/world/draw";
import { axisTicks, fitDomain, ly, plotBox } from "../../src/v2/app/world/geometry";

const NOW = new Date(2026, 9, 19).getTime();
const WEEK = 7 * 24 * 60 * 60 * 1000;
const PAINT: Paint = {
  hairline: "#333",
  muted: "#999",
  rule: "#c90",
  today: "#eee",
  price: "#f93",
  surface: "#111",
  accent: "#fc6",
  outer: 0.1,
  inner: 0.16,
  edgeAlpha: 0.55,
  edge: 0.75,
  median: 2,
  casing: 1.5,
  chart: "500 12px SM Jost",
  serif: "italic 400 13px SM EB Garamond",
  section: "600 11.5px SM Jost",
};

const noop = (): void => undefined;

/** A 2D context that records every fillText. */
const recorder = (): { ctx: Ctx2D; texts: string[] } => {
  const texts: string[] = [];
  const ctx: Ctx2D = {
    setTransform: noop,
    clearRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    stroke: noop,
    fill: noop,
    fillRect: noop,
    arc: noop,
    setLineDash: noop,
    fillText: (t: string) => {
      texts.push(t);
    },
    measureText: (t: string) => ({ width: t.length * 6 }),
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    lineWidth: 1,
    lineJoin: "miter",
    strokeStyle: "",
    fillStyle: "",
    globalAlpha: 1,
  };
  return { ctx, texts };
};

const draw = (h: number, b: PriceBands | null, horizon: number): string[] => {
  const { ctx, texts } = recorder();
  drawWorld(ctx, PAINT, { width: 390, height: h, dpr: 1, now: NOW, horizon }, b);
  return texts;
};

const series = (label: string, ys: number[]): { label: string; data: unknown[] } => ({
  label,
  data: ys.map((y, i) => ({ x: NOW + i * WEEK, y })),
});
const bands = priceBands(
  ["5th", "25th", "Median", "75th", "95th"].map((q, k) =>
    series(q === "Median" ? "Median Bitcoin Price" : `${q} Percentile Bitcoin Price`, [
      1e5 * (k + 1),
      4e5 * (k + 1),
    ]),
  ),
);

test("empty state draws the frame text (caption, Today, end year) and no end label", () => {
  const texts = draw(693, null, 2080);
  expect(texts.includes("THE WORLD \u00B7 \u20BF PRICE")).toBe(true);
  expect(texts.includes("Today \u00B7 Oct \u201926")).toBe(true);
  expect(texts.includes("2066")).toBe(true);
  expect(texts.some((t) => t.startsWith("\u20BF price"))).toBe(false);
});

test("with bands the end label reads median · p5–p95", () => {
  const texts = draw(693, bands, 1);
  expect(texts.includes("\u20BF price \u00B7 $1.2M \u00B7 $400k\u20132M")).toBe(true);
});

test("short canvas (H<150) keeps only the $ axis values and the end value", () => {
  const texts = draw(120, bands, 1);
  expect(texts.every((t) => t.startsWith("$"))).toBe(true);
  expect(texts.includes("$1.2M")).toBe(true);
});

const flat = (n: number, v: number): Float64Array => new Float64Array(n).fill(v);

test("m2: the end label sits inside the plot, 12px clear of the $ ticks, above the band and off every gridline", () => {
  const box = plotBox(1392, 717);
  const domain = fitDomain(50_000, 2e9);
  // p95 ends just under the $100M line: left alone the label's cap height would cross it.
  const band = { p5: flat(100, 6e7), p95: flat(100, 9.4e7), horizon: 99 };
  const at = endLabelAt(box, domain, band, 180);
  expect(at.x).toBe(box.R - 12);
  for (const v of axisTicks(domain)) {
    const g = ly(v, box, domain);
    expect(g <= at.y - 12 || g >= at.y + 6).toBe(true);
  }
  expect(at.y < ly(9.4e7, box, domain)).toBe(true);
});

test("m2: a peak under the label's span (not only the last point) sends it below the band", () => {
  const box = plotBox(1392, 717);
  const domain = fitDomain(50_000, 1e8);
  const p95 = flat(100, 3e7);
  p95[95] = domain.hi; // a peak inside the label's width, at the top of the domain
  const band = { p5: flat(100, 2e7), p95, horizon: 99 };
  const at = endLabelAt(box, domain, band, 180);
  expect(at.y > ly(2e7, box, domain)).toBe(true);
});
