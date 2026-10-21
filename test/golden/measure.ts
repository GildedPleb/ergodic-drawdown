import hashSum from "hash-sum";

import GrowableSharedArray from "../../src/classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../../src/constants";
import { handleMaxArray } from "../../src/contexts/computed/max-array";
import { handleMinArray } from "../../src/contexts/computed/min-array";
import { handleSimulation } from "../../src/contexts/workers/simulation";
import { handleQuantile } from "../../src/contexts/workers/quantile";
import { type WalkTypes } from "../../src/data/walks";
import { WALK_STATE_LENGTH } from "../../src/data/walks/prng";
import { type BoundSlot } from "../../src/engine/memory";
import { numberAt } from "../../src/number-at";
import { type Full, type ModelNames, type OneOffItem, type ReoccurringItem } from "../../src/types";

const SAMPLES = 1000;
const EPOCHS = 10;
const WEEKS = EPOCHS * WEEKS_PER_EPOCH;
const NOW = 1_713_571_767_000;
const CURRENT_BLOCK = 840_000;
const CURRENT_PRICE = 64_000;
const WARMUPS = 3;
const RUNS = 15;
// The ea77773 provider measurement saw 10–11 renders per committed change.
const RENDERS_PER_CHANGE = 11;
// Drawdown static and chart options each hash every item on those renders.
const ITEM_HASH_NODES = 2;

const QUANTILE_CUTOFFS = [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1];

export interface RuntimeMeasure {
  bubbleLastPrice: number;
  hashDefaultChangeMs: number;
  hashWideChangeMs: number;
  quantileMs: number;
  quantileSum: number;
  sharkLastPrice: number;
  simulationBubbleMs: number;
  simulationSharkMs: number;
}

const median = (samples: readonly number[]): number => {
  const sorted = samples.toSorted((left, right) => left - right);
  const mid = sorted[Math.floor(sorted.length / 2)];
  if (mid === undefined) throw new Error("empty bench");
  return mid;
};

const measure = (run: () => void): number => {
  for (let warmup = 0; warmup < WARMUPS; warmup += 1) run();
  const samples: number[] = [];
  for (let index = 0; index < RUNS; index += 1) {
    const started = performance.now();
    run();
    samples.push(performance.now() - started);
  }
  return median(samples);
};

const boundSlot = (): BoundSlot => ({
  key: "",
  logs: new Float64Array(0),
  points: new Float64Array(0),
  seriesHash: "",
  weeks: 0,
});

const bounds = (): { maxArray: Float64Array[]; minArray: Float64Array[] } => {
  const signal = new AbortController().signal;
  const model: ModelNames = "Power Law Regression Median";
  const shared = [CURRENT_BLOCK, 3, model, 0, CURRENT_PRICE, NOW, WEEKS] as const;
  return {
    maxArray: handleMaxArray(signal, "bench", ...shared, 0, boundSlot()),
    minArray: handleMinArray(signal, "bench", ...shared, 0, boundSlot()),
  };
};

const lastPrice = (grid: GrowableSharedArray): number => {
  const row = grid.get(EPOCHS - 1, SAMPLES - 1);
  const price = row?.at(-1);
  if (price === undefined || price === 0) throw new Error("simulation bench wrote an empty tail");
  return price;
};

const timeWalk = (
  walk: WalkTypes,
  minArray: Float64Array[],
  maxArray: Float64Array[],
): { last: number; ms: number } => {
  const prices = new GrowableSharedArray(EPOCHS, SAMPLES, WEEKS_PER_EPOCH);
  const state = new GrowableSharedArray(EPOCHS, SAMPLES, WALK_STATE_LENGTH);
  const full: Full = {
    clampBottom: false,
    clampTop: false,
    minMaxMultiple: 3,
    model: "Power Law Regression Median",
    seed: 1,
    variable: 0,
    volatility: 0.1,
    walk,
  };
  const priceState = prices.exportState();
  const stateBuffer = state.exportState();
  // A filled cell is skipped. Clear inside the sample so each run walks.
  const once = (): void => {
    prices.clear();
    state.clear();
    handleSimulation(
      {
        bufferState: priceState,
        currentPrice: CURRENT_PRICE,
        epochCount: EPOCHS,
        full,
        maxArray,
        minArray,
        samples: SAMPLES,
        stateBuffer,
        task: { arrayIndex: 0, endIndex: SAMPLES, startEpoch: 0, startIndex: 0 },
        weeksSince: 0,
      },
      { aborted: false },
    );
  };
  const ms = measure(once);
  return { last: lastPrice(prices), ms };
};

