import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../src/constants";
import { handleSimulation as scheduleSimulation } from "../src/contexts/computed/simulation";
import { walkedPriceIdentity } from "../src/engine/keys";
import { cancelBoard, cancelSignal } from "../src/engine/pool/cancel";
import type { WorkerContextType } from "../src/contexts/workers/types";
import { handleSimulation } from "../src/contexts/workers/simulation";
import type { SignalState, TaskResult } from "../src/contexts/workers/types";
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

const center0 = 64_000;

const risingBounds = (
  epochs: number,
  multiple: number,
): { max: Float64Array[]; min: Float64Array[] } => {
  const length = epochs * weeks;
  const min = new Float64Array(length);
  const max = new Float64Array(length);
  const logMin = new Float64Array(length);
  const logMax = new Float64Array(length);
  for (let week = 0; week < length; week++) {
    const center = center0 * 1.2 ** (week / 52);
    const low = center / multiple;
    const high = center * multiple;
    min[week] = low;
    max[week] = high;
    logMin[week] = Math.log10(low);
    logMax[week] = Math.log10(high);
  }
  return { max: [max, logMax], min: [min, logMin] };
};

const channelPosition = (price: number, logMin: number, logMax: number): number => {
  const span = logMax - logMin;
  return span === 0 ? 0 : (Math.log10(price) - logMin) / span;
};

const risingRow = (multiple: number, epochs: number): Float64Array => {
  const data = new GrowableSharedArray(epochs, 1, weeks);
  const { max, min } = risingBounds(epochs, multiple);
  handleSimulation(
    {
      bufferState: data.exportState(),
      currentPrice: center0,
      epochCount: epochs,
      full: {
        clampBottom: false,
        clampTop: false,
        minMaxMultiple: multiple,
        model: "CAGR",
        seed: 1,
        variable: 20,
        volatility: 0.1,
        walk: "Bubble",
      },
      maxArray: max,
      minArray: min,
      samples: 1,
      stateBuffer: walkGrid(epochs).exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      weeksSince: 0,
    },
    { aborted: false },
  );
  const row = data.getRow(0);
  if (row === undefined) throw new Error("missing rising row");
  return row;
};

const positions = (row: Float64Array, multiple: number, epochs: number): Float64Array => {
  const { max, min } = risingBounds(epochs, multiple);
  const logMin = min[1];
  const logMax = max[1];
  if (logMin === undefined || logMax === undefined) throw new Error("missing rising logs");
  const out = new Float64Array(row.length);
  for (let week = 0; week < row.length; week++) {
    out[week] = channelPosition(
      row[week] ?? Number.NaN,
      logMin[week] ?? Number.NaN,
      logMax[week] ?? Number.NaN,
    );
  }
  return out;
};

test("a wider CAGR channel keeps the same walk position", () => {
  const epochs = 2;
  const narrow = positions(risingRow(3, epochs), 3, epochs);
  const wide = positions(risingRow(4, epochs), 4, epochs);
  let maxGap = 0;
  let outside = false;
  for (let week = 0; week < narrow.length; week++) {
    const left = narrow[week] ?? 0;
    const right = wide[week] ?? 0;
    const gap = Math.abs(left - right);
    if (gap > maxGap) maxGap = gap;
    if (left < 0 || left > 1) outside = true;
  }
  expect(outside).toBe(true);
  expect(maxGap).toBeLessThanOrEqual(1e-8);
});

test("an epoch boundary resumes at the painted channel position", () => {
  const epochs = 2;
  const multiple = 3;
  const row = risingRow(multiple, epochs);
  const place = positions(row, multiple, epochs);
  const boundary = weeks;
  expect(Math.abs((place[boundary] ?? 0) - (place[boundary - 1] ?? 0))).toBeLessThanOrEqual(1e-8);
});

const spot = 10 ** 2.5;

const gridKey = (weeksSince = 0, price = spot, minHash = "min", maxHash = "max"): string =>
  `${walkedPriceIdentity("model", price, minHash, maxHash)}:${weeksSince}`;

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
      weeks - weeksSince,
      full,
      "model",
      "min",
      "max",
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

test("a shorter year inside a walked column does not walk again", async () => {
  const ranges: { end: number; start: number }[] = [];
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      for (const task of tasks) {
        if (task.type !== "RUN_PRICE_SIMULATION") throw new Error("unexpected task");
        ranges.push({ end: task.payload.task.endIndex, start: task.payload.task.startIndex });
        handleSimulation(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const data = new GrowableSharedArray(1, 2, weeks);
  const state = walkGrid(1, 2);
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
  const visible = 100;
  const run = (samples: number): Promise<string> =>
    scheduleSimulation(
      signal,
      "node",
      spot,
      bounds(weeks, minPrice),
      bounds(weeks, maxPrice),
      1,
      data,
      state,
      samples,
      worker,
      0,
      visible,
      full,
      "model",
      "min",
      "max",
    );

  await run(2);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks);
  expect(state.getCoveredWeeks(gridKey())).toBe(weeks);
  expect(data.getValidity(gridKey())).toEqual([1, 2]);

  ranges.length = 0;
  const shrunk = await run(1);
  expect(shrunk.startsWith("no tasks:")).toBe(true);
  expect(ranges).toEqual([]);
  expect(data.getValidity(gridKey())).toEqual([1, 2]);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks);
  expect(state.getCoveredWeeks(gridKey())).toBe(weeks);

  await run(2);
  expect(ranges).toEqual([]);
});

