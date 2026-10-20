/**
 * World layer painter (V32-BUILD §1b): v32 draw() frame + drawWorld() focused fan, in tokens.
 * Colours and sizes come from the canvas's computed custom properties, so both themes and the
 * ≥75rem chart-text step follow the token files. Frame, axes, Today band and caption draw with
 * or without data (the empty state).
 */

import { endSpread } from "./spread";
import { fmtUSD, sciRuns } from "../../design/format/money";
import { strings } from "../strings";
import type { PriceBands } from "./bands";
import { bandRange, endValue, firstPastTop, outOfRange } from "./bands";
import {
  coverTop,
  DEFAULT_DOMAIN,
  fitDomain,
  axisTicks,
  lx,
  ly,
  monthYear,
  plotBox,
  type LogDomain,
  type PlotBox,
  yearTicks,
} from "./geometry";
import { type History, historyRange, unionRange } from "./history";
import { clampView, isZoomed, type View, viewBox, windowRange } from "./zoom";

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
  | "save"
  | "restore"
  | "rect"
  | "clip"
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
  /**
   * §1L.4: the theme's band gain (--band-gain): the visible ladder is BAND_VISIBLE × gain, so
   * each step reads at 390 on linen too (absent: 1, the spec ladder).
   */
  bandGain?: number;
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
    price: v("--asset-btc"),
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
    bandGain: Number.parseFloat(v("--band-gain")) || 1,
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
 * Form 2A-r3: the leader's whole stroke stays this far inside the plot rect: more than half its
 * widest stroke, the --surface casing (1 + 2 × --line-casing = 4px at 1.5).
 */
export const LEADER_INSET = 3;

/**
 * §1L.4: the visible orange of the four nested bands, outermost first: min–max, p1–p99, p5–p95,
 * p25–p75. The fills stack, so each layer's own alpha is solved for the compound to land on these.
 */
export const BAND_VISIBLE = [0.04, 0.07, 0.11, 0.18] as const;

/** Layer alphas a_k with 1 − Π(1 − a_i, i ≤ k) = visible_k. */
export const layerAlphas = (visible: readonly number[]): number[] => {
  let through = 1;
  return visible.map((v) => {
    const a = 1 - (1 - v) / through;
    through *= 1 - a;
    return a;
  });
};

