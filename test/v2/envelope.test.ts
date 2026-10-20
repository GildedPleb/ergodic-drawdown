/**
 * The user's ruling ("make the edge the edge", overrides §1L.4): the outer band is the envelope,
 * the engine's own min / max datasets (cutoffs 0 and 1), not p1–p99. Real kernels end to end:
 * main's simulation, distribution and quantile code, read through v2's priceBands.
 */
import { expect, test } from "bun:test";

import GrowableSharedArray from "../../src/classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../../src/constants";
import { handleDistribution } from "../../src/contexts/computed/distribution";
import { handleSimulation } from "../../src/contexts/workers/simulation";
import { WALK_STATE_LENGTH } from "../../src/data/walks/prng";
import { LABELS, NINE, priceBands, readoutAt } from "../../src/v2/app/world/bands";
import { inProcessWorker } from "../golden/in-process";

const EPOCHS = 2;
const WEEKS = EPOCHS * WEEKS_PER_EPOCH;
const NOW = 1_760_000_000_000;

const flatBounds = (price: number): Float64Array[] => [
  new Float64Array(WEEKS).fill(price),
  new Float64Array(WEEKS).fill(Math.log10(price)),
];

const simulate = (samples: number): GrowableSharedArray => {
  const prices = new GrowableSharedArray(EPOCHS, samples, WEEKS_PER_EPOCH);
  const state = new GrowableSharedArray(EPOCHS, samples, WALK_STATE_LENGTH);
  handleSimulation(
    {
      bufferState: prices.exportState(),
      currentPrice: 300,
      epochCount: EPOCHS,
      full: {
        clampBottom: false,
        clampTop: false,
        minMaxMultiple: 1,
        model: "CAGR",
        seed: 1,
        variable: 1,
        volatility: 0.1,
        walk: "Random",
      },
      maxArray: flatBounds(1000),
      minArray: flatBounds(100),
      samples,
      stateBuffer: state.exportState(),
      task: { arrayIndex: 0, endIndex: samples, startEpoch: 0, startIndex: 0 },
      weeksSince: 0,
    },
    { aborted: false },
  );
  return prices;
};

const walk = (grid: GrowableSharedArray, sample: number): number[] => {
  const out: number[] = [];
  for (let e = 0; e < EPOCHS; e++) out.push(...(grid.get(e, sample) ?? []));
  return out;
};

const bandsFor = async (samples: number, hash: string) => {
  const grid = simulate(samples);
  const datasets = await handleDistribution(
    new AbortController().signal,
    hash,
    grid,
    NOW,
    inProcessWorker(),
    samples,
    WEEKS,
    0,
    "Quantile",
    "price",
    false,
    hash,
  );
  return { grid, datasets, bands: priceBands(datasets) };
};

const ysOf = (
  datasets: readonly { label?: string | undefined; data: readonly unknown[] }[],
  label: string,
): number[] =>
  (datasets.find((d) => d.label === label)?.data ?? []).map((p) =>
    typeof p === "object" && p !== null && "y" in p && typeof p.y === "number" ? p.y : NaN,
  );

test("§1L.4: all nine series are read, the outermost being the engine's Lowest / Highest Sampled", async () => {
  const { datasets, bands } = await bandsFor(40, "env-40");
  if (bands === null) throw new Error("bands");
  const engine = {
    min: "Lowest Sampled Bitcoin Price",
    p1: "1st Percentile Bitcoin Price",
    p5: "5th Percentile Bitcoin Price",
    p25: "25th Percentile Bitcoin Price",
    p50: "Median Bitcoin Price",
    p75: "75th Percentile Bitcoin Price",
    p95: "95th Percentile Bitcoin Price",
    p99: "99th Percentile Bitcoin Price",
    max: "Highest Sampled Bitcoin Price",
  } as const;
  expect(NINE).toEqual(Object.keys(engine));
  for (const field of NINE) {
    expect(LABELS[field]).toBe(engine[field]);
    expect([...bands[field]]).toEqual(ysOf(datasets, engine[field]));
  }
  // Nested every week: min ≤ p1 ≤ … ≤ p99 ≤ max, and at N=40 the edge is wider than p1–p99.
  for (let i = 0; i <= bands.weeks; i++) {
    const col = NINE.map((f) => bands[f][i] ?? NaN);
    expect(col.every((v, k) => k === 0 || v >= (col[k - 1] ?? NaN))).toBe(true);
  }
  expect(bands.max.some((v, i) => v > (bands.p99[i] ?? Infinity))).toBe(true);
  // The readout lists all nine at a week, lowest first.
  const rows = readoutAt(bands, 50);
  expect(rows.map((r) => r.label)).toEqual(NINE.map((f) => engine[f]));
  expect(rows.map((r) => r.value)).toEqual(NINE.map((f) => bands[f][50]));
});

test("§1L.4: at N=2 the min / max edges are the two walks, week by week", async () => {
  const { grid, bands } = await bandsFor(2, "env-2");
  const a = walk(grid, 0);
  const b = walk(grid, 1);
  expect(a.length).toBe(WEEKS);
  expect([...(bands?.min ?? [])]).toEqual(a.map((v, i) => Math.min(v, b[i] ?? NaN)));
  expect([...(bands?.max ?? [])]).toEqual(a.map((v, i) => Math.max(v, b[i] ?? NaN)));
  // The walks really differ, so the edges are two paths, not one.
  expect(a.some((v, i) => v !== b[i])).toBe(true);
});

test("§1L.4: removing a sample never widens the min–max edge (prefix-stable walks)", async () => {
  let wide = await bandsFor(12, "env-12");
  for (const n of [11, 8, 5, 3, 2, 1]) {
    const narrow = await bandsFor(n, `env-${String(n)}`);
    const w = wide.bands;
    const k = narrow.bands;
    if (w === null || k === null) throw new Error("bands");
    for (let i = 0; i <= k.weeks; i++) {
      expect((k.min[i] ?? NaN) >= (w.min[i] ?? NaN)).toBe(true);
      expect((k.max[i] ?? NaN) <= (w.max[i] ?? NaN)).toBe(true);
    }
    wide = narrow;
  }
});