test("a new spot or bound series clears the walked prices", async () => {
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
  const run = (price: number, minHash: string): Promise<string> =>
    scheduleSimulation(
      signal,
      "node",
      price,
      minArray,
      maxArray,
      1,
      data,
      state,
      1,
      worker,
      0,
      weeks,
      full,
      "model",
      minHash,
      "max",
    );

  await run(spot, "min");
  await run(spot, "min");
  expect(writes).toBe(1);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks);

  await run(spot + 1, "min");
  expect(writes).toBe(2);
  expect(data.getCoveredWeeks(gridKey())).toBe(0);
  expect(data.getCoveredWeeks(gridKey(0, spot + 1))).toBe(weeks);
  expect(state.getCoveredWeeks(gridKey(0, spot + 1))).toBe(weeks);

  await run(spot + 1, "other");
  expect(writes).toBe(3);
  expect(data.getCoveredWeeks(gridKey(0, spot + 1))).toBe(0);
  expect(data.getCoveredWeeks(gridKey(0, spot + 1, "other"))).toBe(weeks);
});

test("a year past the covered weeks clears only the next column", async () => {
  let startEpoch: number | undefined;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      for (const task of tasks) {
        if (task.type !== "RUN_PRICE_SIMULATION") throw new Error("unexpected task");
        startEpoch = task.payload.task.startEpoch;
        handleSimulation(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const data = new GrowableSharedArray(2, 1, weeks);
  const state = walkGrid(2);
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
  const run = (epochCount: number, dataLength: number): Promise<string> =>
    scheduleSimulation(
      signal,
      "node",
      spot,
      bounds(weeks * 2, minPrice),
      bounds(weeks * 2, maxPrice),
      epochCount,
      data,
      state,
      1,
      worker,
      0,
      dataLength,
      full,
      "model",
      "min",
      "max",
    );

  await run(1, 100);
  const first = data.get(0, 0);
  if (first === undefined) throw new Error("missing first column");
  const kept = first[0];
  startEpoch = undefined;
  await run(2, weeks + 1);

  expect(startEpoch).toBe(1);
  const again = data.get(0, 0);
  if (again === undefined) throw new Error("missing kept column");
  expect(again[0]).toBe(kept);
  expect(data.get(1, 0) === undefined).toBe(false);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks * 2);
  expect(state.getCoveredWeeks(gridKey())).toBe(weeks * 2);
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

test("a cancel flag stops the simulation on the next epoch", () => {
  const board = cancelBoard(1);
  const generation = 1;
  Atomics.store(board, 0, generation);
  const inner = cancelSignal(board, 0, generation);
  let reads = 0;
  const signal: SignalState = {
    get aborted() {
      reads += 1;
      if (reads > 2) Atomics.store(board, 0, generation + 1);
      return inner.aborted;
    },
  };
  const data = new GrowableSharedArray(2, 1, weeks);

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
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      weeksSince: 0,
    },
    signal,
  );

  const first = data.get(0, 0);
  if (first === undefined) throw new Error("missing first epoch");
  expect(first[0]).toBe(spot);
  expect(first[weeks - 1]).toBe(spot);
  expect(data.get(1, 0)).toBe(undefined);
});

test("an aborted simulation wave does not mark the price grid valid", async () => {
  const worker: WorkerContextType = {
    addTasks: (tasks) =>
      Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "aborted" }))),
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

  const outcome = await scheduleSimulation(
    new AbortController().signal,
    "node",
    spot,
    minArray,
    maxArray,
    1,
    data,
    state,
    1,
    worker,
    0,
    weeks,
    full,
    "model",
    "min",
    "max",
  );

  expect(outcome).toBe(`failed:model11${weeks}`);
  expect(data.getValidity(gridKey())).toEqual([0, 0]);
  expect(state.getValidity(gridKey())).toEqual([0, 0]);
  expect(data.getCoveredWeeks(gridKey())).toBe(0);
  expect(state.getCoveredWeeks(gridKey())).toBe(0);
});

