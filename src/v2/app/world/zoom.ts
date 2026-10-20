/**
 * V32-BUILD §1T: the chart's zoom window, in sample positions (weeks from today, 0 … last). Pure.
 * Zoomed out, the window is the full data and never wider; zoomed in, it holds 8 samples at the
 * least; panning is hard-clamped inside the full frame (no overscroll).
 */
import type { PriceBands } from "./bands";
import { fitDomain, type LogDomain } from "./geometry";

export type View = { from: number; to: number };

/** The zoom-in limit: an 8-sample window (7 weeks between its ends). */
export const MIN_SAMPLES = 8;

export const fullView = (last: number): View => ({ from: 0, to: Math.max(0, last) });

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Any window, made valid: inside [0, last], no wider than it, at least 8 samples wide. */
export const clampView = (view: View, last: number): View => {
  if (!(last > 0) || !Number.isFinite(last)) return fullView(0);
  const minSpan = Math.min(MIN_SAMPLES - 1, last);
  const raw = view.to - view.from;
  const span = clamp(Number.isFinite(raw) ? raw : last, minSpan, last);
  const from = clamp(Number.isFinite(view.from) ? view.from : 0, 0, last - span);
  return { from, to: from + span };
};

/**
 * Zoom by `factor` (<1 in, >1 out) about `anchor`, the pointer's share of the window's width
 * (0 left edge … 1 right edge): the sample under the pointer stays under it until a bound stops it.
 */
export const zoomAt = (view: View, factor: number, anchor: number, last: number): View => {
  const v = clampView(view, last);
  const a = clamp(Number.isFinite(anchor) ? anchor : 0.5, 0, 1);
  const at = v.from + a * (v.to - v.from);
  const span = clamp(
    (v.to - v.from) * (factor > 0 ? factor : 1),
    Math.min(MIN_SAMPLES - 1, last),
    last,
  );
  return clampView({ from: at - a * span, to: at - a * span + span }, last);
};

/** Pan by `delta` samples (positive: later), stopping hard at either end. */
export const panBy = (view: View, delta: number, last: number): View => {
  const v = clampView(view, last);
  const d = Number.isFinite(delta) ? delta : 0;
  return clampView({ from: v.from + d, to: v.to + d }, last);
};

/**
 * §2A: the asked window in frame positions (0 … last, the frame starting `past` weeks before today
 * at the first historic print), made valid, and the same window in weeks from today (`view`).
 * null asks for the whole frame. With no history, past is 0 and both are the same.
 */
export const framedView = (
  asked: View | null,
  last: number,
  past: number,
): { framed: View; view: View } => {
  const framed = asked === null ? fullView(last) : clampView(asked, last);
  return { framed, view: { from: framed.from - past, to: framed.to - past } };
};

export const isZoomed = (view: View, last: number): boolean => view.to - view.from < last - 1e-6;

/** min low and max high (the outermost edge) over the samples the window shows, or null. */
export const windowRange = (
  bands: Pick<PriceBands, "min" | "max">,
  view: View,
): { low: number; high: number } | null => {
  const first = Math.max(0, Math.floor(view.from));
  const end = Math.min(bands.min.length - 1, Math.ceil(view.to));
  let low = Number.POSITIVE_INFINITY;
  let high = 0;
  for (let i = first; i <= end; i++) {
    const a = bands.min[i] ?? Number.NaN;
    const b = bands.max[i] ?? Number.NaN;
    if (Number.isFinite(a) && a > 0 && a < low) low = a;
    if (Number.isFinite(b) && b > high) high = b;
  }
  if (!Number.isFinite(low) || high <= 0) return null;
  return { low, high: Math.max(high, low) };
};

/** The Y axis for a zoomed window: its min–max plus 5% of the log span each side. */
export const windowDomain = (
  bands: Pick<PriceBands, "min" | "max">,
  view: View,
): LogDomain | null => {
  const range = windowRange(bands, view);
  return range === null ? null : fitDomain(range.low, range.high);
};

/** §1T: Y eases to the new window over this long (0 under reduced motion). */
export const Y_EASE_MS = 150;

/** The domain `t` (0…1, eased) of the way from `a` to `b`, interpolated in log space. */
const easeDomain = (a: LogDomain, b: LogDomain, t: number): LogDomain => {
  const k = clamp(t, 0, 1);
  const e = 1 - (1 - k) ** 3;
  const mix = (x: number, y: number): number =>
    10 ** (Math.log10(x) + (Math.log10(y) - Math.log10(x)) * e);
  return k >= 1 ? b : { lo: mix(a.lo, b.lo), hi: mix(a.hi, b.hi) };
};

/**
 * The plot box that draws window `view` of a `last`-week horizon through the full-horizon lx():
 * the same top and bottom, the left and right edges moved out so `from` lands on L and `to` on R.
 */
export const viewBox = <B extends { L: number; R: number }>(
  box: B,
  view: View,
  last: number,
): B => {
  const span = view.to - view.from;
  if (!(span > 0) || !(last > 0)) return box;
  const k = (box.R - box.L) / span;
  const L = box.L - k * view.from;
  return { ...box, L, R: L + k * last };
};

type Frames = { request: (fn: (t: number) => void) => number; cancel: (id: number) => void };

/**
 * Eases the shown domain from `a` to `b` over `ms` (one frame when ms is 0), calling `show` each
 * frame; returns the cancel.
 */
export const animateDomain = (
  a: LogDomain,
  b: LogDomain,
  ms: number,
  show: (d: LogDomain) => void,
  frames: Frames,
): (() => void) => {
  let id = 0;
  let t0: number | null = null;
  const step = (t: number): void => {
    t0 ??= t;
    const k = ms > 0 ? (t - t0) / ms : 1;
    show(easeDomain(a, b, k));
    if (k < 1) id = frames.request(step);
  };
  id = frames.request(step);
  return () => {
    frames.cancel(id);
  };
};

/**
 * Shows the Y axis for a new target: eased from the shown one when the window moved (instantly
 * under reduced motion), else in place (a new engine run redraws without a slide). Returns the
 * cancel.
 */
export const followDomain = (
  {
    moved,
    from,
    target,
    still,
  }: {
    moved: boolean;
    from: LogDomain | undefined;
    target: LogDomain | undefined;
    still: boolean;
  },
  show: (d: LogDomain | undefined) => void,
  frames: Frames,
): (() => void) => {
  if (!moved || from === undefined || target === undefined) {
    show(target);
    return () => undefined;
  }
  return animateDomain(from, target, still ? 0 : Y_EASE_MS, show, frames);
};
