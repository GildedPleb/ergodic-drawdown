import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../src/constants";
import { handleSimulation as scheduleSimulation } from "../src/contexts/computed/simulation";
import type { WorkerContextType } from "../src/contexts/workers";
import type { TaskResult } from "../src/contexts/workers/types";
import { handleSimulation } from "../src/contexts/workers/simulation";
import { WALK_STATE_LENGTH } from "../src/data/walks/prng";

const walkGrid = (epochs: number, samples = 1): GrowableSharedArray =>
  new GrowableSharedArray(epochs, samples, WALK_STATE_LENGTH);

const weeks = WEEKS_PER_EPOCH;
const minPrice = 100;
const maxPrice = 1000;

const flat = (price: number): Float64Array => {
  const values = new Float64Array(weeks);
  values.fill(price);
  return values;
};

const minArray = [flat(minPrice), flat(Math.log10(minPrice))];
const maxArray = [flat(maxPrice), flat(Math.log10(maxPrice))];

const sample = (currentPrice: number, weeksSince: number): Float64Array => {
  const data = new GrowableSharedArray(1, 1, weeks);
  handleSimulation(
    {
      bufferState: data.exportState(),
      currentPrice,
      epochCount: 1,
      full: {
        clampBottom: false,
        clampTop: false,
        minMaxMultiple: 1,
        model: "CAGR",
        seed: 1,
        variable: 1,
        volatility: 0,
        walk: "Random",
      },
      maxArray,
      minArray,
      samples: 1,
      stateBuffer: walkGrid(1).exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      weeksSince,
    },
    { aborted: false },
  );
  const row = data.get(0, 0);
  if (row === undefined) {
    throw new Error("missing sample");
  }
  return row;
};

test("a flat walk maps back through the stored price bounds", () => {
  const inside = sample(10 ** 2.5, 2);
  expect(Number.isNaN(inside[0])).toBe(true);
  expect(Number.isNaN(inside[1])).toBe(true);
  expect(inside[2]).toBe(10 ** 2.5);
  expect(inside[weeks - 1]).toBe(10 ** 2.5);

  const below = sample(10, 0);
  expect(below[0]).toBe(10);
  expect(below[weeks - 1]).toBe(10);

  const above = sample(10_000, 0);
  expect(above[0]).toBe(10_000);
  expect(above[weeks - 1]).toBe(10_000);

  const floored = sample(0.001, 0);
  expect(floored[0]).toBe(0.01);
  expect(floored[weeks - 1]).toBe(0.01);
});

const spot = 10 ** 2.5;

const bounds = (length: number, price: number): Float64Array[] => {
  const values = new Float64Array(length);
  values.fill(price);
  const logs = new Float64Array(length);
  logs.fill(Math.log10(price));
  return [values, logs];
};

const runEpochs = (
  epochCount: number,
  weeksSince: number,
  startEpoch?: number,
): GrowableSharedArray => {
  const data = new GrowableSharedArray(epochCount, 1, weeks);
  const length = epochCount * weeks - weeksSince;
  handleSimulation(
    {
      bufferState: data.exportState(),
      currentPrice: spot,
      epochCount,
      full: {
        clampBottom: false,
        clampTop: false,
        minMaxMultiple: 1,
        model: "CAGR",
        seed: 1,
        variable: 1,
        volatility: 0,
        walk: "Random",
      },
      maxArray: bounds(length, maxPrice),
      minArray: bounds(length, minPrice),
      samples: 1,
      stateBuffer: walkGrid(epochCount).exportState(),
      task:
        startEpoch === undefined
          ? { arrayIndex: 0, endIndex: 1, startIndex: 0 }
          : { arrayIndex: 0, endIndex: 1, startEpoch, startIndex: 0 },
      weeksSince,
    },
    { aborted: false },
  );
  return data;
};

