/**
 * World layer painter (V32-BUILD §1b): v32 draw() frame + drawWorld() focused fan, in tokens.
 * Colours and sizes come from the canvas's computed custom properties, so both themes and the
 * ≥75rem chart-text step follow the token files. Frame, axes, Today band and caption draw with
 * or without data (the empty state).
 */

import { fmtUSD } from "../../design/format/money";
import { strings } from "../strings";
import type { PriceBands } from "./bands";
import { bandRange, endValue } from "./bands";
import {
  fitDomain,
  axisTicks,
  endYear,
  lx,
  ly,
  monthYear,
  plotBox,
  type LogDomain,
  type PlotBox,
  yearTicks,
} from "./geometry";

/** The slice of the 2D context the painter uses (tests pass a recorder). */
export type Ctx2D = Pick<
  CanvasRenderingContext2D,
  | "setTransform"
  | "clearRect"
  | "beginPath"
  | "moveTo"
  | "lineTo"
  | "closePath"
  | "stroke"
  | "fill"
  | "fillRect"
  | "arc"
  | "setLineDash"
  | "fillText"
  | "font"
  | "textAlign"
  | "textBaseline"
  | "lineWidth"
  | "lineJoin"
  | "strokeStyle"
  | "fillStyle"
  | "globalAlpha"
> & { measureText(text: string): { width: number } };

export type Paint = {
  hairline: string;
  muted: string;
  rule: string;
  today: string;
  price: string;
  surface: string;
  accent: string;
  outer: number;
  inner: number;
  /** p5 / p95 hairline edge: alpha and width. */
  edgeAlpha: number;
  edge: number;
  median: number;
  casing: number;
  chart: string;
  serif: string;
  section: string;
};

const SHORT = 150;
const DEFAULT_DOMAIN: LogDomain = { lo: 1e4, hi: 1e7 };

const remPx = (value: string, root: number): number => {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.trim().endsWith("rem") ? n * root : n;
};

/** Token values from the canvas's computed style (both themes follow the token files). */
export const readPaint = (canvas: Element): Paint => {
  const css = getComputedStyle(canvas);
  const v = (name: string): string => css.getPropertyValue(name).trim();
  const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const sans = v("--f-sans");
  return {
    hairline: v("--hairline"),
    muted: v("--text-muted"),
    rule: v("--rule"),
    today: v("--today-line"),
    price: v("--path-btc-price"),
    surface: v("--surface"),
    accent: v("--accent"),
    outer: Number.parseFloat(v("--fan-focus-outer")) || 0.1,
    inner: Number.parseFloat(v("--fan-focus-inner")) || 0.16,
    edgeAlpha: Number.parseFloat(v("--fan-edge-outer-a")) || 0.55,
    edge: remPx(v("--line-fan-edge-outer"), root) || 1,
    median: remPx(v("--line-median"), root) || 2,
    casing: remPx(v("--line-casing"), root) || 1.5,
    // --t-chart's "×1.3 at ≥75rem" is not applied: the $ labels live in v32's fixed 44px right
    // margin (R = W−44) and would clip.
    chart: `500 ${remPx(v("--t-chart"), root)}px ${sans}`,
    serif: `italic 400 ${remPx(v("--t-chart-serif"), root)}px ${v("--f-text")}`,
    section: `600 ${remPx(v("--t-section"), root)}px ${sans}`,
  };
};

const trace = (
  x: Ctx2D,
  band: Float64Array,
  box: PlotBox,
  domain: LogDomain,
  horizon: number,
  reverse = false,
): void => {
  const n = band.length;
  for (let k = 0; k < n; k++) {
    const i = reverse ? n - 1 - k : k;
    const v = band[i] ?? domain.lo;
    x.lineTo(lx(i, box, horizon), ly(Math.max(v, domain.lo / 10), box, domain));
  }
};

const fill = (
  x: Ctx2D,
  low: Float64Array,
  high: Float64Array,
  alpha: number,
  frame: { box: PlotBox; domain: LogDomain; horizon: number },
): void => {
  x.beginPath();
  trace(x, low, frame.box, frame.domain, frame.horizon);
  trace(x, high, frame.box, frame.domain, frame.horizon, true);
  x.closePath();
  x.globalAlpha = alpha;
  x.fill();
  x.globalAlpha = 1;
};

const stroke = (
  x: Ctx2D,
  band: Float64Array,
  frame: { box: PlotBox; domain: LogDomain; horizon: number },
): void => {
  x.beginPath();
  trace(x, band, frame.box, frame.domain, frame.horizon);
  x.stroke();
};

/** Text box around an alphabetic baseline: cap height above, descent below (chart sizes). */
const CAP = 10;
const DESCENT = 4;

/**
 * Where the end label sits (Form m2): right-aligned 12px inside the plot (clear of the $ tick
 * labels in the right margin), above the band wherever the label spans it, else below the band,
 * never on the caption / Today rows,
 * and nudged off any gridline it would strike through. The band is read over the label's own
 * width, not just its last point, so a peak just before the end never runs through the text.
 */
