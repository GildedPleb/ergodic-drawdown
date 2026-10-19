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

/** Margin above and below the data, as a share of its log span (Form, Slice 1 follow-up). */
const FIT_MARGIN = 0.05;
/** Narrowest log span fitted (a factor of 2), so a flat or near-flat range never over-zooms. */
const MIN_LOG_SPAN = Math.log10(2);

/**
 * Fit the log axis to the data: the p5–p95 range plus 5% of its log span on each side, not
 * rounded out to decades. A range narrower than a factor of 2 is widened about its log centre.
 */
export const fitDomain = (low: number, high: number): LogDomain => {
  const a = Math.log10(Math.max(Math.min(low, high), 0.01));
  const b = Math.log10(Math.max(low, high, 0.01));
  const mid = (a + b) / 2;
  const half = Math.max(b - a, MIN_LOG_SPAN) / 2;
  const pad = half * 2 * FIT_MARGIN;
  return { lo: 10 ** (mid - half - pad), hi: 10 ** (mid + half + pad) };
};

const inside = ({ lo, hi }: LogDomain, v: number): boolean =>
  v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9);

/** m × 10^k for every k that reaches the domain, inside it. */
const steps = (domain: LogDomain, mantissas: readonly number[]): number[] => {
  const out: number[] = [];
  const first = Math.floor(Math.log10(domain.lo));
  const last = Math.ceil(Math.log10(domain.hi));
  for (let k = first; k <= last; k++) {
    for (const m of mantissas) {
      const v = Number((m * 10 ** k).toPrecision(12));
      if (inside(domain, v)) out.push(v);
    }
  }
  return out;
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
