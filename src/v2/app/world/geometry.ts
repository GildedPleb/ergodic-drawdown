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

/** Fit lo/hi to the whole p5–p95 range, rounded out to decades (at least one decade tall). */
export const decadeDomain = (low: number, high: number): LogDomain => {
  const lo = 10 ** Math.floor(Math.log10(Math.max(low, 0.01)));
  let hi = 10 ** Math.ceil(Math.log10(Math.max(high, 0.01)));
  if (hi <= lo) hi = lo * 10;
  return { lo, hi };
};

/** Every decade from lo to hi inclusive: the gridlines and $ labels. */
export const decades = ({ lo, hi }: LogDomain): number[] => {
  const out: number[] = [];
  for (let v = lo; v <= hi * 1.000_001; v *= 10) out.push(Number(v.toPrecision(12)));
  return out;
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
