import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import VariableDrawdownCache from "../src/classes/variable-drawdown-cache";
import { VariableDrawdownFinal } from "../src/classes/variable-drawdown-final";
import { WEEKS_PER_EPOCH } from "../src/constants";
import { type DrawdownStaticReturn } from "../src/contexts/computed/drawdown-static";
import { handleVolume as scheduleVolume } from "../src/contexts/computed/volume";
import type { WorkerContextType } from "../src/contexts/workers/types";
import type { TaskResult } from "../src/contexts/workers/types";
import { handleVolumeCalculation } from "../src/contexts/workers/volume";

const emptyFlow = (weeks: number, seriesHash = `empty:${weeks}`): DrawdownStaticReturn => ({
  seriesHash,
  totalWeeklyBitcoinItems: new Float64Array(weeks),
  totalWeeklyFiatItems: new Float64Array(weeks),
});

const PRICE = "price";

const balanceKey = (spend: string, weeksSince: number, flow: DrawdownStaticReturn): string =>
  `volume:${weeksSince}:${flow.seriesHash}:${PRICE}:${spend}`;

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
  const cashflow = emptyFlow(1);
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
      PRICE,
      weeksSince,
      4,
      worker,
      false,
    );

  await run(4);
  await run(4);
  expect(writes).toBe(1);

  await run(9);

  expect(writes).toBe(2);
});

test("the same spend inside the covered weeks does not walk", async () => {
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
  const balances = new GrowableSharedArray(2, 1, length);
  const short = new VariableDrawdownFinal([], 1, 1);
  const long = new VariableDrawdownFinal([], 1, 1);
  expect(short.spendHash()).toBe(long.spendHash());
  const spentCache = new VariableDrawdownCache();
  spentCache.set(0, 3, 10);
  const spent = new VariableDrawdownFinal([spentCache], 1, 1);
  expect(spent.spendHash() === short.spendHash()).toBe(false);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["long", long],
    ["short", short],
    ["spent", spent],
  ]);
  const cashflow = emptyFlow(1);
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
      PRICE,
      0,
      4,
      worker,
      false,
    );

  await run(1, "short");
  const walksAfterFirst = walks;
  await run(2, "long");
  expect(walks).toBe(walksAfterFirst);

  epochZeroPresent = false;
  await run(2, "spent");
  expect(walks).toBe(walksAfterFirst + 1);
  expect(epochZeroPresent).toBe(false);
});

test("a longer year clears only the next balance column", async () => {
  const length = WEEKS_PER_EPOCH;
  let columnZero = false;
  let columnOne = false;
  let walks = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      walks += tasks.length;
      for (const task of tasks) {
        if (task.type !== "RUN_VOLUME") continue;
        const volume = GrowableSharedArray.fromExportedState(task.payload.drawdownExport);
        columnZero = volume.get(0, 0) !== undefined;
        columnOne = volume.get(1, 0) !== undefined;
        const row = new Float64Array(length);
        row.fill(5);
        volume.set(0, 0, row);
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(2, 1, length);
  const balances = new GrowableSharedArray(2, 1, length);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["variables", new VariableDrawdownFinal([], 1, 1)],
  ]);
  const cashflow = emptyFlow(1);
  const signal = new AbortController().signal;
  const run = (epochCount: number, dataLength: number): Promise<string> =>
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
      "variables",
      PRICE,
      0,
      dataLength,
      worker,
      false,
    );

  await run(1, 10);
  const walksAfterFirst = walks;
  columnZero = false;
  columnOne = false;
  await run(2, length + 1);
  expect(walks).toBe(walksAfterFirst + 1);
  expect(columnZero).toBe(true);
  expect(columnOne).toBe(false);
  const final = finals.get("variables");
  if (final === undefined) throw new Error("missing final");
  expect(balances.getCoveredWeeks(balanceKey(final.spendHash(), 0, cashflow))).toBe(length * 2);
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

  const cashflow = emptyFlow(1);
  const outcome = await scheduleVolume(
    new AbortController().signal,
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
    PRICE,
    0,
    1,
    worker,
    false,
  );

  const final = finals.get("variables");
  if (final === undefined) throw new Error("missing final");
  expect(outcome).toBe("failed:volume111variables");
  expect(balances.getValidity(balanceKey(final.spendHash(), 0, cashflow))).toEqual([0, 0]);
  expect(balances.getCoveredWeeks(balanceKey(final.spendHash(), 0, cashflow))).toBe(0);
});

