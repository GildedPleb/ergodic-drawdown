/**
 * World layer painter (V32-BUILD §1b): v32 draw() frame + drawWorld() focused fan, in tokens.
 * Colours and sizes come from the canvas's computed custom properties, so both themes and the
 * ≥75rem chart-text step follow the token files. Frame, axes, Today band and caption draw with
 * or without data (the empty state).
 */

import { fmtUSD, sciRuns } from "../../design/format/money";
import { strings } from "../strings";
import type { PriceBands } from "./bands";
import { bandRange, endValue, firstPastTop, outOfRange } from "./bands";
import {
  coverTop,
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
  | "strokeText"
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
  /** The page ground: the corner plates and the tick-label halos (Form b, c). */
  ground: string;
  accent: string;
  /** End label on two lines (WorldLayer's container query, chart narrower than 30rem). */
  split: boolean;
  /** --t-chart-serif in px: the end label's em (its plate pads 0.25em 0.5em). */
  serifPx: number;
  /** --t-chart in px: the $ labels' em. */
  chartPx: number;
  /** --sup-kern in em: the space before a scientific exponent (Form d). */
  supKern: number;
  median: number;
  casing: number;
  chart: string;
  serif: string;
  /** The same face upright: scientific exponents inside italic labels (Form). */
  serifUpright: string;
  section: string;
};

const SHORT = 150;
/** $1,000T: tick labels from here up carry the halo (m8). */
const HALO_FROM = 1e15;

const remPx = (value: string, root: number): number => {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.trim().endsWith("rem") ? n * root : n;
};

/** Token values from the canvas's computed style (both themes follow the token files). */
export const readPaint = (canvas: Element): Paint =>
  paintFrom(
    getComputedStyle(canvas),
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  );

/** The Paint for a computed style and the root font size in px. */
export const paintFrom = (
  css: { getPropertyValue: (name: string) => string },
  root: number,
): Paint => {
  const v = (name: string): string => css.getPropertyValue(name).trim();
  const sans = v("--f-sans");
  return {
    hairline: v("--hairline"),
    muted: v("--text-muted"),
    rule: v("--rule"),
    today: v("--today-line"),
    price: v("--path-btc-price"),
    surface: v("--surface"),
    ground: v("--ground"),
    accent: v("--accent"),
    split: v("--chart-end-lines") === "2",
    median: remPx(v("--line-median"), root) || 2,
    casing: remPx(v("--line-casing"), root) || 1.5,
    // --t-chart's "×1.3 at ≥75rem" is not applied: the $ labels live in v32's fixed 44px right
    // margin (R = W−44) and would clip.
    chart: `500 ${remPx(v("--t-chart"), root)}px ${sans}`,
    serif: `italic 400 ${remPx(v("--t-chart-serif"), root)}px ${v("--f-text")}`,
    serifUpright: `400 ${remPx(v("--t-chart-serif"), root)}px ${v("--f-text")}`,
    serifPx: remPx(v("--t-chart-serif"), root) || 13,
    chartPx: remPx(v("--t-chart"), root) || 12,
    supKern: Number.parseFloat(v("--sup-kern")) || 0,
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
    const v = band[i] ?? Number.NaN;
    // n10: a value past what a double holds (Infinity / NaN) is clipped at the plot's top edge.
    const y = Number.isFinite(v) ? ly(Math.max(v, domain.lo / 10), box, domain) : box.T;
    x.lineTo(lx(i, box, horizon), Math.max(box.T, y));
  }
};

/**
 * §1L.4: the visible orange of the outer (p1–p99), middle (p5–p95) and inner (p25–p75) bands. The
 * fills stack, so each layer's own alpha is solved for the compound to land on these.
 */
export const BAND_VISIBLE = [0.06, 0.11, 0.18] as const;

/** Layer alphas a_k with 1 − Π(1 − a_i, i ≤ k) = visible_k. */
export const layerAlphas = (visible: readonly number[]): number[] => {
  let through = 1;
  return visible.map((v) => {
    const a = 1 - (1 - v) / through;
    through *= 1 - a;
    return a;
  });
};

const [ALPHA_OUTER = 0, ALPHA_MIDDLE = 0, ALPHA_INNER = 0] = layerAlphas(BAND_VISIBLE);

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

/** Width of a label whose scientific exponents are set upright (Form): each run in its own font. */
/** A label's type: its face, the upright face for exponents, and the kern before each exponent. */
type RunFont = { font: string; upright: string; kern: number };

