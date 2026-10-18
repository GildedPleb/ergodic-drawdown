import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { VariableDrawdownFinal } from "../src/classes/variable-drawdown-final";
import { handleVolume as scheduleVolume } from "../src/contexts/computed/volume";
import type { WorkerContextType } from "../src/contexts/workers/types";
import type { TaskResult } from "../src/contexts/workers/types";
import { handleVolumeCalculation } from "../src/contexts/workers/volume";

test("a cached volume epoch that ends in NaN keeps the running balance", () => {
  const length = 4;
  const weeksSince = 5;
  const prices = new GrowableSharedArray(2, 1, length);
  const volume = new GrowableSharedArray(2, 1, length);
  const blank = new Float64Array(length);
  blank.fill(Number.NaN);
  prices.set(0, 0, blank);
  // The first week of the second epoch is still before the cashflow series.
  prices.set(1, 0, new Float64Array([Number.NaN, 100, 100, 100]));
  volume.set(0, 0, blank);

  handleVolumeCalculation(
    {
      bitcoin: 2,
      drawdownExport: volume.exportState(),
      epochCount: 2,
      exportedVariableCache: {
        buffer: new SharedArrayBuffer(0),
        sampleCount: 1,
        weekCount: 0,
      },
      simulationExport: prices.exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      totalWeeklyBitcoinItems: new Float64Array(3),
      totalWeeklyFiatItems: new Float64Array(3),
      weeksSince,
    },
    { aborted: false },
  );

  const next = volume.get(1, 0);
  if (next === undefined) throw new Error("missing continued volume");
  expect(Number.isNaN(next[0])).toBe(true);
  expect(next[1]).toBe(2);
  expect(next[length - 1]).toBe(2);
});

test("a finite price before the cashflow series does not wipe the balance", () => {
  const length = 4;
  const prices = new GrowableSharedArray(1, 1, length);
  const volume = new GrowableSharedArray(1, 1, length);
  prices.set(0, 0, new Float64Array([100, 100, 100, 100]));

  handleVolumeCalculation(
    {
      bitcoin: 2,
      drawdownExport: volume.exportState(),
      epochCount: 1,
      exportedVariableCache: {
        buffer: new SharedArrayBuffer(0),
        sampleCount: 1,
        weekCount: 0,
      },
      simulationExport: prices.exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      totalWeeklyBitcoinItems: new Float64Array(3),
      totalWeeklyFiatItems: new Float64Array(3),
      weeksSince: 1,
    },
    { aborted: false },
  );

  const row = volume.get(0, 0);
  if (row === undefined) throw new Error("missing volume row");
  expect(Number.isNaN(row[0])).toBe(true);
  expect(row[1]).toBe(2);
  expect(row[length - 1]).toBe(2);
});

test("a new weeksSince rebuilds a finished balance grid", async () => {
  let writes = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      writes += tasks.length;
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(1, 1);
  const balances = new GrowableSharedArray(1, 1);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["variables", new VariableDrawdownFinal([], 1, 1)],
  ]);
  const cashflow = {
    totalWeeklyBitcoinItems: new Float64Array(1),
    totalWeeklyFiatItems: new Float64Array(1),
  };
  const signal = new AbortController().signal;
  const run = (weeksSince: number): Promise<string> =>
    scheduleVolume(
      signal,
      "node",
      1,
      cashflow,
      finals,
      1,
      1,
      prices,
      balances,
      "volume",
      "variables",
      weeksSince,
      worker,
      false,
    );

  await run(4);
  await run(4);
  expect(writes).toBe(1);

  await run(9);

  expect(writes).toBe(2);
});

test("a new variable result walks a finished balance from the start", async () => {
  const length = 4;
  let epochZeroPresent = false;
  let walks = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      walks += tasks.length;
      for (const task of tasks) {
        if (task.type !== "RUN_VOLUME") continue;
        const volume = GrowableSharedArray.fromExportedState(task.payload.drawdownExport);
        if (volume.get(0, 0) !== undefined) epochZeroPresent = true;
        const row = new Float64Array(length);
        row.fill(5);
        volume.set(0, 0, row);
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(2, 1, length);
  prices.set(0, 0, new Float64Array([100, 100, 100, 100]));
  prices.set(1, 0, new Float64Array([100, 100, 100, 100]));
  const balances = new GrowableSharedArray(2, 1, length);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["short", new VariableDrawdownFinal([], 1, 1)],
    ["long", new VariableDrawdownFinal([], 1, 1)],
  ]);
  const cashflow = {
    totalWeeklyBitcoinItems: new Float64Array(1),
    totalWeeklyFiatItems: new Float64Array(1),
  };
  const signal = new AbortController().signal;
  const run = (epochCount: number, variableCacheHash: string): Promise<string> =>
    scheduleVolume(
      signal,
      "node",
      1,
      cashflow,
      finals,
      1,
      epochCount,
      prices,
      balances,
      "volume",
      variableCacheHash,
      0,
      worker,
      false,
    );

  await run(1, "short");
  epochZeroPresent = false;
  const walksAfterFirst = walks;
  await run(2, "long");

  expect(walks).toBe(walksAfterFirst + 1);
  expect(epochZeroPresent).toBe(false);
});

test("an aborted volume wave does not mark the balance grid valid", async () => {
  const worker: WorkerContextType = {
    addTasks: (tasks) =>
      Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "aborted" }))),
    count: 1,
  };
  const prices = new GrowableSharedArray(1, 1);
  const balances = new GrowableSharedArray(1, 1);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["variables", new VariableDrawdownFinal([], 1, 1)],
  ]);

  const outcome = await scheduleVolume(
    new AbortController().signal,
    "node",
    1,
    {
      totalWeeklyBitcoinItems: new Float64Array(1),
      totalWeeklyFiatItems: new Float64Array(1),
    },
    finals,
    1,
    1,
    prices,
    balances,
    "volume",
    "variables",
    0,
    worker,
    false,
  );

  expect(outcome).toBe("failed:volume11variables");
  expect(balances.getValidity("volume:variables:0")).toEqual([0, 0]);
});