test("samples added during a short year fill the trusted balance columns", async () => {
  const length = WEEKS_PER_EPOCH;
  const posted: { activeWidth: number; epochCount: number; start: number }[] = [];
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      for (const task of tasks) {
        if (task.type !== "RUN_VOLUME") throw new Error("unexpected task");
        posted.push({
          activeWidth: task.payload.simulationExport.activeWidth,
          epochCount: task.payload.epochCount,
          start: task.payload.task.startIndex,
        });
        handleVolumeCalculation(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(2, 2, length);
  const balances = new GrowableSharedArray(2, 2, length);
  const plant = (sample: number): void => {
    const row = new Float64Array(length);
    row.fill(100);
    prices.resize(2, sample + 1);
    prices.set(0, sample, row);
    prices.set(1, sample, row);
  };
  plant(0);
  prices.resize(2, 1);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["variables", new VariableDrawdownFinal([], 1, 2)],
  ]);
  const cashflow = emptyFlow(length * 2);
  const signal = new AbortController().signal;
  const run = (epochCount: number, samples: number, dataLength: number): Promise<string> =>
    scheduleVolume(
      signal,
      "node",
      1,
      cashflow,
      finals,
      samples,
      epochCount,
      prices,
      balances,
      "volume",
      "variables",
      PRICE,
      0,
      dataLength,
      worker,
      false,
    );

  await run(2, 1, length + 1);
  const final = finals.get("variables");
  if (final === undefined) throw new Error("missing final");
  const walkedKey = balanceKey(final.spendHash(1), 0, cashflow);
  expect(balances.getCoveredWeeks(walkedKey)).toBe(length * 2);
  const kept = balances.get(0, 0);
  if (kept === undefined) throw new Error("missing first balance");
  const keptValue = kept[0];

  posted.length = 0;
  const shrunk = await run(1, 1, 10);
  expect(shrunk.startsWith("no tasks:")).toBe(true);
  expect(posted).toEqual([]);

  plant(1);
  prices.resize(1, 2);
  const caughtUp = await run(1, 2, 10);
  expect(caughtUp.startsWith("success:")).toBe(true);
  expect(posted).toEqual([{ activeWidth: 2, epochCount: 2, start: 1 }]);
  expect(prices.exportState().activeWidth).toBe(1);
  expect(balances.exportState().activeWidth).toBe(1);
  const key = balanceKey(final.spendHash(), 0, cashflow);
  expect(balances.getValidity(key)).toEqual([2, 2]);
  expect(balances.getCoveredWeeks(key)).toBe(length * 2);
  expect(balances.getValidity(walkedKey)).toEqual([0, 0]);

  posted.length = 0;
  const restored = await run(2, 2, length + 1);
  expect(restored.startsWith("no tasks:")).toBe(true);
  expect(posted).toEqual([]);
  const again = balances.get(0, 0);
  if (again === undefined) throw new Error("missing kept balance");
  expect(again[0]).toBe(keptValue);
  const added = balances.get(1, 1);
  if (added === undefined) throw new Error("missing added balance");
  expect(added[0]).toBe(1);
});