const runsWidth = (x: Ctx2D, text: string, f: RunFont): number => {
  let w = 0;
  for (const run of sciRuns(text)) {
    x.font = run.sup ? f.upright : f.font;
    w += x.measureText(run.text).width + (run.sup ? f.kern : 0);
  }
  x.font = f.font;
  return w;
};

/**
 * Text right-aligned at `right` (or left-aligned at `left`), every exponent run in the upright
 * face after --sup-kern. `stroke` paints the halo pass (strokeText) instead of the fill.
 */
const drawRuns = (
  x: Ctx2D,
  text: string,
  edge: { right: number } | { left: number },
  y: number,
  f: RunFont,
  halo = false,
): void => {
  const paint = (t: string, at: number): void => {
    if (halo) x.strokeText(t, at, y);
    else x.fillText(t, at, y);
  };
  const runs = sciRuns(text);
  const align = x.textAlign;
  x.font = f.font;
  if (runs.length === 1 && runs[0]?.sup === false) {
    if ("right" in edge) {
      x.textAlign = "right";
      paint(text, edge.right);
    } else {
      x.textAlign = "left";
      paint(text, edge.left);
    }
    x.textAlign = align;
    return;
  }
  let at = "right" in edge ? edge.right - runsWidth(x, text, f) : edge.left;
  x.textAlign = "left";
  for (const run of runs) {
    if (run.sup) at += f.kern;
    x.font = run.sup ? f.upright : f.font;
    paint(run.text, at);
    at += x.measureText(run.text).width;
  }
  x.font = f.font;
  x.textAlign = align;
};

type Rect = { x0: number; y0: number; x1: number; y1: number };

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Where the end label goes, what it says, and its corner plate if it has one. */
type EndLayout = {
  lines: string[];
  all: string[];
  at: LabelPlace;
  textWidth: number;
  bottom: number;
  plate: Rect | null;
};

/**
 * The end label, anchored to the end of the median (§1b line 124). Out of range (n10), the caption
 * goes on the line under it; when the end itself ran past a double there is no number to show, so
 * the caption stands alone at the top right. Top-right placements (m7) sit on an opaque square
 * plate in --surface, padded 0.25em 0.5em, drawn over the band, so the band passes behind them.
 */
const endLayout = (
  x: Ctx2D,
  p: Paint,
  {
    box,
    domain,
    horizon,
    short,
  }: { box: PlotBox; domain: LogDomain; horizon: number; short: boolean },
  bands: PriceBands,
  overflow: boolean,
): EndLayout | null => {
  const mid = endValue(bands.p50);
  const low = endValue(bands.p5);
  const high = endValue(bands.p95);
  const endsFinite = !outOfRange(bands) && mid > 0;
  let lines: string[] = [];
  if (endsFinite) {
    if (short) lines = [fmtUSD(mid)];
    else if (p.split) lines = strings.chart.endLabelLines(mid, low, high);
    else lines = [strings.chart.endLabel(mid, low, high)];
  }
  const caption = overflow && !short ? [strings.chart.outOfRange] : [];
  const all = [...lines, ...caption];
  if (all.length === 0) return null;
  x.font = p.serif;
  const serif = serifRuns(p);
  const textWidth = Math.max(...all.map((line) => runsWidth(x, line, serif)));
  const at: LabelPlace = endsFinite
    ? endLabelAt(
        box,
        domain,
        // The label clears the whole drawn fan (the outer band), not only p5–p95.
        { p5: bands.p1, p95: bands.p99, end: mid, horizon },
        { width: textWidth, lines: all.length },
        short,
      )
    : { x: box.R - 12, y: short ? box.T + CAP : box.T + 36, mode: "corner", leader: null };
  const bottom = at.y + (all.length - 1) * LABEL_LINE + DESCENT;
  const padX = p.serifPx * 0.5;
  const padY = p.serifPx * 0.25;
  const plate =
    at.mode === "corner"
      ? {
          x0: at.x - textWidth - padX,
          y0: at.y - CAP - padY,
          x1: at.x + padX,
          y1: bottom + padY,
        }
      : null;
  return { lines, all, at, textWidth, bottom, plate };
};

const serifRuns = (p: Paint): RunFont => ({
  font: p.serif,
  upright: p.serifUpright,
  kern: p.supKern * p.serifPx,
});

