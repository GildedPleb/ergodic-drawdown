import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import VariableDrawdownCache from "../src/classes/variable-drawdown-cache";
import { type VariableDrawdownFinal } from "../src/classes/variable-drawdown-final";
import { handleDrawdownVariables } from "../src/contexts/computed/drawdown-variable";
import type { WorkerContextType } from "../src/contexts/workers";
import type { TaskResult, WorkerTasks } from "../src/contexts/workers/types";
import type { NarrowedOneOffFiat } from "../src/types";

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
): Promise<void> => {
  await handleDrawdownVariables(
    new AbortController().signal,
    "node",
    1,
    1,
    "model",
    new GrowableSharedArray(1, 1),
    finals,
    items,
    caches,
    worker,
    new Float64Array([1]),
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