const timeQuantile = (
  minArray: Float64Array[],
  maxArray: Float64Array[],
): { ms: number; sum: number } => {
  const prices = new GrowableSharedArray(EPOCHS, SAMPLES, WEEKS_PER_EPOCH);
  const state = new GrowableSharedArray(EPOCHS, SAMPLES, WALK_STATE_LENGTH);
  const full: Full = {
    clampBottom: false,
    clampTop: false,
    minMaxMultiple: 3,
    model: "Power Law Regression Median",
    seed: 1,
    variable: 0,
    volatility: 0.1,
    walk: "Bubble",
  };
  handleSimulation(
    {
      bufferState: prices.exportState(),
      currentPrice: CURRENT_PRICE,
      epochCount: EPOCHS,
      full,
      maxArray,
      minArray,
      samples: SAMPLES,
      stateBuffer: state.exportState(),
      task: { arrayIndex: 0, endIndex: SAMPLES, startEpoch: 0, startIndex: 0 },
      weeksSince: 0,
    },
    { aborted: false },
  );

  const groupedBuffer = new SharedArrayBuffer(WEEKS * SAMPLES * Float64Array.BYTES_PER_ELEMENT);
  const grouped = new Float64Array(groupedBuffer);
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    let week = 0;
    for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
      const row = prices.get(epoch, sample);
      if (row === undefined) throw new Error("quantile bench is missing a price row");
      for (let index = 0; index < row.length; index += 1) {
        grouped[week * SAMPLES + sample] = numberAt(row, index);
        week += 1;
      }
    }
  }

  const quantilesBuffer = new SharedArrayBuffer(
    WEEKS * QUANTILE_CUTOFFS.length * Float64Array.BYTES_PER_ELEMENT,
  );
  const quantiles = new Float64Array(quantilesBuffer);
  const once = (): void => {
    handleQuantile(
      {
        cutoffs: QUANTILE_CUTOFFS,
        groupedDataBuffer: groupedBuffer,
        quantilesBuffer,
        samples: SAMPLES,
        task: { arrayIndex: 0, endIndex: WEEKS, startIndex: 0 },
      },
      { aborted: false },
    );
  };
  const ms = measure(once);
  let sum = 0;
  for (const value of quantiles) sum += value;
  return { ms, sum };
};

const reoccurring = (count: number): ReoccurringItem[] =>
  Array.from({ length: count }, (_, index) => ({
    active: true,
    annualAmount: 100_000 + index,
    annualPercentChange: 0,
    effective: new Date(NOW + index * 86_400_000),
    expense: true,
    id: `reoccurring-${index}`,
    isFiat: true,
    name: `Item ${index}`,
  }));

const oneOff = (count: number): OneOffItem[] =>
  Array.from({ length: count }, (_, index) => ({
    active: true,
    amountToday: 50_000 + index,
    effective: new Date(NOW + index * 86_400_000),
    expense: true,
    id: `one-off-${index}`,
    isFiat: true,
    name: `Once ${index}`,
  }));

const timeItemHash = (reoccurringCount: number, oneOffCount: number): number => {
  const reoccurringItems = reoccurring(reoccurringCount);
  const oneOffItems = oneOff(oneOffCount);
  let touch = 0;
  const once = (): void => {
    for (let render = 0; render < RENDERS_PER_CHANGE; render += 1) {
      for (let node = 0; node < ITEM_HASH_NODES; node += 1) {
        for (const item of reoccurringItems) touch += hashSum(item).length;
        for (const item of oneOffItems) touch += hashSum(item).length;
      }
    }
  };
  const ms = measure(once);
  if (touch === 0) throw new Error("item hash bench did not run");
  return ms;
};

export const measureRuntime = (): RuntimeMeasure => {
  const { maxArray, minArray } = bounds();
  console.error("simulation Bubble");
  const bubble = timeWalk("Bubble", minArray, maxArray);
  console.error("simulation Shark");
  const shark = timeWalk("Shark", minArray, maxArray);
  console.error("quantile");
  const quantile = timeQuantile(minArray, maxArray);
  console.error("item hashing");
  return {
    bubbleLastPrice: bubble.last,
    hashDefaultChangeMs: timeItemHash(1, 0),
    hashWideChangeMs: timeItemHash(50, 50),
    quantileMs: quantile.ms,
    quantileSum: quantile.sum,
    sharkLastPrice: shark.last,
    simulationBubbleMs: bubble.ms,
    simulationSharkMs: shark.ms,
  };
};
