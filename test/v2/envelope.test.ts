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
import { priceBands } from "../../src/v2/app/world/bands";
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

test("envelope: the outer band is exactly the engine's Lowest / Highest Sampled datasets", async () => {
  const { datasets, bands } = await bandsFor(40, "env-40");
  const ys = (label: string): number[] =>
    (datasets.find((d) => d.label === label)?.data ?? []).map((p) =>
      typeof p === "object" && p !== null && "y" in p && typeof p.y === "number" ? p.y : NaN,
    );
  expect([...(bands?.p1 ?? [])]).toEqual(ys("Lowest Sampled Bitcoin Price"));
  expect([...(bands?.p99 ?? [])]).toEqual(ys("Highest Sampled Bitcoin Price"));
  // Inner bands unchanged: still the 5th / 95th percentiles.
  expect([...(bands?.p5 ?? [])]).toEqual(ys("5th Percentile Bitcoin Price"));
  expect([...(bands?.p95 ?? [])]).toEqual(ys("95th Percentile Bitcoin Price"));
});

test("envelope: at N=2 the two walks are the band's edges, week by week", async () => {
  const { grid, bands } = await bandsFor(2, "env-2");
  const a = walk(grid, 0);
  const b = walk(grid, 1);
  expect(a.length).toBe(WEEKS);
  const low = a.map((v, i) => Math.min(v, b[i] ?? NaN));
  const high = a.map((v, i) => Math.max(v, b[i] ?? NaN));
  expect([...(bands?.p1 ?? [])]).toEqual(low);
  expect([...(bands?.p99 ?? [])]).toEqual(high);
  // The walks really differ, so the edges are two paths, not one.
  expect(a.some((v, i) => v !== b[i])).toBe(true);
});
