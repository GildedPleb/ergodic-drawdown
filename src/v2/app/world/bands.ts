import { createDataSet } from "../../../helpers";

/**
 * Price-band adapter: reads the engine's existing quantile datasets (cutoffs
 * [0,.01,.05,.25,.5,.75,.95,.99,1], src/contexts/computed/distribution.ts) out of the snapshot's
 * Data Properties and keeps p1, p5, p25, p50, p75, p95 and p99 (§1L.4: p0 and p100 are not drawn).
 * Read-only; nothing in the engine changes.
 */

type Point = { x: number; y: number };
type LabelledSeries = { label?: string | undefined; data: readonly unknown[] };

export type PriceBands = {
  /** ms timestamp of week 0 (today). */
  start: number;
  /** Weeks in the horizon. */
  weeks: number;
  p1: Float64Array;
  p5: Float64Array;
  p25: Float64Array;
  p50: Float64Array;
  p75: Float64Array;
  p95: Float64Array;
  p99: Float64Array;
};

/**
 * main: src/contexts/computed/distribution.ts `bandConfig("price", "quantile")`, mirrored (Rule 0:
 * back-end files stay byte-identical, so v2 keeps its own copy; the G12 source test re-reads the
 * file and fails on any drift). Only the fields that shape the dataset labels are used.
 */
export const PRICE_QUANTILE_BAND = {
  color: { blue: 50, green: 145, red: 246 },
  cutoffs: [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1],
  midLabel: "Bitcoin Price",
  type: "quantile",
  yAxisID: "y",
} as const;

/**
 * The engine's own dataset labels, built by main's (already exported) createDataSet from that
 * config: label at a cutoff, e.g. 0.05 → "5th Percentile Bitcoin Price".
 */
const CUTOFFS: number[] = [...PRICE_QUANTILE_BAND.cutoffs];
const PRICE_QUANTILES = { ...PRICE_QUANTILE_BAND, cutoffs: CUTOFFS };
const ENGINE_LABELS = createDataSet({
  ...PRICE_QUANTILES,
  color: { ...PRICE_QUANTILE_BAND.color },
  quantiles: PRICE_QUANTILES.cutoffs.map(() => []),
}).map((d) => d.label);
const labelAt = (cutoff: number): string =>
  ENGINE_LABELS[PRICE_QUANTILES.cutoffs.indexOf(cutoff)] ?? `missing cutoff ${String(cutoff)}`;

const LABELS = {
  p1: labelAt(0.01),
  p5: labelAt(0.05),
  p25: labelAt(0.25),
  p50: labelAt(0.5),
  p75: labelAt(0.75),
  p95: labelAt(0.95),
  p99: labelAt(0.99),
} as const;

const isPoint = (p: unknown): p is Point =>
  typeof p === "object" &&
  p !== null &&
  "x" in p &&
  "y" in p &&
  typeof p.x === "number" &&
  typeof p.y === "number";

const series = (datasets: readonly LabelledSeries[], label: string): Point[] | undefined => {
  const found = datasets.find((d) => d.label === label);
  return found?.data.every(isPoint) === true ? found.data.filter(isPoint) : undefined;
};

const ys = (points: Point[]): Float64Array => Float64Array.from(points, (p) => p.y);

/** The seven quantiles, or null while the engine has not produced a price distribution. */
export const priceBands = (datasets: readonly LabelledSeries[] | undefined): PriceBands | null => {
  if (datasets === undefined) return null;
  const picked = {
    p1: series(datasets, LABELS.p1),
    p5: series(datasets, LABELS.p5),
    p25: series(datasets, LABELS.p25),
    p50: series(datasets, LABELS.p50),
    p75: series(datasets, LABELS.p75),
    p95: series(datasets, LABELS.p95),
    p99: series(datasets, LABELS.p99),
  };
  const { p1, p5, p25, p50, p75, p95, p99 } = picked;
  if (p1 === undefined || p99 === undefined) return null;
  if (p5 === undefined || p25 === undefined || p50 === undefined) return null;
  if (p75 === undefined || p95 === undefined || p50.length < 2) return null;
  return {
    start: p50[0]?.x ?? 0,
    weeks: p50.length - 1,
    p1: ys(p1),
    p5: ys(p5),
    p25: ys(p25),
    p50: ys(p50),
    p75: ys(p75),
    p95: ys(p95),
    p99: ys(p99),
  };
};

/**
 * Smallest p5 and largest p95 over the horizon (finite, positive values only): the axis domain
 * input. Non-finite values are dropped before fitting (Keel, Probe B2); null when nothing finite
 * is left.
 */
export const bandRange = (bands: PriceBands): { low: number; high: number } | null => {
  let low = Number.POSITIVE_INFINITY;
  let high = 0;
  // §1L.4: the axis fits the outer band, p1–p99.
  for (const v of bands.p1) if (Number.isFinite(v) && v > 0 && v < low) low = v;
  for (const v of bands.p99) if (Number.isFinite(v) && v > high) high = v;
  if (!Number.isFinite(low) || high <= 0) return null;
  return { low, high: Math.max(high, low) };
};

/**
 * Probe B2: the engine overflows (Infinity, then NaN) when a valid but huge setting (CAGR R of 1e6
 * at 30 epochs, 1e300 at 10) drives prices past a double. The bands are "out of range" when the
 * horizon's end (median, p5 or p95) is not finite, or nothing finite is left: the chart and the
 * headline then show a defined message instead of a number from an earlier week.
 */
/**
 * §1h "out of range" (Form, n10): the first week where any band has run past what a double holds
 * (Infinity, then NaN, in the engine's output), or -1. From there the band is clipped at the plot's
 * top edge with a hairline.
 */
export const firstPastTop = (bands: PriceBands): number => {
  const { p1, p5, p25, p50, p75, p95, p99 } = bands;
  for (let i = 0; i < p50.length; i++) {
    for (const band of [p1, p5, p25, p50, p75, p95, p99]) {
      if (!Number.isFinite(band[i] ?? Number.NaN)) return i;
    }
  }
  return -1;
};

export const outOfRange = (bands: PriceBands): boolean =>
  bandRange(bands) === null ||
  [bands.p5, bands.p50, bands.p95].some((band) => !Number.isFinite(band.at(-1) ?? Number.NaN));

/** The last finite value of a band (the end label and the headline read the horizon's end). */
export const endValue = (band: Float64Array): number => {
  for (let i = band.length - 1; i >= 0; i--) {
    const v = band[i];
    if (v !== undefined && Number.isFinite(v)) return v;
  }
  return Number.NaN;
};