test("an aborted extension does not raise the covered weeks", async () => {
  let abort = false;
  const worker: WorkerContextType = {
    addTasks: (tasks) =>
      Promise.resolve(
        tasks.map((): TaskResult => ({ id: "task", status: abort ? "aborted" : "completed" })),
      ),
    count: 1,
  };
  const data = new GrowableSharedArray(2, 1, weeks);
  const state = walkGrid(2);
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
  const run = (epochCount: number, dataLength: number): Promise<string> =>
    scheduleSimulation(
      signal,
      "node",
      spot,
      bounds(weeks * 2, minPrice),
      bounds(weeks * 2, maxPrice),
      epochCount,
      data,
      state,
      1,
      worker,
      0,
      dataLength,
      full,
      "model",
      "min",
      "max",
    );

  await run(1, weeks);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks);
  abort = true;
  const outcome = await run(2, weeks + 1);
  expect(outcome.startsWith("failed:")).toBe(true);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks);
  expect(state.getCoveredWeeks(gridKey())).toBe(weeks);
  expect(data.getValidity(gridKey())).toEqual([1, 1]);
});

test("samples added during a short year fill the trusted columns", async () => {
  const posted: { epochCount: number; start: number }[] = [];
  let startEpochSeen = false;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      for (const task of tasks) {
        if (task.type !== "RUN_PRICE_SIMULATION") throw new Error("unexpected task");
        posted.push({ epochCount: task.payload.epochCount, start: task.payload.task.startIndex });
        if (task.payload.task.startEpoch !== undefined) startEpochSeen = true;
        handleSimulation(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const data = new GrowableSharedArray(2, 2, weeks);
  const state = walkGrid(2, 2);
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
  const run = (epochCount: number, samples: number, dataLength: number): Promise<string> =>
    scheduleSimulation(
      signal,
      "node",
      spot,
      bounds(weeks * 2, minPrice),
      bounds(weeks * 2, maxPrice),
      epochCount,
      data,
      state,
      samples,
      worker,
      0,
      dataLength,
      full,
      "model",
      "min",
      "max",
    );

  await run(2, 1, weeks + 1);
  const first = data.get(0, 0);
  if (first === undefined) throw new Error("missing first column");
  const kept = first[0];
  posted.length = 0;
  startEpochSeen = false;

  const shrunk = await run(1, 1, 100);
  expect(shrunk.startsWith("no tasks:")).toBe(true);
  expect(posted).toEqual([]);

  const caughtUp = await run(1, 2, 100);
  expect(caughtUp.startsWith("success:")).toBe(true);
  expect(posted).toEqual([{ epochCount: 2, start: 1 }]);
  expect(startEpochSeen).toBe(false);
  expect(data.exportState().activeWidth).toBe(1);
  expect(state.exportState().activeWidth).toBe(1);
  expect(data.getValidity(gridKey())).toEqual([2, 2]);
  expect(state.getValidity(gridKey())).toEqual([2, 2]);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks * 2);
  expect(state.getCoveredWeeks(gridKey())).toBe(weeks * 2);

  posted.length = 0;
  const restored = await run(2, 2, weeks + 1);
  expect(restored.startsWith("no tasks:")).toBe(true);
  expect(posted).toEqual([]);
  const again = data.get(0, 0);
  if (again === undefined) throw new Error("missing kept column");
  expect(again[0]).toBe(kept);
  const added = data.get(1, 1);
  if (added === undefined) throw new Error("missing added column");
  expect(added[0]).toBe(spot);
  expect(state.get(1, 1) === undefined).toBe(false);
});

test("an aborted sample catch-up leaves the requested price width", async () => {
  let abort = false;
  const worker: WorkerContextType = {
    addTasks: (tasks) =>
      Promise.resolve(
        tasks.map((): TaskResult => ({ id: "task", status: abort ? "aborted" : "completed" })),
      ),
    count: 1,
  };
  const data = new GrowableSharedArray(2, 2, weeks);
  const state = walkGrid(2, 2);
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
  const run = (epochCount: number, samples: number, dataLength: number): Promise<string> =>
    scheduleSimulation(
      signal,
      "node",
      spot,
      bounds(weeks * 2, minPrice),
      bounds(weeks * 2, maxPrice),
      epochCount,
      data,
      state,
      samples,
      worker,
      0,
      dataLength,
      full,
      "model",
      "min",
      "max",
    );

  await run(2, 1, weeks + 1);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks * 2);
  await run(1, 1, 100);
  abort = true;
  const outcome = await run(1, 2, 100);
  expect(outcome.startsWith("failed:")).toBe(true);
  expect(data.exportState().activeWidth).toBe(1);
  expect(state.exportState().activeWidth).toBe(1);
  expect(data.getCoveredWeeks(gridKey())).toBe(weeks * 2);
  expect(state.getCoveredWeeks(gridKey())).toBe(weeks * 2);
  expect(data.getValidity(gridKey())).toEqual([2, 1]);
  expect(state.getValidity(gridKey())).toEqual([2, 1]);
});