/** The four layer alphas for a theme gain (1: the spec ladder .04 / .07 / .11 / .18). */
export const bandAlphas = (gain = 1): number[] =>
  layerAlphas(BAND_VISIBLE.map((v) => Math.min(0.9, v * (gain > 0 ? gain : 1))));

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
/** Half the height a $ label takes about its gridline (cap above the baseline at y+3, descent). */
const TICK_ROW = 8;
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
  label: { width: number; lines: number; pad?: number },
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
  // §2A r2 (Form): the corner plate (text plus its pad) keeps TICK_ROW clear of the $ gridlines,
  // stepping down past one in the way while it still fits the plot; where the gridlines are too
  // dense for that, the $ label on its rows is dropped instead (endLayout's keepOut).
  const pad = label.pad ?? 0;
  let corner = ceiling;
  for (let n = 0; n < ticks.length; n++) {
    const plateTop = corner - CAP - pad;
    const plateBottom = corner + span + DESCENT + pad;
    const g = ticks.find((t) => t > plateTop - TICK_ROW && t < plateBottom + TICK_ROW);
    if (g === undefined) break;
    corner = g + TICK_ROW + CAP + pad + 0.01;
  }
  if (corner + span + DESCENT + pad > box.Bt || corner - ceiling > near) corner = clear(ceiling);
  const blockTop = corner - CAP - pad;
  const blockBottom = corner + span + DESCENT + pad;
  // The leader leaves the plate's edge that faces the end of the line and aims at it, its whole
  // stroke (casing included) inside the plot rect like the label (Form 2A-r3): it stops
  // LEADER_INSET short of the right edge and stays LEADER_INSET inside the top and bottom.
  const inY = (y: number): number =>
    Math.min(box.Bt - LEADER_INSET, Math.max(box.T + LEADER_INSET, y));
  const y1 = inY(endY < blockTop ? blockTop : blockBottom);
  const x2 = box.R - LEADER_INSET;
  return {
    x,
    y: corner,
    mode: "corner",
    leader: { x1: Math.min(x - 2, x2), y1, x2, y2: inY(endY) },
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
  /** What a tick label must stay clear of: the plate, or the bare label's own box (m10). */
  keepOut: Rect;
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
  const endsFinite = !outOfRange(bands) && mid > 0;
  let lines: string[] = [];
  if (endsFinite) {
    // Form 2A-r3: the same N rule as the headline (spread.ts).
    lines = short ? [fmtUSD(mid)] : strings.chart.endLines(endSpread(bands), p.split);
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
        { p5: bands.min, p95: bands.max, end: mid, horizon },
        { width: textWidth, lines: all.length, pad: p.serifPx * 0.25 },
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
  // §2A r2: a corner plate keeps the $ labels on its rows out to the canvas edge (TICK_ROW apart).
  const keepOut =
    plate === null
      ? { x0: at.x - textWidth, y0: at.y - CAP, x1: at.x, y1: bottom }
      : { ...plate, y0: plate.y0 - TICK_ROW / 2, y1: plate.y1 + TICK_ROW / 2, x1: Infinity };
  return { lines, all, at, textWidth, bottom, plate, keepOut };
};

const serifRuns = (p: Paint): RunFont => ({
  font: p.serif,
  upright: p.serifUpright,
  kern: p.supKern * p.serifPx,
});

const drawEndLabel = (x: Ctx2D, p: Paint, layout: EndLayout): void => {
  const { lines, all, at, textWidth, plate } = layout;
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
};

/**
 * The Y axis for the full horizon: min–max (the outermost edge, §1L.4) plus 5% of the log span,
 * raised to cover clipped data (n10); §2A with the historic min / max folded in.
 */
export const fittedDomain = (
  bands: PriceBands | null,
  history: History | null = null,
): LogDomain => {
  const range = unionRange(
    bands === null ? null : bandRange(bands),
    historyRange(history, Number.NEGATIVE_INFINITY, 0),
  );
  const fitted = range === null ? DEFAULT_DOMAIN : fitDomain(range.low, range.high);
  return bands !== null && firstPastTop(bands) >= 0 && range !== null
    ? coverTop(fitted, range.high)
    : fitted;
};

/**
 * §1T / §2A: the Y axis the window should show: zoomed, the window's min–max and historic prints
 * (5% of the log span each side); else the whole frame's fit.
 */
export const targetDomain = (
  bands: PriceBands,
  history: History | null,
  view: View,
  zoomed: boolean,
): LogDomain => {
  const range = zoomed
    ? unionRange(windowRange(bands, view), historyRange(history, view.from, view.to))
    : null;
  return range === null ? fittedDomain(bands, history) : fitDomain(range.low, range.high);
};

export type Frame = {
  width: number;
  height: number;
  dpr: number;
  now: number;
  horizon: number;
  /** §1T: the zoom window (absent: the full horizon). */
  view?: View | undefined;
  /** §1T: the Y axis as the caller eases it (the window's fit); absent: fittedDomain(bands). */
  domain?: LogDomain | undefined;
  /** §2A: the traded price; the frame then reaches back to its first print (view.from < 0). */
  history?: History | null | undefined;
};

/**
 * §1T / §2A: the window in weeks from today, made valid inside the frame [-past, horizon]
 * (absent: the whole frame).
 */
export const frameView = (asked: View | undefined, horizon: number, past: number): View => {
  if (asked === undefined) return { from: past > 0 ? -past : 0, to: horizon };
  const v = clampView({ from: asked.from + past, to: asked.to + past }, horizon + past);
  return { from: v.from - past, to: v.to - past };
};

/** Paint the world layer at CSS size width×height (the caller sizes the backing store). */
export const drawWorld = (
  x: Ctx2D,
  p: Paint,
  { width, height, dpr, now, horizon: horizonWeeks, view: asked, domain: eased, history }: Frame,
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
  // §1T: a zoomed window draws through a plot box widened so `from` lands on L and `to` on R,
  // clipped to the real plot; the Y axis is the window's own fit, eased by the caller.
  // §2A: with the historic price on, the frame starts at its first print, `past` weeks back.
  const past = history?.past ?? 0;
  const span = horizon + past;
  const view = frameView(asked, horizon, past);
  const zoomed = isZoomed({ from: view.from + past, to: view.to + past }, span);
  const domain = eased ?? fittedDomain(bands, history ?? null);
  const wide = zoomed || past > 0 ? viewBox(box, view, horizon) : box;
  const endShown = view.to >= horizon - 1e-6;
  // Today shows while it is inside the window (with history on, it separates past from futures).
  const atToday = view.from <= 1e-6 && view.to >= -1e-6;
  const todayX = lx(0, wide, horizon);
  const frame = { box: wide, domain, horizon };
  const short = height < SHORT;

  // $ gridlines + labels.
  x.font = p.chart;
  x.textAlign = "left";
  x.textBaseline = "alphabetic";
  x.lineWidth = 1;
  // The end label is laid out first: a tick whose label would sit under its plate is dropped (m8).
  const layout =
    bands === null || !endShown
      ? null
      : endLayout(x, p, { box: wide, domain, horizon, short }, bands, overflow);
  const chartRuns: RunFont = { font: p.chart, upright: p.chart, kern: p.supKern * p.chartPx };
  // m10: a tick whose label would sit on the end label (its plate, or its bare box) is dropped,
  // gridline and all, in every layout.
  const ticks: { v: number; y: number; text: string; left: number; base: number }[] = [];
  for (const v of axisTicks(domain)) {
    const y = ly(v, box, domain);
    const text = fmtUSD(v);
    const w = runsWidth(x, text, chartRuns);
    const inside = w > width - box.R - 4;
    const left = inside ? box.R - 4 - w : box.R + 4;
    const base = inside ? y - 3 : y + 3;
    const rect = { x0: left, y0: base - CAP, x1: left + w, y1: base + DESCENT };
    if (layout !== null && overlaps(rect, layout.keepOut)) continue;
    ticks.push({ v, y, text, left, base });
  }
  // m8 (Probe): gridlines first; the bands and median next; the halos and labels last, so the
  // fan passes behind every label.
  x.strokeStyle = p.hairline;
  x.setLineDash([1, 3]);
  for (const { y } of ticks) {
    x.beginPath();
    x.moveTo(box.L, y);
    x.lineTo(box.R, y);
    x.stroke();
  }
  x.setLineDash([]);

  // Baseline.
  x.strokeStyle = p.rule;
  x.beginPath();
  x.moveTo(box.L, box.Bt + 0.5);
  x.lineTo(box.R, box.Bt + 0.5);
  x.stroke();

  if (!short) {
    x.textAlign = "center";
    x.fillStyle = p.muted;
    for (const tick of yearTicks(now, horizon, wide, -past)) {
      if (tick.x >= box.L && tick.x <= box.R) x.fillText(String(tick.year), tick.x, box.Bt + 13);
    }
  }

  // Everything plotted is clipped to the plot rect (§2A r2): nothing past its left or right edge
  // (§1T), above its top or below its floor, even mid-ease or while the sheet resizes.
  x.save();
  x.beginPath();
  x.rect(box.L, box.T, box.R - box.L, box.Bt - box.T);
  x.clip();
  // Quantile bands, casing, median.
  if (bands !== null) {
    // §1L.4: four nested fills, no outline on any band edge; the edges are the steps in fill.
    x.fillStyle = p.price;
    const [edge = 0, outer = 0, middle = 0, inner = 0] = bandAlphas(p.bandGain);
    fill(x, bands.min, bands.max, edge, frame);
    fill(x, bands.p1, bands.p99, outer, frame);
    fill(x, bands.p5, bands.p95, middle, frame);
    fill(x, bands.p25, bands.p75, inner, frame);
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
      x.moveTo(lx(clipFrom, wide, horizon), box.T + 0.5);
      x.lineTo(box.R, box.T + 0.5);
      x.stroke();
    }
  }

  // §2A: the traded price, 1px solid in the asset's colour, every vertex a real weekly print.
  if (history !== null && history !== undefined && history.t.length > 0) {
    x.strokeStyle = p.price;
    x.lineWidth = 1;
    x.lineJoin = "miter";
    x.beginPath();
    for (let i = 0; i < history.t.length; i++) {
      const px = lx(history.t[i] ?? 0, wide, horizon);
      const py = ly(history.y[i] ?? domain.lo, box, domain);
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
  }
  x.restore();

  // $ tick labels. Every gridline is labelled (Form, n4 revision): a label too wide for the right
  // margin ($1,000T and up, $1.23×10²¹) sits just inside the plot, right-aligned above its
  // gridline. m8 (Form c): from $1,000T up a 3px --ground halo (paint-order: stroke) keeps the
  // label legible over the fan.
  x.font = p.chart;
  x.textAlign = "left";
  for (const { v, text, left, base } of ticks) {
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

  // Today line + time bar. §1T: while zoomed the bar is the position bar (a hairline track, the
  // window in --today), and Today shows only while the window starts at today.
  x.strokeStyle = p.today;
  x.lineWidth = 1.5;
  if (atToday) {
    x.beginPath();
    x.moveTo(todayX, box.T - 6);
    x.lineTo(todayX, box.Bt);
    x.stroke();
  }
  x.lineWidth = 1;
  if (!short) {
    const w = box.R - box.L;
    x.fillStyle = p.today;
    if (zoomed) {
      x.fillStyle = p.hairline;
      x.fillRect(box.L, box.Bt + 19, w, 1);
      x.fillStyle = p.today;
      x.fillRect(
        box.L + (w * (view.from + past)) / span,
        box.Bt + 18,
        (w * (view.to - view.from)) / span,
        2,
      );
    } else {
      // §1Z: the line alone; no start dot and no end date (the limits show when zoom stops).
      x.fillRect(box.L, box.Bt + 18, w, 2);
    }
    x.font = p.serif;
    x.textAlign = "left";
    // §1b puts this at T+4, on top of the caption at T+12; v32's draw() has it at T+20. Clear
    // of the caption's cap height: T+24.
    if (atToday) x.fillText(strings.chart.today(monthYear(now)), todayX + 5, box.T + 24);
  }

  // End label (plus the out-of-range caption under it), its plate and leader inside the plot.
  if (layout !== null) {
    x.save();
    x.beginPath();
    x.rect(box.L, box.T, box.R - box.L, box.Bt - box.T);
    x.clip();
    drawEndLabel(x, p, layout);
    x.restore();
  }

  // Caption.
  if (!short) {
    x.font = p.section;
    x.textAlign = "left";
    x.fillStyle = p.accent;
    x.fillText(strings.chart.caption, box.L + 8, box.T + 12);
  }
};