test("the walk stays on the spot price when now falls past the first epoch", () => {
  const onTheBoundary = runEpochs(2, weeks);
  const opening = onTheBoundary.get(0, 0);
  const next = onTheBoundary.get(1, 0);
  if (opening === undefined || next === undefined) throw new Error("missing epoch");
  expect(Number.isNaN(opening[weeks - 1])).toBe(true);
  expect(next[0]).toBe(spot);
  expect(next[weeks - 1]).toBe(spot);

  const pastTheBoundary = runEpochs(2, weeks + 2);
  const later = pastTheBoundary.get(1, 0);
  if (later === undefined) throw new Error("missing later epoch");
  expect(Number.isNaN(later[0])).toBe(true);
  expect(Number.isNaN(later[1])).toBe(true);
  expect(later[2]).toBe(spot);
  expect(later[weeks - 1]).toBe(spot);
});

test("a cached epoch that ends in NaN does not replace the spot price", () => {
  const data = new GrowableSharedArray(2, 1, weeks);
  const blank = new Float64Array(weeks);
  blank.fill(Number.NaN);
  data.set(0, 0, blank);
  handleSimulation(
    {
      bufferState: data.exportState(),
      currentPrice: spot,
      epochCount: 2,
      full: {
        clampBottom: false,
        clampTop: false,
        minMaxMultiple: 1,
        model: "CAGR",
        seed: 1,
        variable: 1,
        volatility: 0,
        walk: "Random",
      },
      maxArray: bounds(weeks * 2, maxPrice),
      minArray: bounds(weeks * 2, minPrice),
      samples: 1,
      stateBuffer: walkGrid(2).exportState(),
      task: { arrayIndex: 0, endIndex: 1, startEpoch: 1, startIndex: 0 },
      weeksSince: 0,
    },
    { aborted: false },
  );

  const next = data.get(1, 0);
  if (next === undefined) throw new Error("missing continued epoch");
  expect(next[0]).toBe(spot);
  expect(next[weeks - 1]).toBe(spot);
});

test("a simulation asked to start at epoch 0 writes that epoch", () => {
  const data = runEpochs(1, 0, 0);
  const row = data.get(0, 0);
  if (row === undefined) throw new Error("missing first epoch");
  expect(row[0]).toBe(spot);
  expect(row[weeks - 1]).toBe(spot);
});

test("a new weeksSince rebuilds a finished price grid", async () => {
  let writes = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      writes += tasks.length;
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const data = new GrowableSharedArray(1, 1);
  const state = walkGrid(1);
  const full = {
    clampBottom: false,
    clampTop: false,
    minMaxMultiple: 1,
    model: "CAGR",
    seed: 1,
    variable: 1,
    volatility: 0,
    walk: "Random" as const,
  };
  const signal = new AbortController().signal;
  const run = (weeksSince: number): Promise<string> =>
    scheduleSimulation(
      signal,
      "node",
      spot,
      minArray,
      maxArray,
      1,
      data,
      state,
      1,
      worker,
      weeksSince,
      full,
      "model",
    );

  await run(4);
  await run(4);
  expect(writes).toBe(1);

  await run(9);

  expect(writes).toBe(2);

  state.setValidity("other");
  await run(9);
  expect(writes).toBe(3);
});

test("a priced epoch without a cycle is a broken cache", () => {
  const data = new GrowableSharedArray(2, 1, weeks);
  const row = new Float64Array(weeks);
  row.fill(spot);
  data.set(0, 0, row);
  expect(() => {
    handleSimulation(
      {
        bufferState: data.exportState(),
        currentPrice: spot,
        epochCount: 2,
        full: {
          clampBottom: false,
          clampTop: false,
          minMaxMultiple: 1,
          model: "CAGR",
          seed: 1,
          variable: 1,
          volatility: 0,
          walk: "Random",
        },
        maxArray: bounds(weeks * 2, maxPrice),
        minArray: bounds(weeks * 2, minPrice),
        samples: 1,
        stateBuffer: walkGrid(2).exportState(),
        task: { arrayIndex: 0, endIndex: 1, startEpoch: 1, startIndex: 0 },
        weeksSince: 0,
      },
      { aborted: false },
    );
  }).toThrow("missing walk state");
});
