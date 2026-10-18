import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import VariableDrawdownCache from "../src/classes/variable-drawdown-cache";
import { VariableDrawdownFinal } from "../src/classes/variable-drawdown-final";
import { handleDrawdownVariables } from "../src/contexts/computed/drawdown-variable";
import { handleChartOptions } from "../src/contexts/computed/chart-options";
import { handleDrawdownVariableLabels } from "../src/contexts/computed/drawdown-variable-labels";
import { MS_PER_WEEK } from "../src/constants";
import { handleDrawdownVariable } from "../src/contexts/workers/drawdown-variable";
import type { WorkerContextType } from "../src/contexts/workers/types";
import type { TaskResult, WorkerTasks } from "../src/contexts/workers/types";
import type { NarrowedOneOffFiat, OneOffFiatVariable } from "../src/types";

const variable = (hash: string): NarrowedOneOffFiat => ({
  amountToday: 100,
  btcWillingToSpend: 1,
  delay: 0,
  hash,
  start: 0,
});

const rememberWeek = (tasks: WorkerTasks[]): TaskResult[] => {
  for (const task of tasks) {
    if (task.type !== "RUN_DRAWDOWN_VARIABLE") continue;
    const cache = new VariableDrawdownCache(task.payload.variableDrawdownBuffer);
    cache.set(0, task.payload.weeksSince, 1);
  }
  return tasks.map((): TaskResult => ({ id: "task", status: "completed" }));
};

const run = async (
  caches: Map<string, VariableDrawdownCache>,
  finals: Map<string, VariableDrawdownFinal>,
  items: NarrowedOneOffFiat[],
  weeksSince: number,
  variableCacheHash: string,
  worker: WorkerContextType,
  epochCount = 1,
  simulationData = new GrowableSharedArray(1, 1),
  inflationFactors = new Float64Array([1, 1, 1, 1]),
): Promise<void> => {
  await handleDrawdownVariables(
    new AbortController().signal,
    "node",
    epochCount,
    1,
    "model",
    simulationData,
    finals,
    items,
    caches,
    worker,
    inflationFactors,
    weeksSince,
    variableCacheHash,
    false,
  );
};

test("two active variables both stay available for the final buffer", async () => {
  let writes = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      writes += tasks.length;
      return Promise.resolve(rememberWeek(tasks));
    },
    count: 1,
  };
  const caches = new Map<string, VariableDrawdownCache>();
  const finals = new Map<string, VariableDrawdownFinal>();

  await run(caches, finals, [variable("rent"), variable("food")], 4, "final-a", worker);

  expect(writes).toBe(2);
  expect(caches.get("rent")?.get(0)).toEqual([4, 1]);
  expect(caches.get("food")?.get(0)).toEqual([4, 1]);
  expect(finals.size).toBe(1);
  expect(finals.has("final-a")).toBe(true);
});

test("a later week count clears a stored variable week", async () => {
  let writes = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      writes += tasks.length;
      return Promise.resolve(rememberWeek(tasks));
    },
    count: 1,
  };
  const caches = new Map<string, VariableDrawdownCache>();
  const finals = new Map<string, VariableDrawdownFinal>();
  const items = [variable("rent")];

  await run(caches, finals, items, 4, "final-a", worker);
  await run(caches, finals, items, 4, "final-a", worker);
  expect(writes).toBe(1);
  expect(caches.get("rent")?.get(0)).toEqual([4, 1]);

  await run(caches, finals, items, 9, "final-b", worker);

  expect(writes).toBe(2);
  expect(caches.get("rent")?.get(0)).toEqual([9, 1]);
  expect(finals.size).toBe(1);
  expect(finals.has("final-a")).toBe(false);
  expect(finals.has("final-b")).toBe(true);
});