export const endLabelAt = (
  box: PlotBox,
  domain: LogDomain,
  band: { p5: Float64Array; p95: Float64Array; horizon: number },
  width: number,
  short = false,
): { x: number; y: number } => {
  // Never on the caption / Today rows (Today's baseline is T+24), except on a short chart.
  const ceiling = short ? box.T + CAP : box.T + 36;
  const x = box.R - 12;
  const from = Math.max(0, Math.floor(((x - width - box.L) / (box.R - box.L)) * band.horizon));
  let top = box.Bt;
  let bottom = box.T;
  for (let i = from; i < band.p95.length; i++) {
    const hi = band.p95[i];
    const lo = band.p5[i];
    if (hi !== undefined && Number.isFinite(hi) && hi > 0) top = Math.min(top, ly(hi, box, domain));
    if (lo !== undefined && Number.isFinite(lo) && lo > 0) {
      bottom = Math.max(bottom, ly(lo, box, domain));
    }
  }
  const clear = (y: number): number => {
    for (const v of axisTicks(domain)) {
      const g = ly(v, box, domain);
      if (g >= y - CAP - 2 && g <= y + DESCENT + 2) return g - DESCENT - 2;
    }
    return y;
  };
  const above = clear(top - 6);
  if (above >= ceiling) return { x, y: above };
  return { x, y: Math.min(clear(bottom + CAP + 6), box.Bt - DESCENT) };
};

export type Frame = { width: number; height: number; dpr: number; now: number; horizon: number };

/** Paint the world layer at CSS size width×height (the caller sizes the backing store). */
export const drawWorld = (
  x: Ctx2D,
  p: Paint,
  { width, height, dpr, now, horizon: horizonWeeks }: Frame,
  bands: PriceBands | null,
): void => {
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, width, height);
  const box = plotBox(width, height);
  const horizon = bands?.weeks ?? horizonWeeks;
  const range = bands === null ? null : bandRange(bands);
  const domain = range === null ? DEFAULT_DOMAIN : fitDomain(range.low, range.high);
  const frame = { box, domain, horizon };
  const short = height < SHORT;

  // $ gridlines + labels.
  x.font = p.chart;
  x.textAlign = "left";
  x.textBaseline = "alphabetic";
  x.lineWidth = 1;
  for (const v of axisTicks(domain)) {
    const y = ly(v, box, domain);
    x.strokeStyle = p.hairline;
    x.setLineDash([1, 3]);
    x.beginPath();
    x.moveTo(box.L, y);
    x.lineTo(box.R, y);
    x.stroke();
    x.setLineDash([]);
    // A label that cannot fit the right margin is left off rather than clipped by the edge.
    const text = fmtUSD(v);
    if (x.measureText(text).width <= width - box.R - 4) {
      x.fillStyle = p.muted;
      x.fillText(text, box.R + 4, y + 3);
    }
  }

  // Baseline.
  x.strokeStyle = p.rule;
  x.beginPath();
  x.moveTo(box.L, box.Bt + 0.5);
  x.lineTo(box.R, box.Bt + 0.5);
  x.stroke();

  if (!short) {
    x.textAlign = "center";
    x.fillStyle = p.muted;
    for (const tick of yearTicks(now, horizon, box)) {
      x.fillText(String(tick.year), tick.x, box.Bt + 13);
    }
  }

  // Quantile bands, casing, median.
  if (bands !== null) {
    x.fillStyle = p.price;
    fill(x, bands.p5, bands.p95, p.outer, frame);
    fill(x, bands.p25, bands.p75, p.inner, frame);
    // Hairline edges on p5 and p95, so the 5–95 band reads as a band even when it is narrow.
    x.strokeStyle = p.price;
    x.lineWidth = p.edge;
    x.globalAlpha = p.edgeAlpha;
    stroke(x, bands.p5, frame);
    stroke(x, bands.p95, frame);
    x.globalAlpha = 1;
    x.lineJoin = "round";
    x.strokeStyle = p.surface;
    x.lineWidth = p.median + p.casing * 2;
    stroke(x, bands.p50, frame);
    x.strokeStyle = p.price;
    x.lineWidth = p.median;
    stroke(x, bands.p50, frame);
    x.lineWidth = 1;
  }

  // Today line + time bar.
  x.strokeStyle = p.today;
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(box.L, box.T - 6);
  x.lineTo(box.L, box.Bt);
  x.stroke();
  x.lineWidth = 1;
  if (!short) {
    x.fillStyle = p.today;
    x.fillRect(box.L, box.Bt + 18, box.R - box.L, 2);
    x.beginPath();
    x.arc(box.L, box.Bt + 20, 5, 0, Math.PI * 2);
    x.fill();
    x.font = p.serif;
    x.textAlign = "left";
    // §1b puts this at T+4, on top of the caption at T+12; v32's draw() has it at T+20. Clear
    // of the caption's cap height: T+24.
    x.fillText(strings.chart.today(monthYear(now)), box.L + 5, box.T + 24);
    x.font = p.chart;
    x.textAlign = "right";
    x.fillText(String(endYear(now, horizon)), box.R, box.Bt + 32);
  }

  // End label.
  if (bands !== null) {
    const mid = endValue(bands.p50);
    if (Number.isFinite(mid) && mid > 0) {
      x.font = p.serif;
      x.textAlign = "right";
      x.fillStyle = p.price;
      const label = short
        ? fmtUSD(mid)
        : strings.chart.endLabel(mid, endValue(bands.p5), endValue(bands.p95));
      const at = endLabelAt(
        box,
        domain,
        { p5: bands.p5, p95: bands.p95, horizon },
        x.measureText(label).width,
        short,
      );
      x.fillText(label, at.x, at.y);
    }
  }

  // Caption.
  if (!short) {
    x.font = p.section;
    x.textAlign = "left";
    x.fillStyle = p.accent;
    x.fillText(strings.chart.caption, box.L + 8, box.T + 12);
  }
};
