/**
 * V32-BUILD §2A: Bitcoin's traded weekly price, read from the engine's own datasets when
 * render.showHistoric is on (main's baked weekly series from 2010-07-17, then the fetched interim
 * weeks; both labelled "Bitcoin Historic Price"). Read-only: no data is added, fetched or
 * extrapolated, so nothing is drawn before the first real print. Pure.
 */

/** main: src/data/datasets/historic.tsx and src/contexts/computed/interim.ts (G12 source test). */
export const HISTORIC_LABEL = "Bitcoin Historic Price";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export type History = {
  /** Weeks from today of each print (≤ 0 up to the latest), ascending. */
  t: Float64Array;
  /** The traded price at each print. */
  y: Float64Array;
  /** Weeks from the first print to today (≥ 0): the frame's extra left reach. */
  past: number;
};

type LabelledSeries = { label?: string | undefined; data: readonly unknown[] };

const isPoint = (p: unknown): p is { x: number; y: number } =>
  typeof p === "object" &&
  p !== null &&
  "x" in p &&
  "y" in p &&
  typeof p.x === "number" &&
  typeof p.y === "number";

/** Every historic print (finite, positive, no later than now), sorted and deduped; null if none. */
export const historyOf = (
  datasets: readonly LabelledSeries[] | undefined,
  now: number,
): History | null => {
  if (datasets === undefined) return null;
  const byTime = new Map<number, number>();
  for (const d of datasets) {
    if (d.label !== HISTORIC_LABEL) continue;
    for (const p of d.data) {
      if (!isPoint(p) || !Number.isFinite(p.x) || p.x > now) continue;
      if (Number.isFinite(p.y) && p.y > 0) byTime.set(p.x, p.y);
    }
  }
  if (byTime.size === 0) return null;
  const xs = [...byTime.keys()].toSorted((a, b) => a - b);
  const t = Float64Array.from(xs, (x) => (x - now) / MS_PER_WEEK);
  const y = Float64Array.from(xs, (x) => byTime.get(x) ?? Number.NaN);
  return { t, y, past: Math.max(0, -(t[0] ?? 0)) };
};

/** Lowest and highest print inside weeks [from, to] (from today), or null. */
export const historyRange = (
  history: History | null | undefined,
  from: number,
  to: number,
): { low: number; high: number } | null => {
  if (history === null || history === undefined) return null;
  let low = Number.POSITIVE_INFINITY;
  let high = 0;
  for (let i = 0; i < history.t.length; i++) {
    const t = history.t[i] ?? Number.NaN;
    if (t < from || t > to) continue;
    const v = history.y[i] ?? Number.NaN;
    if (v < low) low = v;
    if (v > high) high = v;
  }
  return Number.isFinite(low) && high > 0 ? { low, high } : null;
};

/** Two ranges (either may be null) as one. */
export const unionRange = (
  a: { low: number; high: number } | null,
  b: { low: number; high: number } | null,
): { low: number; high: number } | null => {
  if (a === null) return b;
  if (b === null) return a;
  return { low: Math.min(a.low, b.low), high: Math.max(a.high, b.high) };
};
