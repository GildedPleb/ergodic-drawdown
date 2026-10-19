import { expect, test } from "bun:test";

import { bandRange, priceBands, type PriceBands } from "../../src/v2/app/world/bands";
import { fmtUSD } from "../../src/v2/design/format/money";
import {
  type Ctx2D,
  drawWorld,
  endLabelAt,
  LABEL_LINE,
  type Paint,
} from "../../src/v2/app/world/draw";
import { axisTicks, coverTop, fitDomain, ly, plotBox } from "../../src/v2/app/world/geometry";

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
  split: false,
  edge: 0.75,
  median: 2,
  casing: 1.5,
  chart: "500 12px SM Jost",
  serif: "italic 400 13px SM EB Garamond",
  serifUpright: "400 13px SM EB Garamond",
  serifPx: 13,
  section: "600 11.5px SM Jost",
};

const noop = (): void => undefined;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

type Op = {
  op: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  style: string;
  t?: string;
  font?: string;
};

/** A 2D context that records every fillText (texts) and every paint op in order (ops). */
const recorder = (): { ctx: Ctx2D; texts: string[]; ops: Op[]; measured: Op[] } => {
  const texts: string[] = [];
  const ops: Op[] = [];
  const measured: Op[] = [];
  const style = (): string => str(ctx.fillStyle);
  const ctx: Ctx2D = {
    setTransform: noop,
    clearRect: noop,
    beginPath: noop,
    moveTo: (x: number, y: number) => {
      ops.push({ op: "moveTo", x, y, style: str(ctx.strokeStyle) });
    },
    lineTo: (x: number, y: number) => {
      ops.push({ op: "lineTo", x, y, style: str(ctx.strokeStyle) });
    },
    closePath: noop,
    stroke: noop,
    fill: () => {
      ops.push({ op: "fill", x: 0, y: 0, style: style() });
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      ops.push({ op: "fillRect", x, y, w, h, style: style() });
    },
    arc: noop,
    setLineDash: noop,
    fillText: (t: string, x: number, y: number) => {
      texts.push(t);
      ops.push({ op: "fillText", x, y, style: style(), t, font: ctx.font });
    },
    measureText: (t: string) => {
      measured.push({ op: "measureText", x: 0, y: 0, style: "", t, font: ctx.font });
      return { width: t.length * 6 };
    },
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    lineWidth: 1,
    lineJoin: "miter",
    strokeStyle: "",
    fillStyle: "",
    globalAlpha: 1,
  };
  return { ctx, texts, ops, measured };
};

