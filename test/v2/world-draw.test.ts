import { file } from "bun";
import { expect, test } from "bun:test";

import { bandRange, priceBands, type PriceBands } from "../../src/v2/app/world/bands";
import { strings } from "../../src/v2/app/strings";
import { fmtUSD } from "../../src/v2/design/format/money";
import {
  BAND_VISIBLE,
  bandAlphas,
  type Ctx2D,
  drawWorld,
  fittedDomain,
  targetDomain,
  layerAlphas,
  endLabelAt,
  LABEL_LINE,
  LEADER_INSET,
  MEDIAN_CLEAR,
  type Paint,
  plateFloor,
  TODAY_CLEAR,
  paintFrom,
} from "../../src/v2/app/world/draw";
import { axisTicks, coverTop, fitDomain, lx, ly, plotBox } from "../../src/v2/app/world/geometry";

/** The engine's dataset label for a fixture band (no min/max given: the edge is p1–p99). */
const bandLabel = (q: string): string =>
  q === "Median" ? "Median Bitcoin Price" : `${q} Percentile Bitcoin Price`;
const NOW = new Date(2026, 9, 19).getTime();
const WEEK = 7 * 24 * 60 * 60 * 1000;
const PAINT: Paint = {
  hairline: "#333",
  muted: "#999",
  ink: "#ddd",
  rule: "#c90",
  today: "#eee",
  price: "#f93",
  surface: "#111",
  ground: "#0a0a0a",
  accent: "#fc6",
  split: false,
  median: 2,
  casing: 1.5,
  chart: "500 12px SM Jost",
  serif: "italic 400 13px SM EB Garamond",
  serifUpright: "400 13px SM EB Garamond",
  serifPx: 13,
  chartPx: 12,
  supKern: 0.06,
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
  align?: string;
  lw?: number;
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
    arc: (x: number, y: number) => {
      ops.push({ op: "arc", x, y, style: style() });
    },
    setLineDash: noop,
    save: noop,
    restore: () => {
      ops.push({ op: "restore", x: 0, y: 0, style: "" });
    },
    rect: (x: number, y: number, w: number, h: number) => {
      ops.push({ op: "rect", x, y, w, h, style: "" });
    },
    clip: () => {
      ops.push({ op: "clip", x: 0, y: 0, style: "" });
    },
    fillText: (t: string, x: number, y: number) => {
      texts.push(t);
      ops.push({ op: "fillText", x, y, style: style(), t, font: ctx.font, align: ctx.textAlign });
    },
    strokeText: (t: string, x: number, y: number) => {
      ops.push({
        op: "strokeText",
        x,
        y,
        style: str(ctx.strokeStyle),
        t,
        font: ctx.font,
        align: ctx.textAlign,
        lw: ctx.lineWidth,
      });
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

/** Text drawn in one font on one baseline, runs joined: [{ t, left, right, y, align }]. */
const joined = (
  ops: Op[],
  font: string,
  op = "fillText",
): { t: string; left: number; right: number; y: number }[] => {
  const out: { t: string; left: number; right: number; y: number }[] = [];
  for (const o of ops) {
    if (o.op !== op || o.font !== font || o.t === undefined) continue;
    const w = o.t.length * 6;
    const left = o.align === "right" ? o.x - w : o.x;
    const last = out.at(-1);
    if (last !== undefined && last.y === o.y && Math.abs(left - last.right) < 2) {
      last.t += o.t;
      last.right = left + w;
    } else out.push({ t: o.t, left, right: left + w, y: o.y });
  }
  return out;
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
// p1 and p99 match p5 and p95 here, so the outer band adds no width to these placements.
const bands = priceBands(
  (
    [
      ["1st", 0],
      ["5th", 0],
      ["25th", 1],
      ["Median", 2],
      ["75th", 3],
      ["95th", 4],
      ["99th", 4],
    ] as const
  ).map(([q, k]) => series(bandLabel(q), [1e5 * (k + 1), 4e5 * (k + 1)])),
);

test("empty state draws the frame text (caption, Today) and no end label", () => {
  const texts = draw(693, null, 2080);
  expect(texts.includes("THE WORLD \u00B7 \u20BF PRICE")).toBe(true);
  expect(texts.includes("Today \u00B7 Oct \u201926")).toBe(true);
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

test("never mid-chart: when above and below are both far from the end, it goes on a plate by the end, with a leader", () => {
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
  expect(at.leader?.x2).toBe(box.R - LEADER_INSET);
  const endY = ly(3.5e7, box, domain);
  expect(at.leader?.y2).toBe(endY);
  // Form 2d: the plate is off the end point, and the leader leaves the edge that faces it.
  const top = at.y - 10;
  const bottom = at.y + LABEL_LINE + 4;
  expect(endY <= top - MEDIAN_CLEAR || endY >= bottom + MEDIAN_CLEAR).toBe(true);
  expect(at.leader?.y1).toBe(endY < top ? top : bottom);
});

const OUT = "Prices here run past what the chart can draw.";
const PAST = Number.POSITIVE_INFINITY;
const pack = (p5: number[], p50: number[], p95: number[]): PriceBands => ({
  start: NOW,
  weeks: p50.length - 1,
  min: Float64Array.from(p5),
  max: Float64Array.from(p95),
  p1: Float64Array.from(p5),
  p99: Float64Array.from(p95),
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

test("m7 + Form (b): a top-right label sits on an opaque square --ground plate, padded 0.25em 0.5em, painted after the band", () => {
  // The end itself ran past a double: the caption stands alone, top right, on its plate.
  const ops = paint(pack([1e5, PAST], [1e5, PAST], [1e5, PAST]));
  const box = plotBox(390, 693);
  const plate = ops.find((o) => o.op === "fillRect" && o.style === PAINT.ground);
  const text = ops.find((o) => o.t === OUT);
  const w = OUT.length * 6;
  expect(text?.x).toBe(box.R - 12);
  expect({ ...plate, y: Math.round((plate?.y ?? 0) * 1e6) / 1e6 }).toEqual({
    op: "fillRect",
    x: box.R - 12 - w - 6.5,
    // Form ruling 3: this wide plate would reach the "Today · …" caption, so it sits 8px under
    // that caption's line (the caption box ends at T+24+4).
    y: box.T + 24 + 4 + TODAY_CLEAR + 0.01,
    w: w + 13,
    h: 10 + 4 + 6.5,
    style: PAINT.ground,
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
    paint(placed, 1392, 717).some((o) => o.op === "fillRect" && o.style === PAINT.ground),
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
  expect(label?.style).toBe(PAINT.ink); // Form EL
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
  const labels = joined(ops, PAINT.chart);
  // m8: a tick under the caption plate is dropped; every other gridline keeps its label.
  const plate = ops.find((o) => o.op === "fillRect" && o.style === PAINT.ground);
  const underPlate = (v: number): boolean => {
    const y = ly(v, box, domain);
    return plate !== undefined && y - 13 < plate.y + (plate.h ?? 0) && y + 1 > plate.y;
  };
  for (const v of ticks) {
    const label = labels.find((o) => o.t === fmtUSD(v));
    if (label === undefined && underPlate(v)) continue;
    expect(label === undefined ? `missing ${fmtUSD(v)}` : "ok").toBe("ok");
    if (v >= 1e18) expect(Math.abs((label?.right ?? 0) - (box.R - 4)) < 1e-9).toBe(true);
  }
  expect(ticks.filter(underPlate).length <= 1).toBe(true);
  expect(labels.some((o) => o.t === "$1.00\u00D710\u00B3\u2070\u2078")).toBe(true);
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
  expect(Math.abs(right - (plotBox(1440, 900).R - 12)) < 1e-9).toBe(true);
  // Form (d): --sup-kern (0.06em of the 13px label) opens before each exponent run.
  const kern = 0.06 * 13;
  runs.forEach((o, k) => {
    const gap = k % 2 === 1 ? kern : 0;
    if (k > 0)
      expect(Math.abs(o.x - ((runs[k - 1]?.x ?? 0) + (widths[k - 1] ?? 0) + gap)) < 1e-9).toBe(
        true,
      );
  });
  const sup = measured.filter((m) => m.t === "\u00B2\u00B9");
  // Never measured in the italic face (tick labels measure theirs in the upright sans).
  expect(sup.some((m) => m.font === PAINT.serifUpright)).toBe(true);
  expect(sup.some((m) => m.font === PAINT.serif)).toBe(false);
});

const near = (x: number, y: number): boolean => Math.abs(x - y) < 1e-12;

test("1L.4: four nested fills (min–max, p1–p99, p5–p95, p25–p75) whose stacked alphas land on .04/.07/.11/.18", () => {
  const [e = 0, a = 0, m = 0, c = 0] = layerAlphas(BAND_VISIBLE);
  expect(near(e, 0.04)).toBe(true);
  expect(near(1 - (1 - e) * (1 - a), 0.07)).toBe(true);
  expect(near(1 - (1 - e) * (1 - a) * (1 - m), 0.11)).toBe(true);
  expect(near(1 - (1 - e) * (1 - a) * (1 - m) * (1 - c), 0.18)).toBe(true);
  const { ctx, ops } = recorder();
  const alphas: number[] = [];
  const fill = ctx.fill.bind(ctx);
  ctx.fill = () => {
    alphas.push(ctx.globalAlpha);
    fill();
  };
  drawWorld(ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 1 }, bands);
  expect(alphas.filter((v) => v < 1)).toEqual([e, a, m, c]);
  expect(
    ops
      .filter((o) => o.op === "fill")
      .slice(0, 4)
      .every((o) => o.style === PAINT.price),
  ).toBe(true);
});

test("1L.4: no outline on any band edge; only the median (and its casing) is stroked", () => {
  const b = pack([1e5, 2e5, 3e5], [2e5, 4e5, 8e5], [4e5, 8e5, 1.6e6]);
  const { ctx } = recorder();
  const strokes: string[] = [];
  const paths: number[][] = [];
  let current: number[] = [];
  ctx.beginPath = () => {
    current = [];
    paths.push(current);
  };
  ctx.lineTo = (_x: number, y: number) => {
    current.push(y);
  };
  ctx.stroke = () => {
    strokes.push(`${str(ctx.strokeStyle)}:${String(paths.length - 1)}`);
  };
  drawWorld(ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 2 }, b);
  const box = plotBox(1440, 900);
  // The stroked paths with three points (band traces) are the median twice: casing, then line.
  const traced = strokes
    .map((s) => s.split(":"))
    .filter(([, k]) => paths[Number(k)]?.length === 3)
    .map(([style, k]) => [style, paths[Number(k)]?.map((y) => Math.round(y))]);
  const domain = fitDomain(1e5, 1.6e6);
  const median = [2e5, 4e5, 8e5].map((v) => Math.round(ly(v, box, domain)));
  expect(traced).toEqual([
    [PAINT.surface, median],
    [PAINT.price, median],
  ]);
});

test("B2: bands that are past a double from the start draw the frame and the caption, no end label", () => {
  const inf = Float64Array.from([1e5, Number.POSITIVE_INFINITY]);
  const nan = Float64Array.from([1e5, Number.NaN]);
  for (const b of [
    { start: NOW, weeks: 1, min: inf, max: inf, p1: inf, p5: inf, p25: inf, p50: inf },
    { start: NOW, weeks: 1, min: nan, max: nan, p1: nan, p5: nan, p25: nan, p50: nan },
  ].map((d) => ({ ...d, p75: d.p50, p95: d.p50, p99: d.p50 }))) {
    const texts = draw(693, b, 1);
    expect(texts.includes(OUT)).toBe(true);
    expect(texts.some((t) => t.startsWith("\u20BF price"))).toBe(false);
    expect(texts.includes("THE WORLD \u00B7 \u20BF PRICE")).toBe(true);
  }
  expect(draw(693, bands, 1).includes(OUT)).toBe(false);
});

test("paintFrom reads the tokens off a computed style (rem → px at the root size)", () => {
  const tokens: Record<string, string> = {
    "--surface": " #111 ",
    "--ground": "#000",
    "--sup-kern": "0.06em",
    "--t-chart": "0.75rem",
    "--t-chart-serif": "0.8125rem",
    "--line-median": "2px",
    "--chart-end-lines": "2",
    "--f-sans": "SM Jost",
    "--f-text": "SM EB Garamond",
  };
  const p = paintFrom({ getPropertyValue: (k: string) => tokens[k] ?? "" }, 16);
  expect([p.surface, p.split, p.serifPx, p.median, p.casing]).toEqual(["#111", true, 13, 2, 1.5]);
  expect(p.chart).toBe("500 12px SM Jost");
  expect(p.serifUpright).toBe("400 13px SM EB Garamond");
  expect([p.ground, p.chartPx, p.supKern]).toEqual(["#000", 12, 0.06]);
});

/** Distinct quantiles so each band edge is its own series. */
const q = (k: number): Float64Array => Float64Array.from([1e5 * k, 2e5 * k, 4e5 * k]);

test("1L.4 Form (a): zero stroke calls on any band path, the outermost min–max edge included", () => {
  const b: PriceBands = {
    start: NOW,
    weeks: 2,
    min: q(0.4),
    max: q(2.5),
    p1: q(0.5),
    p5: q(0.7),
    p25: q(0.9),
    p50: q(1),
    p75: q(1.2),
    p95: q(1.5),
    p99: q(2),
  };
  const { ctx } = recorder();
  type Path = { ys: number[]; fills: number; strokes: number; alpha: number };
  const paths: Path[] = [];
  let current: Path = { ys: [], fills: 0, strokes: 0, alpha: 1 };
  ctx.beginPath = () => {
    current = { ys: [], fills: 0, strokes: 0, alpha: 1 };
    paths.push(current);
  };
  ctx.moveTo = (_x: number, y: number) => {
    current.ys.push(Math.round(y));
  };
  ctx.lineTo = (_x: number, y: number) => {
    current.ys.push(Math.round(y));
  };
  ctx.fill = () => {
    current.fills += 1;
    current.alpha = ctx.globalAlpha;
  };
  ctx.stroke = () => {
    current.strokes += 1;
  };
  drawWorld(ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 2 }, b);
  const box = plotBox(1440, 900);
  const domain = fitDomain(4e4, 1e6);
  const ys = (s: Float64Array): number[] => [...s].map((v) => Math.round(ly(v, box, domain)));
  const edges = [b.min, b.p1, b.p5, b.p25, b.p75, b.p95, b.p99, b.max].map(ys);
  const isEdge = (p: Path): boolean => edges.some((e) => e.every((y) => p.ys.includes(y)));
  const bandPaths = paths.filter((p) => p.fills > 0 && p.alpha < 1);
  expect(bandPaths.length).toBe(4);
  expect(bandPaths.every(isEdge)).toBe(true);
  // Not one stroke on a band path or on any path tracing a band edge.
  expect(paths.filter((p) => p.strokes > 0 && (p.fills > 0 || isEdge(p))).length).toBe(0);
});

test("m8 (Form c): tick labels from $1,000T up get a 3px --ground halo (strokeText, then fillText)", () => {
  const { ctx, ops } = recorder();
  const b = pack([1e5, 1e9, 1e12], [1e5, 1e12, 1e14], [1e5, 4.6e15, 5e15]);
  drawWorld(ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 2 }, b);
  const filled = joined(ops, PAINT.chart);
  const halos = joined(ops, PAINT.chart, "strokeText");
  expect(filled.some((l) => l.t === "$10,000T") && filled.some((l) => l.t === "$100T")).toBe(true);
  const big = filled.filter((l) => l.t === "$10,000T").map((l) => l.t);
  expect(halos.map((l) => l.t)).toEqual(big);
  for (const h of halos) {
    const at = ops.findIndex((o) => o.op === "strokeText" && o.y === h.y);
    const fillAt = ops.findIndex(
      (o) => o.op === "fillText" && o.y === h.y && o.font === PAINT.chart,
    );
    expect([ops[at]?.style, ops[at]?.lw, at < fillAt]).toEqual([PAINT.ground, 3, true]);
  }
});

/** Probe's cases: does any tick label overlap the corner (caption) plate? */
const plateHits = (b: PriceBands, width: number, height: number): string[] => {
  const { ctx, ops } = recorder();
  drawWorld(ctx, PAINT, { width, height, dpr: 1, now: NOW, horizon: b.weeks }, b);
  const plate = ops.find((o) => o.op === "fillRect" && o.style === PAINT.ground);
  if (plate === undefined) return ["no plate"];
  const [x0, y0, x1, y1] = [plate.x, plate.y, plate.x + (plate.w ?? 0), plate.y + (plate.h ?? 0)];
  return joined(ops, PAINT.chart)
    .filter((l) => l.t.startsWith("$"))
    .filter((l) => l.left < x1 && l.right > x0 && l.y - 10 < y1 && l.y + 4 > y0)
    .map((l) => l.t);
};

test("m8 (Form c): a tick that would collide with the caption plate is dropped", () => {
  // R = 1e6 for 30 epochs: the fan runs past a double; caption plate top right.
  const huge = pack([1e5, 1e60, PAST], [1e5, 1e90, PAST], [1e5, 1e200, PAST]);
  expect(plateHits(huge, 1440, 900)).toEqual([]);
  expect(plateHits(huge, 390, 693)).toEqual([]);
  // R = 300 at 390 wide: in range at the end but past a double along the way.
  const r300 = pack([1e5, 1e12, 1e15], [1e5, 1e14, 3e16], [1e5, PAST, 4e17]);
  expect(plateHits(r300, 390, 693)).toEqual([]);
  // A fan topping out at $1,000T puts that gridline's label right under the plate: dropped.
  const top = pack([1e5, 1e10, PAST], [1e5, 1e12, PAST], [1e5, 1e15, PAST]);
  expect(plateHits(top, 390, 693)).toEqual([]);
  expect(plateHits(top, 1440, 900)).toEqual([]);
  // (Its $1,000T row is dropped while the plate covers it; under Form ruling 3 a plate as wide
  // as this one sits below the Today caption's line, off that row, and plateHits stays empty.)
});

test("Form (d): --sup-kern opens 0.06em before an exponent in tick labels too", () => {
  const { ctx, ops } = recorder();
  const b = pack([1e5, 1e20, 1e21], [1e5, 1e20, 1e21], [1e5, 1e20, 1e21]);
  drawWorld(ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 2 }, b);
  const sup = ops.find(
    (o) => o.op === "fillText" && o.font === PAINT.chart && o.t === "\u00B2\u00B9",
  );
  const before = ops[ops.indexOf(sup ?? ops[0]!) - 1];
  expect(before?.t).toBe("$1.00\u00D710");
  expect(Math.abs((sup?.x ?? 0) - ((before?.x ?? 0) + 8 * 6 + 0.06 * 12)) < 1e-9).toBe(true);
});

test("m8 (Probe): gridlines first, then bands and median, then the tick halos and labels", () => {
  const { ctx, ops } = recorder();
  const b = pack([1e5, 1e9, 1e12], [1e5, 1e12, 1e14], [1e5, 4.6e15, 5e15]);
  drawWorld(ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 2 }, b);
  const isTick = (o: Op): boolean =>
    (o.op === "fillText" || o.op === "strokeText") &&
    o.font === PAINT.chart &&
    (o.t?.startsWith("$") ?? false);
  const firstLabel = ops.findIndex(isTick);
  const lastGrid = ops.findLastIndex((o) => o.op === "lineTo" && o.style === PAINT.hairline);
  const firstBand = ops.findIndex((o) => o.op === "fill");
  const lastMedian = ops.findLastIndex((o) => o.op === "lineTo" && o.style === PAINT.price);
  expect(firstLabel > 0 && firstBand > 0 && lastMedian > 0).toBe(true);
  expect([lastGrid < firstBand, lastMedian < firstLabel]).toEqual([true, true]);
});

/** Every tick label box against every run of the end label (Probe m10). */
const endHits = (b: PriceBands, width: number, height: number): string[] => {
  const { ctx, ops } = recorder();
  drawWorld(ctx, PAINT, { width, height, dpr: 1, now: NOW, horizon: b.weeks }, b);
  const label = [...joined(ops, PAINT.serif), ...joined(ops, PAINT.serifUpright)];
  return joined(ops, PAINT.chart)
    .filter((l) => l.t.startsWith("$"))
    .filter((l) =>
      label.some(
        (e) => l.left < e.right && l.right > e.left && l.y - 10 < e.y + 4 && l.y + 4 > e.y - 10,
      ),
    )
    .map((l) => l.t);
};

test("m10 (Probe): no tick label overprints the end label, in every layout", () => {
  for (let e = 6; e <= 44; e += 1) {
    const b = pack(
      [1e5, 10 ** (e - 3), 10 ** (e - 1)],
      [1e5, 10 ** (e - 2), 10 ** e],
      [1e5, 10 ** (e - 1), 10 ** (e + 1)],
    );
    for (const [w, h] of [
      [390, 693],
      [1440, 900],
      [844, 390],
    ] as const) {
      expect(`${String(e)} ${String(w)}: ${endHits(b, w, h).join(",")}`).toBe(
        `${String(e)} ${String(w)}: `,
      );
    }
  }
});

/** A 1,040-week fan (20 years) that grows 1% a week. */
const longBands = priceBands(
  (
    [
      ["1st", 0.5],
      ["5th", 0.6],
      ["25th", 0.8],
      ["Median", 1],
      ["75th", 1.25],
      ["95th", 1.6],
      ["99th", 2],
    ] as const
  ).map(([name, k]) =>
    series(
      bandLabel(name),
      Array.from({ length: 1041 }, (_, i) => 1e5 * k * 1.01 ** i),
    ),
  ),
);

test("1T zoomed: bands clip to the plot, the window's ends sit on its edges, Today and the end label hide", () => {
  const { ctx, ops, texts } = recorder();
  drawWorld(
    ctx,
    PAINT,
    {
      width: 1440,
      height: 900,
      dpr: 1,
      now: NOW,
      horizon: 1040,
      view: { from: 260, to: 520 },
      domain: { lo: 1e6, hi: 1e8 },
    },
    longBands,
  );
  // One clip rect: the plot rect (L=34, R=1396, T=18, Bt=866).
  expect(ops.filter((o) => o.op === "rect")).toEqual([
    { op: "rect", x: 34, y: 18, w: 1362, h: 848, style: "" },
  ]);
  expect(texts.some((t) => t.startsWith("Today"))).toBe(false);
  expect(texts.some((t) => t.startsWith("\u20BF price"))).toBe(false);
  // Year labels only inside the plot; the last tick falls in the window's end year (§1Z: no end-date label).
  const years = ops.filter((o) => o.op === "fillText" && /^20\d\d$/.test(o.t ?? ""));
  for (const y of years.slice(0, -1)) {
    expect(y.x).toBeGreaterThanOrEqual(34);
    expect(y.x).toBeLessThanOrEqual(1396);
  }
  expect(years.at(-1)?.t).toBe(String(new Date(NOW + 520 * WEEK).getFullYear()));
  // The position bar: a hairline track and the window as a quarter of it, a quarter in.
  const bar = ops.filter((o) => o.op === "fillRect" && o.style === PAINT.today);
  expect(bar.at(-1)).toEqual({
    op: "fillRect",
    x: 34 + 1362 / 4,
    y: 866 + 18,
    w: 1362 / 4,
    h: 2,
    style: PAINT.today,
  });
  expect(ops.some((o) => o.op === "fillRect" && o.style === PAINT.hairline && o.w === 1362)).toBe(
    true,
  );
});

test("1T zoomed to the end: the end label shows; unzoomed draws exactly as before", () => {
  const zoomed = recorder();
  drawWorld(
    zoomed.ctx,
    PAINT,
    { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 1040, view: { from: 780, to: 1040 } },
    longBands,
  );
  expect(zoomed.texts.some((t) => t.startsWith("\u20BF price"))).toBe(true);
  const a = recorder();
  const b = recorder();
  drawWorld(a.ctx, PAINT, { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 1040 }, longBands);
  drawWorld(
    b.ctx,
    PAINT,
    { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 1040, view: { from: 0, to: 1040 } },
    longBands,
  );
  expect(b.ops).toEqual(a.ops);
});

test("1Z: the zoom line has no start dot and no end-date label, zoomed in or fully out", () => {
  for (const view of [undefined, { from: 260, to: 520 }, { from: 780, to: 1040 }]) {
    const { ctx, ops } = recorder();
    drawWorld(
      ctx,
      PAINT,
      { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 1040, ...(view && { view }) },
      longBands,
    );
    expect(ops.some((o) => o.op === "arc")).toBe(false);
    // Nothing is written on or under the line (Bt = 866; the line sits at Bt+18..Bt+20).
    expect(ops.filter((o) => o.op === "fillText" && o.y > 866 + 18)).toEqual([]);
    // The line itself stays: full width unzoomed, a track plus the window when zoomed.
    const line = ops.filter((o) => o.op === "fillRect" && o.y >= 866 + 18 && o.y <= 866 + 19);
    expect(line.length).toBeGreaterThanOrEqual(1);
  }
});

test("2A: history on draws the frame from its first print; Today sits inside it; one 1px trace", () => {
  const past = 520;
  const t = Float64Array.from({ length: past + 1 }, (_, i) => i - past);
  const y = Float64Array.from(t, (w) => 1e5 * 1.005 ** w);
  const { ctx, ops, texts } = recorder();
  drawWorld(
    ctx,
    PAINT,
    { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 1040, history: { t, y, past } },
    longBands,
  );
  // L=34, R=1396: today lands a third in (520 of 1,560 weeks); the trace starts on L.
  const today = 34 + (1362 * past) / (1040 + past);
  expect(texts.includes("Today \u00B7 Oct \u201926")).toBe(true);
  const todayLine = ops.filter((o) => o.op === "moveTo" && o.style === PAINT.today);
  expect(Math.abs((todayLine.at(-1)?.x ?? 0) - today) < 1e-6).toBe(true);
  const trace = ops.filter((o) => o.op === "lineTo" && o.style === PAINT.price);
  const start = ops.filter((o) => o.op === "moveTo" && o.style === PAINT.price);
  expect(start.some((o) => Math.abs(o.x - 34) < 1e-6)).toBe(true);
  expect(trace.filter((o) => o.x <= today + 1e-6).length).toBeGreaterThanOrEqual(past);
  // Year ticks reach back into the history (from 2017, thinned to even years here).
  const years = ops
    .filter((o) => o.op === "fillText" && /^20\d\d$/.test(o.t ?? ""))
    .map((o) => Number(o.t));
  expect(Math.min(...years)).toBeLessThanOrEqual(2018);
  expect(Math.min(...years)).toBeGreaterThanOrEqual(2017);
  // Unzoomed: the plain full-width line, no window.
  expect(ops.filter((o) => o.op === "fillRect" && o.style === PAINT.today).at(-1)).toEqual({
    op: "fillRect",
    x: 34,
    y: 866 + 18,
    w: 1362,
    h: 2,
    style: PAINT.today,
  });
});

test("2A: zoomed with history on, the position bar is the window's share of the whole frame", () => {
  const past = 520;
  const t = Float64Array.from({ length: past + 1 }, (_, i) => i - past);
  const y = Float64Array.from(t, () => 1e5);
  const { ctx, ops, texts } = recorder();
  drawWorld(
    ctx,
    PAINT,
    {
      width: 1440,
      height: 900,
      dpr: 1,
      now: NOW,
      horizon: 1040,
      view: { from: -520, to: -130 },
      history: { t, y, past },
    },
    longBands,
  );
  // Before today: no Today line, and the bar sits at the frame's start, a quarter of it wide.
  expect(texts.some((x) => x.startsWith("Today"))).toBe(false);
  expect(ops.filter((o) => o.op === "fillRect" && o.style === PAINT.today).at(-1)).toEqual({
    op: "fillRect",
    x: 34,
    y: 866 + 18,
    w: 1362 / 4,
    h: 2,
    style: PAINT.today,
  });
});

/** A history whose prints run far outside the bands: $0.06 up to $90M, 520 weeks back. */
const wildHistory = (): { t: Float64Array; y: Float64Array; past: number } => {
  const past = 520;
  const t = Float64Array.from({ length: past + 1 }, (_, i) => i - past);
  const y = Float64Array.from(t, (w) => (w === -400 ? 9e7 : 0.06 * 1.03 ** (w + past)));
  return { t, y, past };
};

test("2A r2: every band, median and historic vertex is painted inside the plot-rect clip", () => {
  for (const view of [undefined, { from: -520, to: -100 }, { from: 200, to: 600 }]) {
    const { ctx, ops } = recorder();
    drawWorld(
      ctx,
      PAINT,
      {
        width: 390,
        height: 400,
        dpr: 1,
        now: NOW,
        horizon: 1040,
        history: wildHistory(),
        // A stale, eased domain (mid-ease or mid-resize) far tighter than the data.
        domain: { lo: 1e5, hi: 1e7 },
        ...(view && { view }),
      },
      longBands,
    );
    const box = plotBox(390, 400);
    // Every clip (the plot, then the end label's) is the plot rect itself.
    const rects = ops.filter((o) => o.op === "rect");
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) {
      expect(rect).toEqual({
        op: "rect",
        x: box.L,
        y: box.T,
        w: box.R - box.L,
        h: box.Bt - box.T,
        style: "",
      });
    }
    const clip = ops.findIndex((o) => o.op === "clip");
    const restore = ops.findIndex((o, i) => i > clip && o.op === "restore");
    const priced = ops
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => (o.op === "lineTo" || o.op === "fill") && o.style === PAINT.price);
    expect(priced.length).toBeGreaterThanOrEqual(1);
    // The trace and the bands are inside the clip; only the end label (text) paints price after.
    expect(priced.every(({ i }) => i > clip && i < restore)).toBe(true);
  }
});

test("2A r2: with history in view the Y fit holds its true extremes, not trimmed to p1–p99", () => {
  if (longBands === null) throw new Error("bands");
  const h = wildHistory();
  const full = fittedDomain(longBands, h);
  expect(full.lo <= 0.06 && full.hi >= 9e7).toBe(true);
  // Zoomed onto the history alone: the window's own prints, highest and lowest.
  const win = targetDomain(longBands, h, { from: -450, to: -300 }, true);
  let low = Number.POSITIVE_INFINITY;
  let high = 0;
  h.t.forEach((t, i) => {
    const v = h.y[i] ?? 0;
    if (t >= -450 && t <= -300) {
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
  });
  expect(high).toBe(9e7);
  expect(win.lo <= low && win.hi >= high).toBe(true);
  // So every drawn vertex of the trace lands inside the plot, top to floor.
  const { ctx, ops } = recorder();
  drawWorld(
    ctx,
    PAINT,
    { width: 390, height: 400, dpr: 1, now: NOW, horizon: 1040, history: h, domain: full },
    longBands,
  );
  const box = plotBox(390, 400);
  const trace = ops.filter(
    (o) => (o.op === "lineTo" || o.op === "moveTo") && o.style === PAINT.price && o.x < box.L + 100,
  );
  expect(trace.length).toBeGreaterThanOrEqual(10);
  expect(trace.every((o) => o.y >= box.T && o.y <= box.Bt)).toBe(true);
});

test("2A r2: a top-right end label keeps clear of every $ label row and stays inside the plot", () => {
  for (const [w, h, lo, hi, end] of [
    [390, 420, 50_000, 1e8, 3.5e7],
    [390, 420, 5e4, 1.2e8, 9e7],
    [390, 693, 0.05, 1e8, 6.8e7],
    [1440, 900, 0.05, 1e8, 6.8e7],
  ] as const) {
    const box = plotBox(w, h);
    // A peak under the label and a trough under it: neither above nor below fits.
    const p95 = [lo, ...flat(100, end * 1.2)];
    p95[97] = hi;
    const p5 = [lo, ...flat(100, end * 0.9)];
    p5[96] = lo * 1.2;
    const ops = paint(pack([...p5], [lo, ...flat(100, end)], [...p95]), w, h);
    const plate = ops.find((o) => o.op === "fillRect" && o.style === PAINT.ground);
    if (plate === undefined) throw new Error(`no corner plate at ${String(w)}`);
    const y0 = plate.y;
    const y1 = plate.y + (plate.h ?? 0);
    expect(plate.x >= box.L && plate.x + (plate.w ?? 0) <= box.R).toBe(true);
    expect(y0 >= box.T && y1 <= box.Bt).toBe(true);
    // No $ label on the plate's rows anywhere to its right (in the margin or inside the plot).
    const dollars = ops.filter(
      (o) => o.op === "fillText" && o.font === PAINT.chart && (o.t ?? "").startsWith("$"),
    );
    expect(dollars.length).toBeGreaterThanOrEqual(2);
    for (const d of dollars) {
      const clear = d.y + 4 <= y0 - 4 || d.y - 10 >= y1 + 4;
      expect(clear || d.x + 60 < plate.x).toBe(true);
    }
  }
});

test("2A r2: the leader leaves the plate edge facing the line's end and stops on the plot edge", () => {
  const box = plotBox(390, 420);
  const domain = fitDomain(50_000, 1e8);
  for (const end of [3.5e7, 9e7]) {
    const p95 = flat(100, end * 1.2);
    p95[96] = domain.hi;
    const p5 = flat(100, end * 0.9);
    p5[95] = 60_000;
    const pad = 13 * 0.25;
    const at = endLabelAt(box, domain, { p5, p95, end, horizon: 99 }, { ...LINES2, pad });
    expect(at.mode).toBe("corner");
    const top = at.y - 10 - pad;
    const bottom = at.y + LABEL_LINE + 4 + pad;
    const endY = ly(end, box, domain);
    expect(at.leader?.y1).toBe(endY < top ? top : bottom);
    expect(at.leader?.x2).toBe(box.R - LEADER_INSET);
    expect(endY >= box.T && endY <= box.Bt).toBe(true);
  }
});

/** Nine distinct edges, min/max set wide of p1/p99 (q() above). */
const nine = (): PriceBands => ({
  start: NOW,
  weeks: 2,
  min: q(0.2),
  p1: q(0.5),
  p5: q(0.7),
  p25: q(0.9),
  p50: q(1),
  p75: q(1.2),
  p95: q(1.5),
  p99: q(2),
  max: q(5),
});

test("§1L.4 / §1T: the Y fit covers min–max plus 5% of the log span, historic min / max folded in", () => {
  const b = nine();
  // min 2e4 (week 0 of q(0.2)) to max 2e6 (week 2 of q(5)): the fit is exactly fitDomain on that.
  expect(fittedDomain(b)).toEqual(fitDomain(2e4, 2e6));
  const span = Math.log10(2e6) - Math.log10(2e4);
  const d = fittedDomain(b);
  expect(Math.abs(Math.log10(2e4) - Math.log10(d.lo) - 0.05 * span) < 1e-9).toBe(true);
  expect(Math.abs(Math.log10(d.hi) - Math.log10(2e6) - 0.05 * span) < 1e-9).toBe(true);
  // Zoomed onto the bands alone: the window's min–max, not p1–p99.
  expect(targetDomain(b, null, { from: 0, to: 2 }, true)).toEqual(fitDomain(2e4, 2e6));
  // History reaching further on both sides widens the fit to its prints.
  const h = { t: Float64Array.from([-2, -1, 0]), y: Float64Array.from([3, 9e7, 5e4]), past: 2 };
  expect(fittedDomain(b, h)).toEqual(fitDomain(3, 9e7));
  // History inside min–max moves nothing.
  const inside = { t: Float64Array.from([-1, 0]), y: Float64Array.from([5e4, 1e5]), past: 1 };
  expect(fittedDomain(b, inside)).toEqual(fitDomain(2e4, 2e6));
});

test("§1L.4: the end label still reads the median and p5–p95, whatever the min–max edge", () => {
  const wide = nine();
  const tight = { ...wide, min: wide.p1, max: wide.p99 };
  const all = draw(693, wide, 2);
  expect(all.includes(strings.chart.endLabel(4e5, 0.7 * 4e5, 1.5 * 4e5))).toBe(true);
  // Neither the min / max nor the p1 / p99 end value is quoted.
  const quoted = all.filter((t) => t.startsWith("\u20BF price")).join(" ");
  for (const v of [0.2, 0.5, 2, 5]) expect(quoted.includes(fmtUSD(v * 4e5))).toBe(false);
  expect(draw(693, tight, 2).filter((t) => t.startsWith("\u20BF price"))).toEqual(
    all.filter((t) => t.startsWith("\u20BF price")),
  );
});

const labF = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const toLab = (rgb: number[]): number[] => {
  const [r = 0, g = 0, bl = 0] = rgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  const fx = labF((0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047);
  const fy = labF(0.2126 * r + 0.7152 * g + 0.0722 * bl);
  const fz = labF((0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
/** CIE76 ΔE between two sRGB colours (0–1 channels), for the band-ladder legibility check. */
const deltaE = (a: number[], b: number[]): number => {
  const [p, q2] = [toLab(a), toLab(b)];
  return Math.hypot(...p.map((v, i) => v - (q2[i] ?? 0)));
};

const gainOf = (block: string): number =>
  Number.parseFloat(/--band-gain: ([\d.]+);/.exec(block)?.[1] ?? "NaN");

test("§1L.4: each of the four band steps reads distinctly (ΔE ≥ 2.9) on both themes' ground", async () => {
  const palette = await file("src/v2/design/tokens/palette.css").text();
  const semantic = await file("src/v2/design/tokens/semantic.css").text();
  const hex = (name: string): number[] => {
    const m = new RegExp(`--${name}: #([0-9a-f]{6});`).exec(palette)?.[1] ?? "000000";
    return [0, 2, 4].map((i) => Number.parseInt(m.slice(i, i + 2), 16) / 255);
  };
  const at = semantic.indexOf('[data-theme="linen"]');
  const dark = gainOf(semantic.slice(0, at));
  const gain = gainOf(semantic.slice(at));
  expect([dark, gain]).toEqual([1, 1.6]);
  for (const [ground, price, g] of [
    ["ink-950", "orange-300", dark],
    ["linen-125", "orange-600", gain],
  ] as const) {
    const G = hex(ground);
    const O = hex(price);
    let prev = G;
    let compound = 0;
    for (const a of bandAlphas(g)) {
      compound = 1 - (1 - compound) * (1 - a);
      const c = G.map((v, i) => v * (1 - compound) + (O[i] ?? 0) * compound);
      expect(deltaE(prev, c) >= 2.9).toBe(true);
      prev = c;
    }
  }
  // Gain 1 is the spec ladder exactly; linen's is ×1.6.
  expect(bandAlphas()).toEqual(layerAlphas(BAND_VISIBLE));
  expect(bandAlphas(1.6)).toEqual(layerAlphas(BAND_VISIBLE.map((v) => v * 1.6)));
  const p = paintFrom(
    { getPropertyValue: (k: string) => (k === "--band-gain" ? " 1.6 " : "") },
    16,
  );
  expect(p.bandGain).toBe(1.6);
  expect(paintFrom({ getPropertyValue: () => "" }, 16).bandGain).toBe(1);
});

test("2A-r3: the drawn end label follows the headline's N rule (spread.ts)", () => {
  const b = nine();
  const label = (n?: number): string[] =>
    draw(693, n === undefined ? b : { ...b, n }, 2).filter((t) => t.startsWith("\u20BF price"));
  const ninety = strings.chart.endLabel(4e5, 0.7 * 4e5, 1.5 * 4e5);
  expect(label()).toEqual([ninety]);
  expect(label(20)).toEqual([ninety]);
  expect(label(19)).toEqual([strings.chart.endLabel(4e5, 0.2 * 4e5, 5 * 4e5)]);
  expect(label(1)).toEqual([`\u20BF price \u00B7 ${fmtUSD(4e5)}`]);
});

test("2A-r3 (Form nit): the leader, casing and all, stays inside the plot rect like the label", () => {
  // Pure: every corner leader in a sweep of ends near and past the top keeps LEADER_INSET clear.
  for (const [w, h] of [
    [390, 693],
    [390, 420],
    [1440, 900],
  ] as const) {
    const box = plotBox(w, h);
    const domain = fitDomain(50_000, 1e8);
    for (const end of [3.5e7, 7e7, 9.9e7, 1e8, 5e8]) {
      const p95 = flat(100, end * 1.2);
      p95[96] = domain.hi;
      const p5 = flat(100, end * 0.9);
      p5[95] = 60_000;
      const at = endLabelAt(box, domain, { p5, p95, end, horizon: 99 }, LINES2);
      if (at.leader === null) continue;
      const { x1, y1, x2, y2 } = at.leader;
      for (const x of [x1, x2]) expect(x >= box.L && x <= box.R - LEADER_INSET).toBe(true);
      for (const y of [y1, y2]) {
        expect(y >= box.T + LEADER_INSET && y <= box.Bt - LEADER_INSET).toBe(true);
      }
    }
  }
  // Drawn at 390 (dark paint): with the median ending just under $100M the label goes top-right;
  // every leader vertex sits more than half the casing (4px wide) inside the right edge.
  const { ctx, ops } = recorder();
  const domain = fitDomain(50_000, 1e8);
  const p95 = [...flat(100, 9e7 * 1.2)];
  p95[96] = domain.hi;
  const p5 = [...flat(100, 9e7 * 0.9)];
  p5[95] = 60_000;
  const b = pack(p5, [...flat(100, 9e7)], p95);
  drawWorld(ctx, PAINT, { width: 390, height: 693, dpr: 1, now: NOW, horizon: 99, domain }, b);
  const box = plotBox(390, 693);
  const clip = ops.map((o) => o.op).lastIndexOf("clip");
  const leader = ops
    .slice(clip)
    .filter((o) => (o.op === "moveTo" || o.op === "lineTo") && o.style === PAINT.muted);
  expect(leader.length).toBeGreaterThanOrEqual(2);
  const half = (1 + 2 * PAINT.casing) / 2;
  for (const o of leader) {
    expect((o.x ?? Infinity) <= box.R - half).toBe(true);
    expect((o.y ?? -1) >= box.T + half && (o.y ?? Infinity) <= box.Bt - half).toBe(true);
  }
});

test("2A-r5 (user ruling): the same nine series at every N: the median and four steps at N = 1, 2, 3, 19, 20", () => {
  const strokes = (n?: number): { style: string; width: number }[] => {
    const { ctx } = recorder();
    const out: { style: string; width: number }[] = [];
    ctx.stroke = () => {
      out.push({
        style: typeof ctx.strokeStyle === "string" ? ctx.strokeStyle : "",
        width: ctx.lineWidth,
      });
    };
    const b = nine();
    drawWorld(
      ctx,
      PAINT,
      { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 2 },
      n === undefined ? b : { ...b, n },
    );
    return out.filter(
      (o) =>
        (o.style === PAINT.price && o.width === PAINT.median) ||
        (o.style === PAINT.surface && o.width === PAINT.median + 2 * PAINT.casing),
    );
  };
  for (const n of [1, 2, 3, 19, 20, 1000, undefined]) expect(strokes(n).length).toBe(2);
  // Four steps at N = 2 too: no special case on the chart.
  const { ctx } = recorder();
  let fills = 0;
  ctx.fill = () => {
    fills += ctx.globalAlpha < 1 ? 1 : 0;
  };
  drawWorld(
    ctx,
    PAINT,
    { width: 1440, height: 900, dpr: 1, now: NOW, horizon: 2 },
    { ...nine(), n: 2 },
  );
  expect(fills).toBe(4);
  // And the label is the median plus min–max, as at N = 3.
  const texts = draw(693, { ...nine(), n: 2 }, 2).filter((t) => t.startsWith("\u20BF price"));
  expect(texts).toEqual([strings.chart.endLabel(4e5, 0.2 * 4e5, 5 * 4e5)]);
});

const priceCss = (dyn: string): { getPropertyValue: (k: string) => string } => ({
  getPropertyValue: (k: string) => ({ "--asset-btc": "#f7931a", "--_price": dyn })[k] ?? "",
});

test("user ruling (Colour): the chart's series paint follows the Colour pick, ₿ orange by default", async () => {
  const { colourOf } = await import("../../src/v2/app/strings");
  const { WorldLayer } = await import("../../src/v2/app/world/WorldLayer");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  expect(colourOf("Jade")).toBe("var(--path-plan-1)");
  expect(colourOf("not a chip")).toBe("var(--path-btc-price)");
  const html = renderToStaticMarkup(
    createElement(WorldLayer, {
      bands: null,
      now: 0,
      horizon: 52,
      label: "x",
      colour: colourOf("Jade"),
    }),
  );
  expect(html.includes('style="--dyn-asset:var(--path-plan-1)"')).toBe(true);
  expect(paintFrom(priceCss("#3fb58a"), 16).price).toBe("#3fb58a"); // every band, line and the end label use p.price
  expect(paintFrom(priceCss(""), 16).price).toBe("#f7931a");
  const shell = await file(`${import.meta.dir}/../../src/v2/app/shell/AppShell.tsx`).text();
  expect(shell.includes("colour={colourOf(view.colour)}")).toBe(true); // the kept (persisted) pick
  // Every chip clears 3:1 on the chart's ground in both themes (G1 checks these rows).
  const table = await file(`${import.meta.dir}/../../src/v2/design/tokens/contrast.txt`).text();
  for (const { colour } of strings.models.colours) {
    const token = colour.slice(6, -1);
    for (const theme of ["dark", "linen"]) {
      const row = new RegExp(`^${theme}\\s+${token}\\s+ground\\s+\\S+\\s+(\\S+)`, "m").exec(table);
      expect(Number(row?.[1])).toBeGreaterThanOrEqual(3);
    }
  }
});

test("Form EL: the end label's text is ink; a 0.5em square in the asset colour stands just before it", async () => {
  const ops = paint(pack([1e5, 2e5, 3e5, 4e5], [2e5, 4e5, 8e5, 1.6e6], [4e5, 1e7, PAST, 3e6]));
  const label = ops.find((o) => o.t?.startsWith("\u20BF price"));
  const mark = ops.find((o) => o.op === "fillRect" && o.style === PAINT.price);
  expect(label?.style).toBe(PAINT.ink);
  expect([mark?.w, mark?.h]).toEqual([6.5, 6.5]);
  const width = (label?.t?.length ?? 0) * 6; // the recorder measures 6px a character
  expect(mark?.x).toBe((label?.x ?? 0) - width - 3.25 - 6.5); // 0.25em gap, right-aligned text
  expect(mark?.y).toBe((label?.y ?? 0) - (10 + 6.5) / 2); // centred on the cap height
  expect(ops.filter((o) => o.op === "fill").every((o) => o.style === PAINT.price)).toBe(true);
  // The ink reaches 4.5:1 on the chart's ground in both themes (G1 validates these rows).
  const table = await file(`${import.meta.dir}/../../src/v2/design/tokens/contrast.txt`).text();
  for (const theme of ["dark", "linen"]) {
    const row = new RegExp(`^${theme}\\s+text\\s+ground\\s+\\S+\\s+(\\S+)`, "m").exec(table);
    expect(Number(row?.[1])).toBeGreaterThanOrEqual(4.5);
  }
  expect(paintFrom({ getPropertyValue: (k) => (k === "--text" ? "#e9dfc8" : "") }, 16).ink).toBe(
    "#e9dfc8",
  );
});

// A jagged N=1/N=2-like path (one or two draws: the fan is the line itself), rising to its end.
const jagged = (n: number, lo: number, hi: number, wobble: number): Float64Array =>
  Float64Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return lo * (hi / lo) ** t * (1 + wobble * Math.sin(i * 1.7) * Math.cos(i * 0.31));
  });
test("F3/F4 (R5): the end label is always inside the plot, and off a plate it never sits on the fan", () => {
  let placements = 0;
  for (const [w, h] of [
    [320, 300],
    [320, 403],
    [320, 470],
    [390, 420],
    [390, 679],
    [1392, 703],
  ] as const) {
    const box = plotBox(w, h);
    // Sparse $ rows (futures only) and dense ones (history on: decades from the first prints).
    for (const domain of [fitDomain(5e4, 1.5e8), fitDomain(0.05, 2e9)]) {
      for (const wobble of [0, 0.15, 0.4]) {
        for (const lines of [1, 2]) {
          const mid = jagged(100, 2e5, 1.1e8, wobble);
          const p5 = mid.map((v) => v * 0.9);
          const p95 = mid.map((v) => v * 1.1);
          const end = mid[99] ?? 1;
          const width = lines === 1 ? 89 : 100;
          const pad = 13 * 0.25;
          const at = endLabelAt(box, domain, { p5, p95, end, horizon: 99 }, { width, lines, pad });
          placements++;
          const plate = at.mode === "corner" ? pad : 0;
          const top = at.y - 10 - plate;
          const bottom = at.y + (lines - 1) * LABEL_LINE + 4 + plate;
          // F3: never above the plot's top (or below its floor), where the plot clip erases it.
          expect(top >= box.T && bottom <= box.Bt).toBe(true);
          if (at.mode === "corner") continue;
          // F4: without a plate, the fan over the label's columns passes outside its block.
          for (let i = 0; i < 100; i++) {
            const x = box.L + ((box.R - box.L) * i) / 99;
            if (x < at.x - width || x > at.x) continue;
            const hi = ly(p95[i] ?? 1, box, domain);
            const lo = ly(p5[i] ?? 1, box, domain);
            expect(lo < top || hi > bottom).toBe(true);
          }
        }
      }
    }
  }
  expect(placements).toBe(72);
});

test("Form ruling 3: at 320 the corner plate keeps 8px from the Today caption, else drops below its line", () => {
  const box = plotBox(320, 300);
  const domain = fitDomain(50_000, 2e9);
  // The fan fills the plot, so the label goes on a plate; the median ends at the very top, so
  // the plate goes below it (2d) and the caption floor is what holds it down (2c).
  const band = { p5: flat(100, domain.lo), p95: flat(100, domain.hi), end: domain.hi, horizon: 99 };
  const pad = 3;
  const cap = (x0: number) => ({ x0, y0: box.T + 14, x1: x0 + 96, y1: box.T + 28 });
  let crowded = 0;
  for (const lines of [1, 2, 3]) {
    for (let x0 = box.L + 5; x0 < box.R; x0 += 7) {
      const today = cap(x0);
      const label = { width: 70, lines, pad };
      const at = endLabelAt(box, domain, band, label, false, today);
      expect(at.mode).toBe("corner");
      const plate = { x0: at.x - 70 - 2 * pad, x1: at.x + 2 * pad, y0: at.y - 10 - pad };
      const side = Math.max(plate.x0 - today.x1, today.x0 - plate.x1);
      // Either 8px to the side of the caption, or the whole plate under its line by 8px.
      expect(side >= TODAY_CLEAR || plate.y0 >= today.y1 + TODAY_CLEAR).toBe(true);
      if (side < TODAY_CLEAR) {
        crowded++;
        expect(plate.y0 >= today.y1 + TODAY_CLEAR).toBe(true);
        expect(plate.y0 < today.y1 + TODAY_CLEAR + 1).toBe(true); // moved by just that much
      }
    }
  }
  expect(crowded > 0).toBe(true);
  // History off (caption at the left edge) and no caption: unchanged, the row under the caption.
  expect(plateFloor(box, { width: 70, pad }, cap(box.L + 5))).toBe(box.T + 36);
  expect(plateFloor(box, { width: 70, pad }, null)).toBe(box.T + 36);
  const one = { width: 70, lines: 1, pad };
  expect(endLabelAt(box, domain, band, one, false, cap(box.L + 5))).toEqual(
    endLabelAt(box, domain, band, one),
  );
});

test("Form 2d: a plate never sits on the median; it goes above or below the line's end, on the roomier side", () => {
  let plates = 0;
  let ups = 0;
  for (const [w, h] of [
    [320, 300],
    [320, 470],
    [390, 420],
    [390, 693],
    [1392, 703],
  ] as const) {
    const box = plotBox(w, h);
    for (const domain of [fitDomain(5e4, 1.5e8), fitDomain(0.05, 2e9)]) {
      for (const [lo, hi] of [
        [2e5, 1.1e8],
        [1e8, 6e4],
        [3e6, 3e6],
      ] as const) {
        for (const wobble of [0, 0.15, 0.4]) {
          for (const lines of [1, 2, 3]) {
            const p50 = jagged(100, lo, hi, wobble);
            // The fan fills the plot: no room above or below it, so the label is plated.
            const band = {
              p5: flat(100, domain.lo),
              p95: flat(100, domain.hi),
              end: p50[99] ?? 1,
              horizon: 99,
              p50,
            };
            const width = 100;
            const pad = 13 * 0.25;
            const at = endLabelAt(box, domain, band, { width, lines, pad });
            expect(at.mode).toBe("corner");
            plates++;
            const plate = {
              x0: at.x - width - 2 * pad,
              x1: at.x + 2 * pad,
              y0: at.y - 10 - pad,
              y1: at.y + (lines - 1) * LABEL_LINE + 4 + pad,
            };
            expect(plate.y0 >= box.T && plate.y1 <= box.Bt).toBe(true);
            // The median, segment by segment, never crosses the plate (MEDIAN_CLEAR off it).
            const ys: number[] = [];
            for (let i = 0; i < 99; i++) {
              const [xa, xb] = [lx(i, box, 99), lx(i + 1, box, 99)];
              if (xb < plate.x0 || xa > plate.x1) continue;
              const [ya, yb] = [ly(p50[i] ?? 1, box, domain), ly(p50[i + 1] ?? 1, box, domain)];
              for (const t of [0, 0.25, 0.5, 0.75, 1]) {
                const xt = xa + (xb - xa) * t;
                if (xt >= plate.x0 && xt <= plate.x1) ys.push(ya + (yb - ya) * t);
              }
            }
            expect(ys.length > 0).toBe(true);
            const above = ys.every((y) => y >= plate.y1 + MEDIAN_CLEAR - 0.01);
            const below = ys.every((y) => y <= plate.y0 - MEDIAN_CLEAR + 0.01);
            expect(above || below).toBe(true);
            if (above) ups++;
          }
        }
      }
    }
  }
  expect(plates).toBe(270);
  // Both sides are used across the sweep.
  expect(ups > 0 && ups < plates).toBe(true);
  // The roomier side wins: a median ending low puts the plate above it, one ending high below.
  const box = plotBox(390, 693);
  const domain = fitDomain(5e4, 1.5e8);
  const fan = { p5: flat(100, domain.lo), p95: flat(100, domain.hi), horizon: 99 };
  const label = { width: 100, lines: 2, pad: 3 };
  const low = endLabelAt(box, domain, { ...fan, end: 1e5, p50: flat(100, 1e5) }, label);
  expect(low.y + LABEL_LINE + 4 + 3 <= ly(1e5, box, domain) - MEDIAN_CLEAR).toBe(true);
  const high = endLabelAt(box, domain, { ...fan, end: 1e8, p50: flat(100, 1e8) }, label);
  expect(high.y - 10 - 3 >= ly(1e8, box, domain) + MEDIAN_CLEAR).toBe(true);
});

test("Form 2d: drawn, the plate leaves the median's last point visible (the plate rect misses the line)", () => {
  const { ctx, ops } = recorder();
  const domain = fitDomain(50_000, 1e8);
  const mid = [...flat(100, 3.5e7)];
  const b = pack([...flat(100, domain.lo)], mid, [...flat(100, domain.hi)]);
  drawWorld(ctx, PAINT, { width: 390, height: 420, dpr: 1, now: NOW, horizon: b.weeks }, b);
  const plate = ops.find((o) => o.op === "fillRect" && o.style === PAINT.ground);
  if (plate === undefined) throw new Error("no plate");
  const box = plotBox(390, 420);
  const y = ly(3.5e7, box, fittedDomain(b));
  expect(
    y < plate.y - MEDIAN_CLEAR + 0.01 || y > plate.y + (plate.h ?? 0) + MEDIAN_CLEAR - 0.01,
  ).toBe(true);
});

test("Form 2d fallback: when neither side clears the median, the plate takes the roomier side, inside the plot", () => {
  // A plot too short for a 5-line plate either side of the line's end (never hit at 320×300+).
  const box = plotBox(320, 200);
  const domain = fitDomain(5e4, 1.5e8);
  const fan = { p5: flat(100, domain.lo), p95: flat(100, domain.hi), horizon: 99 };
  const lines = 5;
  const pad = 3;
  const fallbacks: { med: number; y0: number; y1: number }[] = [];
  for (let e = 4.8; e <= 8.1; e += 0.05) {
    const end = 10 ** e;
    const at = endLabelAt(
      box,
      domain,
      { ...fan, end, p50: flat(100, end) },
      { width: 100, lines, pad },
    );
    const y0 = at.y - 10 - pad;
    const y1 = at.y + (lines - 1) * LABEL_LINE + 4 + pad;
    const med = ly(end, box, domain);
    const clears = y1 + MEDIAN_CLEAR <= med + 0.01 || y0 - MEDIAN_CLEAR >= med - 0.01;
    if (!clears) fallbacks.push({ med, y0, y1 });
  }
  expect(fallbacks.length > 0).toBe(true);
  // The plate's space runs from the caption floor (its highest top) to the plot's floor.
  const ceiling = Math.min(...fallbacks.map((f) => f.y0));
  expect(ceiling >= box.T).toBe(true);
  const sides = new Set<string>();
  for (const { med, y0, y1 } of fallbacks) {
    expect(y0 >= ceiling - 0.01 && y1 <= box.Bt + 0.01).toBe(true);
    const roomierUp = med - ceiling >= box.Bt - med;
    expect(roomierUp ? y0 === ceiling : y1 >= box.Bt - 0.01).toBe(true);
    sides.add(roomierUp ? "up" : "down");
  }
  expect(sides.size).toBe(2);
});
