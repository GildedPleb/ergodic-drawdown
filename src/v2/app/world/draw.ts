/**
 * World layer painter (V32-BUILD §1b): v32 draw() frame + drawWorld() focused fan, in tokens.
 * Colours and sizes come from the canvas's computed custom properties, so both themes and the
 * ≥75rem chart-text step follow the token files. Frame, axes, Today band and caption draw with
 * or without data (the empty state).
 */

import { fmtUSD } from "../../design/format/money";
import { strings } from "../strings";
import type { PriceBands } from "./bands";
import { bandRange, endValue, outOfRange } from "./bands";
import {
  DEFAULT_DOMAIN,
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
  /** End label on two lines (WorldLayer's container query, chart narrower than 30rem). */
  split: boolean;
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
    split: v("--chart-end-lines") === "2",
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
/** One end-label line, baseline to baseline. */
export const LABEL_LINE = CAP + DESCENT + 2;

export type LabelPlace = {
  /** Right edge (text is right-aligned) and the first line's baseline. */
  x: number;
  y: number;
  mode: "above" | "below" | "corner";
  /** Corner only: a short leader from the label to the end of the median line. */
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
};

/**
 * Where the end label sits (Form m2 + Slice 1 follow-up): right-aligned 12px inside the plot
 * (clear of the $ ticks), anchored to the end of the median line.
 * 1. Above the band, read over the label's own width, if it clears the caption / Today rows.
 * 2. Else below the band, the same way.
 * Either only counts if the label stays near the point it names: its nearest edge within
 * NEAR of the median's end (a sixth of the plot height, at least two label lines), so it
 * never floats mid-chart.
 * 3. Else top-right inside the plot, with a short leader line to the end of the line.
 * Every line is nudged off any gridline it would strike through.
 */
export const endLabelAt = (
  box: PlotBox,
  domain: LogDomain,
  band: { p5: Float64Array; p95: Float64Array; end: number; horizon: number },
  label: { width: number; lines: number },
  short = false,
): LabelPlace => {
  // Never on the caption / Today rows (Today's baseline is T+24), except on a short chart.
  const ceiling = short ? box.T + CAP : box.T + 36;
  const x = box.R - 12;
  const span = (label.lines - 1) * LABEL_LINE;
  const near = Math.max(2 * LABEL_LINE, (box.Bt - box.T) / 6);
  const endY = ly(Number.isFinite(band.end) && band.end > 0 ? band.end : domain.lo, box, domain);
  const from = Math.max(
    0,
    Math.floor(((x - label.width - box.L) / (box.R - box.L)) * band.horizon),
  );
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
  const ticks = axisTicks(domain).map((v) => ly(v, box, domain));
  // Shift a block (first baseline y) up off any gridline one of its lines would cross.
  const clear = (y: number): number => {
    for (let k = 0; k < label.lines; k++) {
      const b = y + k * LABEL_LINE;
      const g = ticks.find((t) => t >= b - CAP - 2 && t <= b + DESCENT + 2);
      if (g !== undefined) return clear(y - (b + DESCENT + 2 - g) - 0.01);
    }
    return y;
  };
  const above = clear(top - 6 - DESCENT - span);
  if (above >= ceiling && endY - (above + span + DESCENT) <= near) {
    return { x, y: above, mode: "above", leader: null };
  }
  const below = clear(bottom + 6 + CAP);
  if (below + span + DESCENT <= box.Bt && below - CAP - endY <= near) {
    return { x, y: below, mode: "below", leader: null };
  }
  const corner = clear(ceiling);
  const blockBottom = corner + span + DESCENT;
  return {
    x,
    y: corner,
    mode: "corner",
    leader: { x1: x - 2, y1: blockBottom + 3, x2: box.R, y2: endY },
  };
};

export type Frame = { width: number; height: number; dpr: number; now: number; horizon: number };

/** Paint the world layer at CSS size width×height (the caller sizes the backing store). */
export const drawWorld = (
  x: Ctx2D,
  p: Paint,
  { width, height, dpr, now, horizon: horizonWeeks }: Frame,
  engineBands: PriceBands | null,
): void => {
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, width, height);
  const box = plotBox(width, height);
  const horizon = engineBands?.weeks ?? horizonWeeks;
  // Probe B2: overflowed bands draw the frame and a message, never a trace or a number.
  const overflow = engineBands !== null && outOfRange(engineBands);
  const bands = overflow ? null : engineBands;
  const range = bands === null ? null : bandRange(bands);
  const domain = range === null ? DEFAULT_DOMAIN : fitDomain(range.low, range.high);
  const frame = { box, domain, horizon };
  const short = height < SHORT;

  // $ gridlines + labels.
  x.font = p.chart;
  x.textAlign = "left";
  x.textBaseline = "alphabetic";
  x.lineWidth = 1;
  // No $ scale in the out-of-range state: there is nothing on it to read.
  for (const v of overflow ? [] : axisTicks(domain)) {
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
      const low = endValue(bands.p5);
      const high = endValue(bands.p95);
      const lines = short
        ? [fmtUSD(mid)]
        : p.split
          ? strings.chart.endLabelLines(mid, low, high)
          : [strings.chart.endLabel(mid, low, high)];
      const textWidth = Math.max(...lines.map((line) => x.measureText(line).width));
      const at = endLabelAt(
        box,
        domain,
        { p5: bands.p5, p95: bands.p95, end: mid, horizon },
        { width: textWidth, lines: lines.length },
        short,
      );
      lines.forEach((line, k) => {
        x.fillText(line, at.x, at.y + k * LABEL_LINE);
      });
      if (at.leader !== null) {
        // A muted hairline on a surface casing, so it reads across the band; it stops short of
        // the median's end so the point it names stays clear.
        const { x1, y1, x2, y2 } = at.leader;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const stop = len > 0 ? Math.max(0, len - p.median - p.casing) / len : 0;
        const ex = x1 + (x2 - x1) * stop;
        const ey = y1 + (y2 - y1) * stop;
        for (const [style, w] of [
          [p.surface, 1 + 2 * p.casing],
          [p.muted, 1],
        ] as const) {
          x.strokeStyle = style;
          x.lineWidth = w;
          x.beginPath();
          x.moveTo(x1, y1);
          x.lineTo(ex, ey);
          x.stroke();
        }
        x.lineWidth = 1;
      }
    }
  }

  // Out of range (Probe B2): a centred message in the plot instead of the bands.
  if (overflow) {
    x.font = p.serif;
    x.textAlign = "center";
    x.fillStyle = p.muted;
    x.fillText(strings.chart.outOfRange, (box.L + box.R) / 2, (box.T + box.Bt) / 2);
  }

  // Caption.
  if (!short) {
    x.font = p.section;
    x.textAlign = "left";
    x.fillStyle = p.accent;
    x.fillText(strings.chart.caption, box.L + 8, box.T + 12);
  }
};
