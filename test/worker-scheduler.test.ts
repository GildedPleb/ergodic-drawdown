import { expect, test } from "bun:test";

import { cancelBoard } from "../src/contexts/workers/cancel";
import { createScheduler, type Scheduler } from "../src/contexts/workers/scheduler";
import { type TaskResult, type WorkerEvent, type WorkerTasks } from "../src/contexts/workers/types";

const emptyBuffer = new SharedArrayBuffer(0);

const oneTask = (): WorkerTasks =>
  ({
    payload: {
      cutoffs: [],
      groupedDataBuffer: emptyBuffer,
      quantilesBuffer: emptyBuffer,
      samples: 1,
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
    },
    type: "RUN_DISTRIBUTION_NORMAL",
  }) satisfies WorkerTasks;

const wave = (count: number): WorkerTasks[] => Array.from({ length: count }, () => oneTask());

interface FakeWorker {
  inbox: WorkerEvent[];
  maxInbox: number;
  posted: string[];
  postMessage(message: WorkerEvent): void;
  readonly workerId: number;
}

const createPool = (
  count: number,
): {
  scheduler: Scheduler;
  workers: FakeWorker[];
} => {
  const workers: FakeWorker[] = [];
  for (let workerId = 0; workerId < count; workerId += 1) {
    const inbox: WorkerEvent[] = [];
    const posted: string[] = [];
    let maxInbox = 0;
    const worker: FakeWorker = {
      inbox,
      get maxInbox() {
        return maxInbox;
      },
      posted,
      postMessage(message) {
        inbox.push(message);
        posted.push(message.id);
        maxInbox = Math.max(maxInbox, inbox.length);
      },
      workerId,
    };
    workers.push(worker);
  }
  return { scheduler: createScheduler(workers, cancelBoard(count)), workers };
};

const lengths = (workers: readonly FakeWorker[]): number[] =>
  workers.map((worker) => worker.inbox.length);

const peak = (workers: readonly FakeWorker[]): number =>
  workers.reduce((max, worker) => Math.max(max, worker.maxInbox), 0);

const postedCount = (workers: readonly FakeWorker[], id: string): number =>
  workers.reduce(
    (count, worker) => count + worker.posted.filter((posted) => posted === id).length,
    0,
  );

const statuses = (results: readonly TaskResult[]): string[] =>
  results.map((result) => result.status).toSorted();

const reply = (scheduler: Scheduler, worker: FakeWorker): TaskResult => {
  const message = worker.inbox.shift();
  if (message === undefined) throw new Error("worker is idle");
  const status =
    Atomics.load(new Uint32Array(message.board), worker.workerId) !== message.generation
      ? "aborted"
      : "completed";
  const result: TaskResult = { id: message.id, status };
  scheduler.handleMessage(worker, result);
  return result;
};

const workerAt = (workers: readonly FakeWorker[], index: number): FakeWorker => {
  const worker = workers[index];
  if (worker === undefined) throw new Error("missing worker");
  return worker;
};

test("an abort does not hand a busy worker a second task", async () => {
  const { scheduler, workers } = createPool(2);
  const first = workerAt(workers, 0);
  const second = workerAt(workers, 1);

  const waveA = new AbortController();
  const resultsA = scheduler.addTasks(wave(3), waveA.signal);
  expect(lengths(workers)).toEqual([1, 1]);
  const staleA = first.inbox[0];
  if (staleA === undefined) throw new Error("missing first task");

  waveA.abort();
  expect(lengths(workers)).toEqual([1, 1]);
  const abortedA = await resultsA;
  expect(statuses(abortedA)).toEqual(["aborted", "aborted", "aborted"]);
  const postedA = new Set(workers.flatMap((worker) => worker.posted));
  expect(abortedA.filter((result) => !postedA.has(result.id)).length).toBe(1);

  const resultsB = scheduler.addTasks(wave(4), new AbortController().signal);
  expect(lengths(workers)).toEqual([1, 1]);
  expect(workers.flatMap((worker) => worker.posted).length).toBe(2);

  const staleReply = reply(scheduler, first);
  expect(staleReply).toEqual({ id: staleA.id, status: "aborted" });
  expect(lengths(workers)).toEqual([1, 1]);
  const runningB = first.inbox[0];
  if (runningB === undefined) throw new Error("missing replacement task");
  expect(second.inbox.length).toBe(1);

  scheduler.handleMessage(first, { id: staleA.id, status: "completed" });
  expect(first.inbox[0]?.id).toBe(runningB.id);
  expect(lengths(workers)).toEqual([1, 1]);

  let guard = 0;
  while (workers.some((worker) => worker.inbox.length > 0)) {
    for (const worker of workers) {
      if (worker.inbox.length > 0) reply(scheduler, worker);
    }
    guard += 1;
    if (guard > 8) throw new Error("drain did not finish");
  }

  const completedB = await resultsB;
  expect(statuses(completedB)).toEqual(["completed", "completed", "completed", "completed"]);
  for (const result of completedB) expect(postedCount(workers, result.id)).toBe(1);
  expect(peak(workers)).toBe(1);
});

test("a stale reply does not drop the task the worker is running", async () => {
  const { scheduler, workers } = createPool(1);
  const only = workerAt(workers, 0);
  const waveA = new AbortController();
  const resultsA = scheduler.addTasks(wave(1), waveA.signal);
  const stale = only.inbox[0];
  if (stale === undefined) throw new Error("missing task");

  waveA.abort();
  await resultsA;
  const resultsB = scheduler.addTasks(wave(1), new AbortController().signal);
  expect(reply(scheduler, only).id).toBe(stale.id);
  const running = only.inbox[0];
  if (running === undefined) throw new Error("missing replacement");

  scheduler.handleMessage(only, { id: stale.id, status: "completed" });
  scheduler.handleMessage(only, { id: stale.id, status: "aborted" });
  expect(only.inbox.length).toBe(1);
  expect(only.inbox[0]?.id).toBe(running.id);
  expect(reply(scheduler, only).id).toBe(running.id);

  const completedB = await resultsB;
  expect(statuses(completedB)).toEqual(["completed"]);
  expect(postedCount(workers, running.id)).toBe(1);
  expect(peak(workers)).toBe(1);
});