test("a sample that never finds a week stays in the final", async () => {
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      for (const task of tasks) {
        if (task.type !== "RUN_DRAWDOWN_VARIABLE") continue;
        handleDrawdownVariable(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const caches = new Map<string, VariableDrawdownCache>();
  const finals = new Map<string, VariableDrawdownFinal>();

  await run(caches, finals, [variable("rent")], 0, "final-a", worker);

  const stored = caches.get("rent")?.get(0);
  if (stored === undefined) throw new Error("missing variable cache");
  expect(Number.isNaN(stored[0])).toBe(true);
  expect(finals.has("final-a")).toBe(true);
  expect(finals.get("final-a")?.get(0, 0)).toBe(undefined);
});

test("a price row that never clears the threshold is a finished empty sample", () => {
  const prices = new GrowableSharedArray(1, 1, 4);
  prices.set(0, 0, new Float64Array([1, 1, 1, 1]));
  const cache = new VariableDrawdownCache();

  handleDrawdownVariable(
    {
      inflationFactors: new Float64Array([1, 1, 1, 1]),
      oneOffFiatVariable: variable("rent"),
      simulationExport: prices.exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      variableDrawdownBuffer: cache.getBuffer(),
      weeksSince: 0,
    },
    { aborted: false },
  );

  const stored = cache.get(0);
  expect(Number.isNaN(stored[0])).toBe(true);
  cache.setValidity("searched", 1, 1);
  expect(cache.isFull()).toBe(true);
});

test("a longer epoch searches a sample that missed on the shorter series", async () => {
  const shortPrices = new GrowableSharedArray(1, 1, 4);
  shortPrices.set(0, 0, new Float64Array([1, 1, 1, 1]));
  const longPrices = new GrowableSharedArray(1, 1, 4);
  longPrices.set(0, 0, new Float64Array([200, 200, 200, 200]));
  let writes = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      writes += tasks.length;
      for (const task of tasks) {
        if (task.type !== "RUN_DRAWDOWN_VARIABLE") continue;
        handleDrawdownVariable(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const caches = new Map<string, VariableDrawdownCache>();
  const finals = new Map<string, VariableDrawdownFinal>();
  const items = [variable("rent")];

  await run(caches, finals, items, 0, "final-a", worker, 1, shortPrices);
  await run(caches, finals, items, 0, "final-a", worker, 1, shortPrices);
  expect(writes).toBe(1);
  const missed = caches.get("rent")?.get(0);
  if (missed === undefined) throw new Error("missing variable cache");
  expect(Number.isNaN(missed[0])).toBe(true);

  await run(caches, finals, items, 0, "final-a", worker, 2, longPrices);

  expect(writes).toBe(2);
  const found = caches.get("rent")?.get(0);
  if (found === undefined) throw new Error("missing variable cache");
  expect(found[0]).toBe(1);
  expect(finals.get("final-a")?.get(0, 1)).toBe(100);
});

test("a different series length searches every sample again", async () => {
  const shortPrices = new GrowableSharedArray(1, 1, 4);
  shortPrices.set(0, 0, new Float64Array([1, 1, 200, 200]));
  const longPrices = new GrowableSharedArray(1, 1, 6);
  longPrices.set(0, 0, new Float64Array([1, 1, 200, 200, 50, 200]));
  let writes = 0;
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      writes += tasks.length;
      for (const task of tasks) {
        if (task.type !== "RUN_DRAWDOWN_VARIABLE") continue;
        handleDrawdownVariable(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const caches = new Map<string, VariableDrawdownCache>();
  const finals = new Map<string, VariableDrawdownFinal>();
  const items = [{ ...variable("rent"), start: 100 }];

  const ones = new Float64Array([1, 1, 1, 1, 1, 1]);
  await run(caches, finals, items, 0, "final-short", worker, 1, shortPrices, ones);
  expect(caches.get("rent")?.get(0)).toEqual([3, 100]);

  await run(caches, finals, items, 0, "final-long", worker, 2, longPrices, ones);
  expect(writes).toBe(2);
  expect(caches.get("rent")?.get(0)).toEqual([5, 100]);
  expect(finals.get("final-long")?.get(0, 5)).toBe(100);
  expect(finals.has("final-short")).toBe(false);

  await run(caches, finals, items, 0, "final-short-again", worker, 1, shortPrices, ones);
  expect(writes).toBe(3);
  expect(caches.get("rent")?.get(0)).toEqual([3, 100]);

  await run(caches, finals, items, 0, "final-short-again", worker, 1, shortPrices, ones);
  expect(writes).toBe(3);
});

test("a longer series that ends unaffordable drops the short-series spend", async () => {
  const shortPrices = new GrowableSharedArray(1, 1, 4);
  shortPrices.set(0, 0, new Float64Array([1, 1, 200, 200]));
  const longPrices = new GrowableSharedArray(1, 1, 5);
  longPrices.set(0, 0, new Float64Array([1, 1, 200, 200, 1]));
  const worker: WorkerContextType = {
    addTasks: (tasks) => {
      for (const task of tasks) {
        if (task.type !== "RUN_DRAWDOWN_VARIABLE") continue;
        handleDrawdownVariable(task.payload, { aborted: false });
      }
      return Promise.resolve(tasks.map((): TaskResult => ({ id: "task", status: "completed" })));
    },
    count: 1,
  };
  const caches = new Map<string, VariableDrawdownCache>();
  const finals = new Map<string, VariableDrawdownFinal>();
  const items = [{ ...variable("rent"), start: 100 }];

  const ones = new Float64Array([1, 1, 1, 1, 1]);
  await run(caches, finals, items, 0, "final-short", worker, 1, shortPrices, ones);
  expect(caches.get("rent")?.get(0)).toEqual([3, 100]);

  await run(caches, finals, items, 0, "final-long", worker, 2, longPrices, ones);
  const stored = caches.get("rent")?.get(0);
  if (stored === undefined) throw new Error("missing variable cache");
  expect(Number.isNaN(stored[0])).toBe(true);
  expect(Number.isNaN(stored[1])).toBe(true);
  expect(finals.get("final-long")?.get(0, 3)).toBe(undefined);
});

test("a series that ends unaffordable has no spend and no label", () => {
  const prices = new GrowableSharedArray(1, 1, 4);
  prices.set(0, 0, new Float64Array([1, 200, 200, 1]));
  const cache = new VariableDrawdownCache();
  handleDrawdownVariable(
    {
      inflationFactors: new Float64Array([1, 1, 1, 1]),
      oneOffFiatVariable: { ...variable("rent"), start: 100 },
      simulationExport: prices.exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      variableDrawdownBuffer: cache.getBuffer(),
      weeksSince: 0,
    },
    { aborted: false },
  );
  cache.setValidity("searched", 1, 1);

  const stored = cache.get(0);
  expect(Number.isNaN(stored[0])).toBe(true);
  expect(Number.isNaN(stored[1])).toBe(true);
  expect(new VariableDrawdownFinal([cache], 1, 1).get(0, 1)).toBe(undefined);

  const caches = new Map<string, VariableDrawdownCache>([["rent", cache]]);
  const item: OneOffFiatVariable = {
    active: true,
    amountToday: 100,
    btcWillingToSpend: 1,
    delay: 0,
    hash: "rent",
    id: "rent",
    name: "rent",
    start: 100,
  };
  expect(
    handleDrawdownVariableLabels(new AbortController().signal, "node", [item], caches, false),
  ).toEqual([]);
});

test("a marker names the first week and leaves the end open until every sample has a week", () => {
  const cache = new VariableDrawdownCache();
  cache.setValidity("same", 2, 1);
  cache.set(0, 4, 25);
  cache.set(1, Number.NaN, Number.NaN);
  const caches = new Map<string, VariableDrawdownCache>([["rent", cache]]);
  const item: OneOffFiatVariable = {
    active: true,
    amountToday: 100,
    btcWillingToSpend: 1,
    delay: 0,
    hash: "rent",
    id: "rent",
    name: "rent",
    start: 0,
  };
  const signal = new AbortController().signal;

  expect(handleDrawdownVariableLabels(signal, "node", [item], caches, false)).toEqual([
    { effectiveWeek: 4, name: "rent" },
  ]);

  cache.set(1, 6, 25);

  expect(handleDrawdownVariableLabels(signal, "node", [item], caches, false)).toEqual([
    { effectiveWeek: 4, endWeek: 6, name: "rent" },
  ]);
});

test("a variable with no week has no marker", () => {
  const cache = new VariableDrawdownCache();
  cache.setValidity("same", 1, 1);
  cache.set(0, Number.NaN, Number.NaN);
  const caches = new Map<string, VariableDrawdownCache>([["rent", cache]]);
  const item: OneOffFiatVariable = {
    active: true,
    amountToday: 100,
    btcWillingToSpend: 1,
    delay: 0,
    hash: "rent",
    id: "rent",
    name: "rent",
    start: 0,
  };

  expect(
    handleDrawdownVariableLabels(new AbortController().signal, "node", [item], caches, false),
  ).toEqual([]);
});

test("an open bracket keeps the name and has no end date", () => {
  const now = Date.UTC(2030, 0, 6);
  const dataLength = 100;
  const open = handleChartOptions(
    new AbortController().signal,
    "node",
    [],
    now,
    [],
    dataLength,
    [],
    false,
    [{ effectiveWeek: 4, name: "rent" }],
    false,
  );
  const closed = handleChartOptions(
    new AbortController().signal,
    "node",
    [],
    now,
    [],
    dataLength,
    [],
    false,
    [{ effectiveWeek: 4, endWeek: 6, name: "rent" }],
    false,
  );
  const annotations = open.plugins?.annotation?.annotations;
  const closedAnnotations = closed.plugins?.annotation?.annotations;
  if (!Array.isArray(annotations) || !Array.isArray(closedAnnotations)) {
    throw new Error("missing chart annotations");
  }
  const start = now + 4 * MS_PER_WEEK;
  const seriesEnd = now + dataLength * MS_PER_WEEK;
  const knownEnd = now + 6 * MS_PER_WEEK;

  expect(annotations.some((entry) => "xMin" in entry && entry.xMin === start)).toBe(true);
  expect(annotations.some((entry) => "xMax" in entry && entry.xMax === seriesEnd)).toBe(true);
  expect(annotations.some((entry) => "label" in entry && entry.label?.content === "rent")).toBe(
    true,
  );
  expect(annotations.some((entry) => "value" in entry && entry.value === seriesEnd)).toBe(false);

  expect(closedAnnotations.some((entry) => "value" in entry && entry.value === knownEnd)).toBe(
    true,
  );
  expect(closedAnnotations.some((entry) => "xMax" in entry && entry.xMax === knownEnd)).toBe(true);
});

test("a variable that is no longer active leaves the working set", async () => {
  const worker: WorkerContextType = {
    addTasks: () => Promise.resolve([]),
    count: 1,
  };
  const caches = new Map<string, VariableDrawdownCache>();
  const finals = new Map<string, VariableDrawdownFinal>();

  await run(caches, finals, [variable("rent"), variable("food")], 4, "final-a", worker);
  await run(caches, finals, [variable("rent")], 4, "final-b", worker);

  expect(caches.has("rent")).toBe(true);
  expect(caches.has("food")).toBe(false);
});