const drawEndLabel = (x: Ctx2D, p: Paint, layout: EndLayout): void => {
  const { lines, all, at, textWidth, bottom, plate } = layout;
  if (plate !== null) {
    // Form (b): the plate is the page ground, so the label reads as cut out of the chart.
    x.fillStyle = p.ground;
    x.fillRect(plate.x0, plate.y0, textWidth + p.serifPx, plate.y1 - plate.y0);
  }
  const serif = serifRuns(p);
  all.forEach((line, k) => {
    x.fillStyle = k < lines.length ? p.price : p.muted;
    drawRuns(x, line, { right: at.x }, at.y + k * LABEL_LINE, serif);
  });
  if (at.leader === null) return;
  // A muted hairline on a surface casing from the plate's lower edge, so it reads across the band;
  // it stops short of the median's end so the point it names stays clear.
  const { x1, x2, y2 } = at.leader;
  const y1 = bottom + p.serifPx * 0.25;
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
  // §1h out of range (Form n10): bands that ran past a double are clipped at the plot's top edge
  // with a hairline, the axis rises to a decade covering the finite data, and a caption sits
  // under the end label.
  const bands = engineBands;
  const clipFrom = bands === null ? -1 : firstPastTop(bands);
  const overflow = clipFrom >= 0;
  const range = bands === null ? null : bandRange(bands);
  const fitted = range === null ? DEFAULT_DOMAIN : fitDomain(range.low, range.high);
  const domain = overflow && range !== null ? coverTop(fitted, range.high) : fitted;
  const frame = { box, domain, horizon };
  const short = height < SHORT;

  // $ gridlines + labels.
  x.font = p.chart;
  x.textAlign = "left";
  x.textBaseline = "alphabetic";
  x.lineWidth = 1;
  // The end label is laid out first: a tick whose label would sit under its plate is dropped (m8).
  const layout =
    bands === null ? null : endLayout(x, p, { box, domain, horizon, short }, bands, overflow);
  const chartRuns: RunFont = { font: p.chart, upright: p.chart, kern: p.supKern * p.chartPx };
  for (const v of axisTicks(domain)) {
    const y = ly(v, box, domain);
    const text = fmtUSD(v);
    const w = runsWidth(x, text, chartRuns);
    const inside = w > width - box.R - 4;
    const left = inside ? box.R - 4 - w : box.R + 4;
    const base = inside ? y - 3 : y + 3;
    const rect = { x0: left, y0: base - CAP, x1: left + w, y1: base + DESCENT };
    if (layout?.plate != null && overlaps(rect, layout.plate)) continue;
    x.strokeStyle = p.hairline;
    x.setLineDash([1, 3]);
    x.beginPath();
    x.moveTo(box.L, y);
    x.lineTo(box.R, y);
    x.stroke();
    x.setLineDash([]);
    // Every gridline is labelled (Form, n4 revision): a label too wide for the right margin
    // ($1,000T and up, $1.23×10²¹) sits just inside the plot, right-aligned above its gridline.
    // m8 (Form c): from $1,000T up a 3px --ground halo (paint-order: stroke) keeps the label
    // legible over the fan.
    if (v >= HALO_FROM) {
      x.strokeStyle = p.ground;
      x.lineWidth = 3;
      x.lineJoin = "round";
      drawRuns(x, text, { left }, base, chartRuns, true);
      x.lineWidth = 1;
    }
    x.fillStyle = p.muted;
    drawRuns(x, text, { left }, base, chartRuns);
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
    // §1L.4: three nested fills, no outline on any band edge; the edges are the steps in fill.
    x.fillStyle = p.price;
    fill(x, bands.p1, bands.p99, ALPHA_OUTER, frame);
    fill(x, bands.p5, bands.p95, ALPHA_MIDDLE, frame);
    fill(x, bands.p25, bands.p75, ALPHA_INNER, frame);
    x.lineJoin = "round";
    x.strokeStyle = p.surface;
    x.lineWidth = p.median + p.casing * 2;
    stroke(x, bands.p50, frame);
    x.strokeStyle = p.price;
    x.lineWidth = p.median;
    stroke(x, bands.p50, frame);
    x.lineWidth = 1;
    // n10: the clip edge, a 1px hairline along the plot's top from the first clipped week.
    if (overflow) {
      x.strokeStyle = p.price;
      x.beginPath();
      x.moveTo(lx(clipFrom, box, horizon), box.T + 0.5);
      x.lineTo(box.R, box.T + 0.5);
      x.stroke();
    }
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

  // End label (plus the out-of-range caption under it).
  if (layout !== null) drawEndLabel(x, p, layout);

  // Caption.
  if (!short) {
    x.font = p.section;
    x.textAlign = "left";
    x.fillStyle = p.accent;
    x.fillText(strings.chart.caption, box.L + 8, box.T + 12);
  }
};