test("an aborted sample catch-up leaves the requested balance width", async () => {
  const length = WEEKS_PER_EPOCH;
  let abort = false;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      if (!abort) {
        for (const task of tasks) {
          if (task.type !== "RUN_VOLUME") throw new Error("unexpected task");
          handleVolumeCalculation(task.payload, { aborted: false });
        }
      }
      return Promise.resolve(
        tasks.map((): TaskResult => ({ id: "task", status: abort ? "aborted" : "completed" })),
      );
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(2, 2, length);
  const balances = new GrowableSharedArray(2, 2, length);
  const row = new Float64Array(length);
  row.fill(100);
  prices.set(0, 0, row);
  prices.set(1, 0, row);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["variables", new VariableDrawdownFinal([], 1, 2)],
  ]);
  const cashflow = emptyFlow(length * 2);
  const signal = new AbortController().signal;
  const run = (epochCount: number, samples: number, dataLength: number): Promise<string> =>
    scheduleVolume(
      signal,
      "node",
      1,
      cashflow,
      finals,
      samples,
      epochCount,
      prices,
      balances,
      "volume",
      "variables",
      PRICE,
      0,
      dataLength,
      worker,
      false,
    );

  await run(2, 1, length + 1);
  const final = finals.get("variables");
  if (final === undefined) throw new Error("missing final");
  const key = balanceKey(final.spendHash(1), 0, cashflow);
  expect(balances.getCoveredWeeks(key)).toBe(length * 2);
  await run(1, 1, 10);
  prices.resize(2, 2);
  prices.set(0, 1, row);
  prices.set(1, 1, row);
  prices.resize(1, 2);
  abort = true;
  const outcome = await run(1, 2, 10);
  expect(outcome.startsWith("failed:")).toBe(true);
  expect(balances.exportState().activeWidth).toBe(1);
  expect(prices.exportState().activeWidth).toBe(1);
  expect(balances.getCoveredWeeks(key)).toBe(length * 2);
  expect(balances.getValidity(key)).toEqual([2, 1]);
});

test("a cashflow week that moves clears the covered balances", async () => {
  const length = 4;
  let walks = 0;
  let columnPresent = false;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      walks += tasks.length;
      for (const task of tasks) {
        if (task.type !== "RUN_VOLUME") continue;
        const volume = GrowableSharedArray.fromExportedState(task.payload.drawdownExport);
        columnPresent = volume.get(0, 0) !== undefined;
        const row = new Float64Array(length);
        row.fill(5);
        volume.set(0, 0, row);
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(1, 1, length);
  const balances = new GrowableSharedArray(1, 1, length);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["variables", new VariableDrawdownFinal([], 1, 1)],
  ]);
  const signal = new AbortController().signal;
  const run = (flow: DrawdownStaticReturn, dataLength: number): Promise<string> =>
    scheduleVolume(
      signal,
      "node",
      1,
      flow,
      finals,
      1,
      1,
      prices,
      balances,
      "volume",
      "variables",
      PRICE,
      0,
      dataLength,
      worker,
      false,
    );

  const first = emptyFlow(1, "week-1");
  const same = emptyFlow(1, "week-1");
  const moved = emptyFlow(1, "week-0");

  await run(first, 4);
  expect(walks).toBe(1);
  const held = await run(same, 2);
  expect(held.startsWith("no tasks:")).toBe(true);
  expect(walks).toBe(1);

  columnPresent = true;
  const cleared = await run(moved, 2);
  expect(cleared.startsWith("success:")).toBe(true);
  expect(walks).toBe(2);
  expect(columnPresent).toBe(false);
});