test("abort before dispatch resolves every task as aborted and posts nothing", async () => {
  const { scheduler, workers } = createPool(2);
  const controller = new AbortController();
  controller.abort();

  const results = await scheduler.addTasks(wave(3), controller.signal);

  expect(statuses(results)).toEqual(["aborted", "aborted", "aborted"]);
  expect(lengths(workers)).toEqual([0, 0]);
  expect(peak(workers)).toBe(0);
});

test("an unposted tail is dropped on abort", async () => {
  const { scheduler, workers } = createPool(2);
  const controller = new AbortController();
  const pending = scheduler.addTasks(wave(3), controller.signal);
  const posted = new Set(workers.flatMap((worker) => worker.posted));

  controller.abort();
  const results = await pending;
  const tail = results.filter((result) => !posted.has(result.id));
  expect(tail.length).toBe(1);
  const dropped = tail[0];
  if (dropped === undefined) throw new Error("missing tail");

  for (const worker of workers) {
    if (worker.inbox.length > 0) reply(scheduler, worker);
  }

  expect(postedCount(workers, dropped.id)).toBe(0);
  expect(lengths(workers)).toEqual([0, 0]);
  expect(peak(workers)).toBe(1);
});

test("a second abort leaves the workers idle after they reply", async () => {
  const { scheduler, workers } = createPool(2);
  const firstWave = new AbortController();
  const resultsA = scheduler.addTasks(wave(3), firstWave.signal);
  firstWave.abort();

  const secondWave = new AbortController();
  const resultsB = scheduler.addTasks(wave(4), secondWave.signal);
  expect(lengths(workers)).toEqual([1, 1]);
  secondWave.abort();
  expect(lengths(workers)).toEqual([1, 1]);

  const abortedB = await resultsB;
  expect(statuses(abortedB)).toEqual(["aborted", "aborted", "aborted", "aborted"]);
  for (const result of abortedB) expect(postedCount(workers, result.id)).toBe(0);

  for (const worker of workers) {
    if (worker.inbox.length > 0) reply(scheduler, worker);
  }

  expect(lengths(workers)).toEqual([0, 0]);
  expect(peak(workers)).toBe(1);
  const abortedA = await resultsA;
  expect(abortedA.length).toBe(3);
});

test("abort after a task has completed does not post", async () => {
  const { scheduler, workers } = createPool(2);
  const first = workerAt(workers, 0);
  const controller = new AbortController();
  const pending = scheduler.addTasks(wave(1), controller.signal);

  expect(reply(scheduler, first).status).toBe("completed");
  const results = await pending;
  expect(statuses(results)).toEqual(["completed"]);

  controller.abort();
  expect(lengths(workers)).toEqual([0, 0]);

  const again = scheduler.addTasks(wave(1), new AbortController().signal);
  expect(lengths(workers)).toEqual([1, 0]);
  reply(scheduler, first);
  const second = await again;
  expect(statuses(second)).toEqual(["completed"]);
  expect(peak(workers)).toBe(1);
});

test("dispose settles a running wave and posts nothing more", async () => {
  const { scheduler, workers } = createPool(2);
  const pending = scheduler.addTasks(wave(3), new AbortController().signal);
  expect(lengths(workers)).toEqual([1, 1]);
  expect(workers.flatMap((worker) => worker.posted).length).toBe(2);

  scheduler.dispose();
  const results = await pending;
  expect(statuses(results)).toEqual(["aborted", "aborted", "aborted"]);
  expect(workers.flatMap((worker) => worker.posted).length).toBe(2);

  for (const worker of workers) {
    if (worker.inbox.length > 0) reply(scheduler, worker);
  }
  expect(workers.flatMap((worker) => worker.posted).length).toBe(2);
  expect(peak(workers)).toBe(1);

  const after = scheduler.addTasks(wave(2), new AbortController().signal);
  const closed = await after;
  expect(statuses(closed)).toEqual(["aborted", "aborted"]);
  expect(workers.flatMap((worker) => worker.posted).length).toBe(2);
});

test("one worker never holds two tasks across an abort and a new wave", async () => {
  const { scheduler, workers } = createPool(1);
  const only = workerAt(workers, 0);
  const firstWave = new AbortController();
  const resultsA = scheduler.addTasks(wave(3), firstWave.signal);
  expect(lengths(workers)).toEqual([1]);

  firstWave.abort();
  expect(lengths(workers)).toEqual([1]);
  const abortedA = await resultsA;
  expect(abortedA.length).toBe(3);

  const resultsB = scheduler.addTasks(wave(2), new AbortController().signal);
  expect(lengths(workers)).toEqual([1]);
  expect(reply(scheduler, only).status).toBe("aborted");
  expect(lengths(workers)).toEqual([1]);
  expect(reply(scheduler, only).status).toBe("completed");
  expect(lengths(workers)).toEqual([1]);
  expect(reply(scheduler, only).status).toBe("completed");
  expect(lengths(workers)).toEqual([0]);

  const completedB = await resultsB;
  expect(statuses(completedB)).toEqual(["completed", "completed"]);
  for (const result of completedB) expect(postedCount(workers, result.id)).toBe(1);
  expect(peak(workers)).toBe(1);
});
