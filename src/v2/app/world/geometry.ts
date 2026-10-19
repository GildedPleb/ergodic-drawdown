/**
 * World layer geometry (V32-BUILD §1b): the v32 plot box, the decade-fitted $ log axis (Gap 2)
 * and the calendar-year axis with today at the left edge (Gap 3). Pure; the canvas draws from it.
 */

export type PlotBox = { L: number; R: number; T: number; Bt: number };

/** v32 frame: L=34, R=W−44, T=18, Bt=H−34. */
export const plotBox = (width: number, height: number): PlotBox => ({
  L: 34,
  R: width - 44,
  T: 18,
  Bt: height - 34,
});

export type LogDomain = { lo: number; hi: number };

/** The chart's empty / fallback domain ($10k–$10M). */
export const DEFAULT_DOMAIN: LogDomain = { lo: 1e4, hi: 1e7 };

/**
 * The log10 range the axis may span (Probe B2): $0.01 up to the largest power of ten a double
 * holds (10^308). Every bound is clamped here before it is turned back into dollars, so no
 * transform can overflow to Infinity.
 */
const LOG_FLOOR = -2;
const LOG_CEIL = Math.floor(Math.log10(Number.MAX_VALUE));

/** Clamp a log10 value to the chartable range; NaN (from ≤0 or NaN input) goes to the floor. */
const clampLog = (v: number): number =>
  Number.isNaN(v) ? LOG_FLOOR : Math.min(LOG_CEIL, Math.max(LOG_FLOOR, v));

/** Margin above and below the data, as a share of its log span (Form, Slice 1 follow-up). */
const FIT_MARGIN = 0.05;
/** Narrowest log span fitted (a factor of 2), so a flat or near-flat range never over-zooms. */
const MIN_LOG_SPAN = Math.log10(2);

/**
 * Fit the log axis to the data: the p5–p95 range plus 5% of its log span on each side, not
 * rounded out to decades. A range narrower than a factor of 2 is widened about its log centre.
 * Probe B2: every step is clamped in log space ($0.01–10^308) before converting back, a span
 * squeezed against a bound is widened away from it, and a result that is still not finite,
 * positive and increasing falls back to DEFAULT_DOMAIN.
 */
export const fitDomain = (low: number, high: number): LogDomain => {
  const a = clampLog(Math.log10(Math.min(low, high)));
  const b = clampLog(Math.log10(Math.max(low, high)));
  const mid = (Math.min(a, b) + Math.max(a, b)) / 2;
  const half = Math.max(Math.abs(b - a), MIN_LOG_SPAN) / 2;
  const pad = half * 2 * FIT_MARGIN;
  let lo = clampLog(mid - half - pad);
  let hi = clampLog(mid + half + pad);
  if (hi - lo < MIN_LOG_SPAN) {
    if (hi >= LOG_CEIL) lo = hi - MIN_LOG_SPAN;
    else hi = lo + MIN_LOG_SPAN;
  }
  const domain = { lo: 10 ** lo, hi: 10 ** hi };
  return validDomain(domain) ? domain : DEFAULT_DOMAIN;
};

/** Finite, positive and increasing: the only domains ly() and axisTicks() accept. */
export const validDomain = ({ lo, hi }: LogDomain): boolean =>
  Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi > lo;

const inside = ({ lo, hi }: LogDomain, v: number): boolean =>
  v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9);

/**
 * Hard cap on decade passes (Probe B2, Keel: 12 or fewer). A domain spanning more decades than
 * this is thinned to every n-th decade, so the loop never runs more than 12 times whatever the
 * domain, and never draws more than 12 × 9 gridlines.
 */
export const MAX_DECADE_PASSES = 12;

/**
 * m × 10^k for every k that reaches the domain, inside it. A span wider than 12 decades is thinned
 * to every n-th decade counted DOWN from the top one, so the highest decade inside the domain is
 * always a tick (Form n10: the ticks never stop short of the data).
 */
