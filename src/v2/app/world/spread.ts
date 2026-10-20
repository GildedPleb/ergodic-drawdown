/**
 * Form 2A-r3: the headline and the end label claim only what the sample count N supports. One
 * pure rule, read by both (strings.headline.sentence / spoken, strings.chart.endLines):
 *   N ≥ 20      "9 in 10 futures end between {p5} and {p95}"; the label: median plus p5–p95.
 *   2 ≤ N < 20  "All {N} futures end between {min} and {max}"; the label: median plus min–max.
 *   N = 1       "This future ends at {X}"; the label: the single value.
 *   N > 1 with min and max equal once rounded (fmtUSD): "All {N} futures end at {X}"; one value.
 * An unknown N (fixtures, a source that does not say) reads as N ≥ 20, the chart as before.
 */
import { fmtUSD } from "../../design/format/money";
import { endValue, type PriceBands } from "./bands";

/** Fewest futures for which a 9-in-10 range (p5–p95) is a claim worth making. */
export const NINETY_MIN = 20;

export type Spread =
  | { kind: "ninety"; median: number; low: number; high: number }
  | { kind: "all"; n: number; median: number; low: number; high: number }
  | { kind: "allAt"; n: number; value: number }
  | { kind: "one"; value: number };

export type SpreadEnds = { median: number; p5: number; p95: number; min: number; max: number };

export const spreadOf = (
  { median, p5, p95, min, max }: SpreadEnds,
  n: number | undefined,
): Spread => {
  if (n === undefined || !Number.isFinite(n) || n >= NINETY_MIN) {
    return { kind: "ninety", median, low: p5, high: p95 };
  }
  if (n <= 1) return { kind: "one", value: median };
  if (fmtUSD(min) === fmtUSD(max)) return { kind: "allAt", n, value: min };
  return { kind: "all", n, median, low: min, high: max };
};

/** The spread at the horizon's end of a run's bands (both the headline and the end label). */
export const endSpread = (bands: PriceBands): Spread =>
  spreadOf(
    {
      median: endValue(bands.p50),
      p5: endValue(bands.p5),
      p95: endValue(bands.p95),
      min: endValue(bands.min),
      max: endValue(bands.max),
    },
    bands.n,
  );