test("appending a sample keeps the walked spend and catches up the new row", async () => {
  const length = WEEKS_PER_EPOCH;
  const posted: { epochCount: number; present: boolean; start: number }[] = [];
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      for (const task of tasks) {
        if (task.type !== "RUN_VOLUME") throw new Error("unexpected task");
        const volume = GrowableSharedArray.fromExportedState(task.payload.drawdownExport);
        posted.push({
          epochCount: task.payload.epochCount,
          present: volume.get(0, 0) !== undefined,
          start: task.payload.task.startIndex,
        });
        handleVolumeCalculation(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(2, 2, length);
  const balances = new GrowableSharedArray(2, 2, length);
  const row = new Float64Array(length);
  row.fill(100);
  const plant = (sample: number): void => {
    prices.resize(2, sample + 1);
    prices.set(0, sample, row);
    prices.set(1, sample, row);
  };
  plant(0);
  prices.resize(2, 1);
  const spends = new VariableDrawdownCache();
  spends.set(0, 4, 8);
  spends.set(1, 6, 9);
  const first = new VariableDrawdownFinal([spends], 1, 1);
  const grown = new VariableDrawdownFinal([spends], 1, 2);
  expect(grown.spendHash(1)).toBe(first.spendHash());
  expect(grown.spendHash() === first.spendHash()).toBe(false);
  const cashflow = emptyFlow(length * 2);
  const signal = new AbortController().signal;
  const run = (
    final: VariableDrawdownFinal,
    samples: number,
    epochCount: number,
    dataLength: number,
  ): Promise<string> =>
    scheduleVolume(
      signal,
      "node",
      1,
      cashflow,
      new Map([["variables", final]]),
      samples,
      epochCount,
      prices,
      balances,
      "volume",
      "variables",
      PRICE,
      0,
      dataLength,
      worker,
      false,
    );

  await run(first, 1, 2, length + 1);
  const walkedKey = balanceKey(first.spendHash(), 0, cashflow);
  expect(balances.getCoveredWeeks(walkedKey)).toBe(length * 2);

  plant(1);
  prices.resize(1, 2);
  posted.length = 0;
  const caughtUp = await run(grown, 2, 1, 10);
  expect(caughtUp.startsWith("success:")).toBe(true);
  expect(posted).toEqual([{ epochCount: 2, present: true, start: 1 }]);
  const key = balanceKey(grown.spendHash(), 0, cashflow);
  expect(balances.getValidity(key)).toEqual([2, 2]);
  expect(balances.getCoveredWeeks(key)).toBe(length * 2);
  expect(balances.getValidity(walkedKey)).toEqual([0, 0]);

  spends.set(0, 1, 99);
  const changed = new VariableDrawdownFinal([spends], 1, 2);
  prices.resize(1, 2);
  posted.length = 0;
  const cleared = await run(changed, 2, 1, 10);
  expect(cleared.startsWith("success:")).toBe(true);
  expect(posted).toEqual([{ epochCount: 1, present: false, start: 0 }]);
});

test("a new spot clears the covered balances", async () => {
  const length = 4;
  let walks = 0;
  let columnPresent = false;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      walks += tasks.length;
      for (const task of tasks) {
        if (task.type !== "RUN_VOLUME") continue;
        const volume = GrowableSharedArray.fromExportedState(task.payload.drawdownExport);
        columnPresent = volume.get(0, 0) !== undefined;
        const row = new Float64Array(length);
        row.fill(5);
        volume.set(0, 0, row);
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const prices = new GrowableSharedArray(1, 1, length);
  const balances = new GrowableSharedArray(1, 1, length);
  const finals = new Map<string, VariableDrawdownFinal>([
    ["variables", new VariableDrawdownFinal([], 1, 1)],
  ]);
  const cashflow = emptyFlow(1);
  const signal = new AbortController().signal;
  const run = (priceIdentity: string, dataLength: number): Promise<string> =>
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
      priceIdentity,
      0,
      dataLength,
      worker,
      false,
    );

  await run("spot-a", 4);
  expect(walks).toBe(1);
  const held = await run("spot-a", 2);
  expect(held.startsWith("no tasks:")).toBe(true);
  expect(walks).toBe(1);
  columnPresent = true;
  const cleared = await run("spot-b", 2);
  expect(cleared.startsWith("success:")).toBe(true);
  expect(walks).toBe(2);
  expect(columnPresent).toBe(false);
});