const draw = (h: number, b: PriceBands | null, horizon: number, split = false): string[] => {
  const { ctx, texts } = recorder();
  drawWorld(ctx, { ...PAINT, split }, { width: 390, height: h, dpr: 1, now: NOW, horizon }, b);
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
const LINE1 = { width: 180, lines: 1 };
const LINES2 = { width: 100, lines: 2 };

test("narrow charts (split) draw the end label on two lines: value, then range", () => {
  const texts = draw(693, bands, 1, true);
  expect(texts.includes("\u20BF price \u00B7 $1.2M")).toBe(true);
  expect(texts.includes("$400k\u20132M")).toBe(true);
  expect(texts.some((t) => t.includes("\u00B7 $1.2M \u00B7"))).toBe(false);
});

test("m2: the end label sits inside the plot, 12px clear of the $ ticks, above the band and off every gridline", () => {
  const box = plotBox(1392, 717);
  const domain = fitDomain(50_000, 2e9);
  // p95 ends just under the $100M line: left alone the label's cap height would cross it.
  const band = { p5: flat(100, 6e7), p95: flat(100, 9.4e7), end: 7.5e7, horizon: 99 };
  const at = endLabelAt(box, domain, band, LINE1);
  expect(at.mode).toBe("above");
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
  const band = { p5: flat(100, 2e7), p95, end: 2.5e7, horizon: 99 };
  const at = endLabelAt(box, domain, band, LINE1);
  expect(at.mode).toBe("below");
  expect(at.y > ly(2e7, box, domain)).toBe(true);
});

test("two lines below the band: both lines fit inside the plot, near the end, off every gridline", () => {
  const box = plotBox(358, 400);
  const domain = fitDomain(50_000, 1e8);
  const p95 = flat(100, 3e7);
  p95[97] = domain.hi;
  const band = { p5: flat(100, 2e7), p95, end: 2.5e7, horizon: 99 };
  const at = endLabelAt(box, domain, band, LINES2);
  expect(at.mode).toBe("below");
  expect(at.leader).toBe(null);
  expect(at.y + LABEL_LINE + 4 <= box.Bt).toBe(true);
  for (const v of axisTicks(domain)) {
    const g = ly(v, box, domain);
    for (const b of [at.y, at.y + LABEL_LINE]) expect(g <= b - 12 || g >= b + 6).toBe(true);
  }
});

test("never mid-chart: when above and below are both far from the end, it goes top-right with a leader", () => {
  const box = plotBox(358, 400);
  const domain = fitDomain(50_000, 1e8);
  const p95 = flat(100, 4e7);
  p95[96] = domain.hi; // a peak under the label: above would hit the caption rows
  const p5 = flat(100, 3e7);
  p5[95] = 60_000; // a trough under the label: below would sit far from the point it names
  const at = endLabelAt(box, domain, { p5, p95, end: 3.5e7, horizon: 99 }, LINES2);
  expect(at.mode).toBe("corner");
  expect(at.x).toBe(box.R - 12);
  expect(at.y >= box.T + 36).toBe(true);
  expect(at.leader?.x2).toBe(box.R);
  expect(at.leader?.y2).toBe(ly(3.5e7, box, domain));
  expect((at.leader?.y1 ?? 0) > at.y + LABEL_LINE).toBe(true);
});

const OUT = "Prices here run past what the chart can draw.";
const PAST = Number.POSITIVE_INFINITY;
const pack = (p5: number[], p50: number[], p95: number[]): PriceBands => ({
  start: NOW,
  weeks: p50.length - 1,
  p5: Float64Array.from(p5),
  p25: Float64Array.from(p5),
  p50: Float64Array.from(p50),
  p75: Float64Array.from(p95),
  p95: Float64Array.from(p95),
});
const paint = (b: PriceBands | null, width = 390, height = 693): Op[] => {
  const { ctx, ops } = recorder();
  drawWorld(ctx, PAINT, { width, height, dpr: 1, now: NOW, horizon: b?.weeks ?? 1 }, b);
  return ops;
};

test("m7: a top-right label sits on an opaque square --surface plate, padded 0.25em 0.5em, painted after the band", () => {
  // The end itself ran past a double: the caption stands alone, top right, on its plate.
  const ops = paint(pack([1e5, PAST], [1e5, PAST], [1e5, PAST]));
  const box = plotBox(390, 693);
  const plate = ops.find((o) => o.op === "fillRect" && o.style === PAINT.surface);
  const text = ops.find((o) => o.t === OUT);
  const w = OUT.length * 6;
  expect(text?.x).toBe(box.R - 12);
  expect(plate).toEqual({
    op: "fillRect",
    x: box.R - 12 - w - 6.5,
    y: box.T + 36 - 10 - 3.25,
    w: w + 13,
    h: 10 + 4 + 6.5,
    style: PAINT.surface,
  });
  const at = (o: Op | undefined): number => (o === undefined ? -1 : ops.indexOf(o));
  const lastFill = ops.findLastIndex((o) => o.op === "fill");
  expect(lastFill >= 0 && lastFill < at(plate) && at(plate) < at(text)).toBe(true);
  // Placed above or below the band, the label has no plate.
  const box2 = plotBox(1392, 717);
  const domain = fitDomain(50_000, 2e9);
  const above = { p5: flat(100, 6e7), p95: flat(100, 9.4e7), end: 7.5e7, horizon: 99 };
  expect(endLabelAt(box2, domain, above, LINE1).mode).toBe("above");
  const placed = pack(
    [5e4, ...flat(100, 6e7)],
    [7.5e7, ...flat(100, 7.5e7)],
    [2e9, ...flat(100, 9.4e7)],
  );
  expect(
    paint(placed, 1392, 717).some((o) => o.op === "fillRect" && o.style === PAINT.surface),
  ).toBe(false);
});

test("n10: values past a double are clipped at the top edge with a 1px hairline from the first clipped week", () => {
  const box = plotBox(390, 693);
  const ops = paint(pack([1e5, 2e5, 3e5, 4e5], [2e5, 4e5, 8e5, 1.6e6], [4e5, 1e7, PAST, PAST]));
  // Every band path point (the Today rule at x = L aside) stays at or under the top edge.
  const ys = ops
    .filter((o) => (o.op === "lineTo" || o.op === "moveTo") && o.x > box.L)
    .map((o) => o.y);
  expect(Math.min(...ys)).toBe(box.T);
  const hair = ops.findIndex(
    (o) => o.op === "moveTo" && o.y === box.T + 0.5 && o.style === PAINT.price,
  );
  expect(ops[hair]?.x).toBe(box.L + ((box.R - box.L) * 2) / 3);
  expect(ops[hair + 1]).toEqual({ op: "lineTo", x: box.R, y: box.T + 0.5, style: PAINT.price });
  expect(paint(bands).some((o) => o.y === box.T + 0.5)).toBe(false);
});

test("n10: the caption sits on the line under the end label, muted; the end label keeps its numbers", () => {
  const ops = paint(pack([1e5, 2e5, 3e5, 4e5], [2e5, 4e5, 8e5, 1.6e6], [4e5, 1e7, PAST, 3e6]));
  const label = ops.find((o) => o.t?.startsWith("\u20BF price"));
  const caption = ops.find((o) => o.t === OUT);
  expect(label?.t).toBe("\u20BF price \u00B7 $1.6M \u00B7 $400k\u20133M");
  expect(caption?.x).toBe(label?.x);
  expect(caption?.y).toBe((label?.y ?? 0) + LABEL_LINE);
  expect(caption?.style).toBe(PAINT.muted);
  expect(label?.style).toBe(PAINT.price);
});

test("n10: the $ scale stays, and a tick covers the data's top ($10,000T drawn inside the plot)", () => {
  const texts = draw(693, pack([1e5, 1e9, PAST], [1e5, 1e12, PAST], [1e5, 4.6e15, PAST]), 2);
  expect(texts.includes("$10,000T")).toBe(true);
  expect(texts.includes("$100T")).toBe(true);
  expect(texts.includes(OUT)).toBe(true);
  expect(texts.some((t) => t.startsWith("\u20BF price"))).toBe(false);
});

test("n4 revision: every gridline is labelled up to the 10³⁰⁸ clamp, scientific labels inside the plot", () => {
  const b = pack([1e5, 1e150, 1e300, PAST], [1e5, 1e150, 1e300, PAST], [1e5, 1e150, 1e300, PAST]);
  const range = bandRange(b);
  const domain = coverTop(fitDomain(range?.low ?? 0, range?.high ?? 0), range?.high ?? 0);
  const ticks = axisTicks(domain);
  expect(ticks.at(-1)).toBe(1e308);
  const { ctx, ops } = recorder();
  drawWorld(ctx, PAINT, { width: 390, height: 693, dpr: 1, now: NOW, horizon: 3 }, b);
  const box = plotBox(390, 693);
  for (const v of ticks) {
    const label = ops.find((o) => o.t === fmtUSD(v));
    expect(label === undefined ? `missing ${fmtUSD(v)}` : "ok").toBe("ok");
    if (v >= 1e18) expect(label?.x).toBe(box.R - 4);
  }
  expect(ops.some((o) => o.t === "$1.00\u00D710\u00B3\u2070\u2078")).toBe(true);
});

test("Form: a scientific exponent inside the italic end label is measured and drawn in the upright face", () => {
  const { ctx, ops, measured } = recorder();
  const b = pack([1e21, 1e21], [1.234e21, 1.234e21], [1.5e21, 1.5e21]);
  drawWorld(ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 1 }, b);
  const runs = ops.filter(
    (o) => o.op === "fillText" && o.y === ops.find((q) => q.t?.startsWith("\u20BF price"))?.y,
  );
  expect(runs.map((o) => o.t)).toEqual([
    "\u20BF price \u00B7 $1.23\u00D710",
    "\u00B2\u00B9",
    " \u00B7 $1.00\u00D710",
    "\u00B2\u00B9",
    "\u20131.50\u00D710",
    "\u00B2\u00B9",
  ]);
  expect(runs.map((o) => o.font)).toEqual(
    [0, 1, 0, 1, 0, 1].map((k) => (k ? PAINT.serifUpright : PAINT.serif)),
  );
  // Runs sit side by side, left-aligned from the label's right edge minus the whole width.
  const widths = runs.map((o) => (o.t ?? "").length * 6);
  const right = (runs.at(-1)?.x ?? 0) + (widths.at(-1) ?? 0);
  expect(right).toBe(plotBox(1440, 900).R - 12);
  runs.forEach((o, k) => {
    if (k > 0) expect(o.x).toBe((runs[k - 1]?.x ?? 0) + (widths[k - 1] ?? 0));
  });
  const sup = measured.filter((m) => m.t === "\u00B2\u00B9");
  expect(sup.length > 0 && sup.every((m) => m.font === PAINT.serifUpright)).toBe(true);
});

test("B2: bands that are past a double from the start draw the frame and the caption, no end label", () => {
  const inf = Float64Array.from([1e5, Number.POSITIVE_INFINITY]);
  const nan = Float64Array.from([1e5, Number.NaN]);
  for (const b of [
    { start: NOW, weeks: 1, p5: inf, p25: inf, p50: inf, p75: inf, p95: inf },
    { start: NOW, weeks: 1, p5: nan, p25: nan, p50: nan, p75: nan, p95: nan },
  ]) {
    const texts = draw(693, b, 1);
    expect(texts.includes(OUT)).toBe(true);
    expect(texts.some((t) => t.startsWith("\u20BF price"))).toBe(false);
    expect(texts.includes("THE WORLD \u00B7 \u20BF PRICE")).toBe(true);
  }
  expect(draw(693, bands, 1).includes(OUT)).toBe(false);
});