const steps = (domain: LogDomain, mantissas: readonly number[]): number[] => {
  const out: number[] = [];
  if (!validDomain(domain)) return out;
  const first = Math.floor(Math.log10(domain.lo));
  const last = Math.floor(Math.log10(domain.hi * (1 + 1e-9)));
  const stride = Math.max(1, Math.ceil((last - first + 1) / MAX_DECADE_PASSES));
  for (let pass = 0; pass < MAX_DECADE_PASSES; pass++) {
    const k = last - pass * stride;
    if (k < first) break;
    for (const m of mantissas) {
      const v = Number((m * 10 ** k).toPrecision(12));
      if (inside(domain, v)) out.push(v);
    }
  }
  return out.toSorted((a, b) => a - b);
};

/**
 * §1h out of range (Form n10): the axis top rises to the decade at or above the data's top, so a
 * tick covers the data ($1,000T, $10,000T, …), capped at 10^308; only values past a double are
 * clipped.
 */
export const coverTop = (domain: LogDomain, dataTop: number): LogDomain => {
  if (!validDomain(domain) || !Number.isFinite(dataTop) || dataTop <= 0) return domain;
  const top = 10 ** clampLog(Math.ceil(Math.log10(dataTop) - 1e-9));
  return top > domain.hi && Number.isFinite(top) ? { lo: domain.lo, hi: top } : domain;
};

/**
 * $ gridlines: the decades inside the domain. A range with no decade in it falls back to the
 * 1-2-5 steps inside it ($20M, $50M), and if none of those either, to whole multiples of the
 * decade ($60M, $70M); the factor-of-2 minimum span guarantees at least one of these.
 */
export const axisTicks = (domain: LogDomain): number[] => {
  for (const mantissas of [[1], [1, 2, 5], [1, 2, 3, 4, 5, 6, 7, 8, 9]]) {
    const ticks = steps(domain, mantissas);
    if (ticks.length > 0) return ticks;
  }
  return [];
};

/** ly(v) = Bt − (Bt−T)·(ln v − ln lo)/(ln hi − ln lo). */
export const ly = (v: number, box: PlotBox, { lo, hi }: LogDomain): number =>
  box.Bt - ((box.Bt - box.T) * (Math.log(v) - Math.log(lo))) / (Math.log(hi) - Math.log(lo));

/** lx(t) = L + (R−L)·t/horizon, t in weeks from today. */
export const lx = (t: number, box: PlotBox, horizon: number): number =>
  box.L + ((box.R - box.L) * t) / Math.max(1, horizon);

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MIN_TICK_GAP = 48;
const STRIDES = [1, 2, 5, 10, 20, 50] as const;

export type YearTick = { year: number; x: number };

/**
 * Calendar-year ticks (1 January of each year after today), every year when labels can sit at
 * least 48px apart, else thinned to every 2, 5 or 10 years (years divisible by the stride).
 */
export const yearTicks = (now: number, horizon: number, box: PlotBox): YearTick[] => {
  const end = now + horizon * MS_PER_WEEK;
  const pxPerYear = ((box.R - box.L) / Math.max(1, horizon)) * 52.1775;
  const stride = STRIDES.find((s) => s * pxPerYear >= MIN_TICK_GAP) ?? 100;
  const ticks: YearTick[] = [];
  const first = new Date(now).getFullYear() + 1;
  for (let year = first; ; year++) {
    const at = new Date(year, 0, 1).getTime();
    if (at > end) break;
    if (year % stride !== 0) continue;
    ticks.push({ year, x: lx((at - now) / MS_PER_WEEK, box, horizon) });
  }
  return ticks;
};

/** The calendar year the horizon ends in (the time bar's right-hand label). */
export const endYear = (now: number, horizon: number): number =>
  new Date(now + horizon * MS_PER_WEEK).getFullYear();

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct ’26" for the Today label. */
export const monthYear = (now: number): string => {
  const d = new Date(now);
  return `${MONTHS[d.getMonth()] ?? ""} \u2019${String(d.getFullYear() % 100).padStart(2, "0")}`;
};
