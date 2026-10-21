import { afterEach, expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { MS_PER_WEEK } from "../src/constants";
import { handleDistribution } from "../src/contexts/computed/distribution";
import { acquire, bufferSlots } from "../src/engine/memory";
import { type WorkerContextType } from "../src/contexts/workers/types";
import {
  type DistributionGroupEvent,
  type DistributionNormalEvent,
  type DistributionQuantileEvent,
  type TaskResult,
} from "../src/contexts/workers/types";
import { type DatasetList, type DistributionType } from "../src/types";

type DistributionTask =
  | DistributionGroupEvent
  | DistributionNormalEvent
  | DistributionQuantileEvent;

interface Posted {
  grouped: SharedArrayBuffer;
  note: () => void;
  resolve: (status: "aborted" | "completed") => void;
  task: DistributionTask;
  values: SharedArrayBuffer | null;
}

interface RunInput {
  character?: "drawdown" | "price";
  dataLength?: number;
  now?: number;
  render?: DistributionType;
  samples?: number;
  showModel?: boolean;
  sourceHash?: string;
  weeksSince?: number;
}

const grid = new GrowableSharedArray(1, 1, 1, new SharedArrayBuffer(8));
const posts: Posted[] = [];
const seen: DistributionTask[] = [];
let calls = 0;
let stamp = 1;

const worker: WorkerContextType = {
  addTasks(tasks, _signal, onKernelSettled) {
    const task = tasks[0];
    if (
      task === undefined ||
      (task.type !== "RUN_DISTRIBUTION_GROUP" &&
        task.type !== "RUN_DISTRIBUTION_NORMAL" &&
        task.type !== "RUN_DISTRIBUTION_QUANTILE")
    ) {
      onKernelSettled?.();
      return Promise.resolve([]);
    }

    const values = task.type === "RUN_DISTRIBUTION_GROUP" ? null : task.payload.quantilesBuffer;
    calls += 1;
    seen.push(task);
    return new Promise<TaskResult[]>((resolve) => {
      posts.push({
        grouped: task.payload.groupedDataBuffer,
        note: () => {
          onKernelSettled?.();
        },
        resolve: (status) => {
          if (values !== null && status === "completed") {
            const view = new Float64Array(values);
            const mark = stamp;
            stamp += 1;
            for (let index = 0; index < view.length; index += 1) view[index] = mark;
          }
          resolve(tasks.map((_, index) => ({ id: `${task.type}-${index.toString()}`, status })));
        },
        task,
        values,
      });
    });
  },
  count: 1,
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const take = (): Posted => {
  const posted = posts.shift();
  if (posted === undefined) throw new Error("no posted task");
  return posted;
};

const settle = async (
  posted: Posted,
  status: "aborted" | "completed" = "completed",
): Promise<void> => {
  posted.note();
  posted.resolve(status);
  await flush();
};

const finishWave = async (): Promise<void> => {
  await settle(take());
  await settle(take());
};

const run = (input: RunInput = {}): Promise<DatasetList> =>
  handleDistribution(
    new AbortController().signal,
    "graph-hash",
    grid,
    input.now ?? 1_700_000_000_000,
    worker,
    input.samples ?? 4,
    input.dataLength ?? 3,
    input.weeksSince ?? 2,
    input.render ?? "Quantile",
    input.character ?? "price",
    input.showModel ?? false,
    input.sourceHash ?? "source",
  );

const finish = async (pending: Promise<DatasetList>): Promise<DatasetList> => {
  await finishWave();
  return pending;
};

afterEach(async () => {
  for (let guard = 0; posts.length > 0 && guard < 8; guard += 1) {
    const posted = take();
    posted.note();
    posted.resolve("aborted");
    await flush();
  }
});

const point = (series: DatasetList, band: number, week: number): { x: number; y: number } => {
  const row = series[band];
  if (row === undefined) throw new Error(`missing band ${band}`);
  const item = row.data[week];
  if (item === undefined) throw new Error(`missing week ${week}`);
  const x = item.x;
  const y = item.y;
  if (typeof x !== "number" || typeof y !== "number") throw new Error("point is not a number");
  return { x, y };
};

test("a new day moves the dates and does not rerun the workers", async () => {
  const now = 1_700_000_000_000;
  const first = await finish(run({ now, sourceHash: "day-price" }));
  const started = calls;
  const later = now + MS_PER_WEEK;
  const second = await run({ now: later, sourceHash: "day-price" });

  expect(calls).toBe(started);
  expect(first.length).toBe(9);
  expect(point(first, 0, 0).x).toBe(now);
  expect(point(second, 0, 1).x).toBe(later + MS_PER_WEEK);
  expect(point(second, 4, 2).y).toBe(point(first, 4, 2).y);
  expect(first[0]?.yAxisID).toBe("y");
});

test("quantile then normal then quantile reuses the stored quantile bands", async () => {
  const sourceHash = "toggle-price";
  const quantile = await finish(run({ render: "Quantile", sourceHash }));
  const afterQuantile = calls;
  const normal = await finish(run({ render: "Normal", sourceHash }));
  expect(calls).toBe(afterQuantile + 2);
  expect(seen.at(-1)?.type).toBe("RUN_DISTRIBUTION_NORMAL");
  expect(normal.length).toBe(7);

  const again = await run({ now: 1_800_000_000_000, render: "Quantile", sourceHash });
  expect(calls).toBe(afterQuantile + 2);
  expect(again.length).toBe(9);
  expect(point(again, 0, 0).y).toBe(point(quantile, 0, 0).y);
  expect(point(again, 8, 2).x).toBe(1_800_000_000_000 + 2 * MS_PER_WEEK);
});

test("none and a shown model return no bands and keep the stored ones", async () => {
  const sourceHash = "keep-price";
  const stored = await finish(run({ sourceHash }));
  const started = calls;

  expect(await run({ render: "None", sourceHash })).toEqual([]);
  expect(await run({ showModel: true, sourceHash })).toEqual([]);
  expect(calls).toBe(started);

  const again = await run({ sourceHash });
  expect(calls).toBe(started);
  expect(point(again, 1, 1).y).toBe(point(stored, 1, 1).y);
});

test("a new source hash misses that chart and leaves the other chart stored", async () => {
  const price = await finish(run({ character: "price", sourceHash: "sim-a" }));
  const drawdownPending = run({ character: "drawdown", showModel: false, sourceHash: "vol-a" });
  const group = posts[0]?.task;
  if (group === undefined || group.type !== "RUN_DISTRIBUTION_GROUP") {
    throw new Error("missing group task");
  }
  expect(group.payload.getZero).toBe(true);
  const drawdown = await finish(drawdownPending);
  expect(drawdown[0]?.yAxisID).toBe("y1");
  const started = calls;

  expect(await run({ character: "drawdown", showModel: true, sourceHash: "vol-a" })).toEqual([]);
  const shown = await run({ character: "drawdown", showModel: false, sourceHash: "vol-a" });
  expect(calls).toBe(started);
  expect(point(shown, 0, 0).y).toBe(point(drawdown, 0, 0).y);

  await finish(run({ character: "drawdown", sourceHash: "vol-b" }));
  expect(calls).toBe(started + 2);
  const priceAgain = await run({ character: "price", sourceHash: "sim-a" });
  expect(calls).toBe(started + 2);
  expect(point(priceAgain, 0, 0).y).toBe(point(price, 0, 0).y);

  await finish(run({ character: "price", sourceHash: "sim-b" }));
  expect(calls).toBe(started + 4);
});

test("a longer week count appends and a shorter one clips", async () => {
  const sourceHash = "size-price";
  const first = await finish(run({ dataLength: 3, samples: 4, sourceHash, weeksSince: 2 }));
  const started = calls;
  const firstY = point(first, 0, 0).y;

  const longerPending = run({ dataLength: 5, samples: 4, sourceHash, weeksSince: 2 });
  const group = posts[0]?.task;
  if (group === undefined || group.type !== "RUN_DISTRIBUTION_GROUP") {
    throw new Error("missing group task");
  }
  expect(group.payload.dataLength).toBe(2);
  expect(group.payload.weeksSince).toBe(5);
  const longer = await finish(longerPending);
  const stat = seen.at(-1);
  if (stat === undefined || stat.type !== "RUN_DISTRIBUTION_QUANTILE") {
    throw new Error("missing quantile task");
  }
  expect(stat.payload.task.startIndex).toBe(0);
  expect(stat.payload.task.endIndex).toBe(2);
  expect(calls).toBe(started + 2);
  expect(longer[0]?.data.length).toBe(5);
  expect(point(longer, 0, 0).y).toBe(firstY);
  expect(point(longer, 0, 3).y === firstY).toBe(false);

  const clipped = await run({ dataLength: 2, samples: 4, sourceHash, weeksSince: 2 });
  expect(calls).toBe(started + 2);
  expect(clipped[0]?.data.length).toBe(2);
  expect(point(clipped, 0, 0).y).toBe(firstY);

  await finish(run({ dataLength: 2, samples: 5, sourceHash, weeksSince: 2 }));
  expect(calls).toBe(started + 4);
  await finish(run({ dataLength: 2, samples: 4, sourceHash, weeksSince: 0 }));
  expect(calls).toBe(started + 6);
});

test("a failed wave does not store bands", async () => {
  const pending = run({ sourceHash: "failed-price" });
  const group = take();
  group.resolve("aborted");
  await flush();
  expect(await pending).toEqual([]);
  group.note();
  await flush();

  const retry = run({ sourceHash: "failed-price" });
  expect(posts.length).toBe(1);
  await finish(retry);
});

test("a failed append leaves the stored weeks", async () => {
  const sourceHash = "append-fail";
  const stored = await finish(run({ dataLength: 3, sourceHash }));
  const pending = run({ dataLength: 5, sourceHash });
  const group = take();
  group.resolve("aborted");
  await flush();
  expect(await pending).toEqual([]);
  group.note();
  await flush();

  const started = calls;
  const again = await run({ dataLength: 3, sourceHash });
  expect(calls).toBe(started);
  expect(point(again, 0, 0).y).toBe(point(stored, 0, 0).y);
  expect(again[0]?.data.length).toBe(3);
});

test("an appended band waits for the new weeks", async () => {
  const sourceHash = "wait-price";
  await finish(run({ dataLength: 3, samples: 4, sourceHash }));
  const slot = bufferSlots.price.grouped;
  const held = acquire(slot, Float64Array.BYTES_PER_ELEMENT);
  const spare = acquire(slot, Float64Array.BYTES_PER_ELEMENT);
  if (held === null || spare === null) throw new Error("missing loan");
  const controller = new AbortController();
  const pending = handleDistribution(
    controller.signal,
    "graph-hash",
    grid,
    1_700_000_000_000,
    worker,
    4,
    5,
    2,
    "Quantile",
    "price",
    false,
    sourceHash,
  );
  await flush();
  try {
    expect(slot.waiter?.bytes).toBe(Float64Array.BYTES_PER_ELEMENT * 2 * 4);
    controller.abort();
    expect(await pending).toEqual([]);
  } finally {
    held.release();
    spare.release();
  }
});

test("a week count past the task cap fails and the next chart still runs", async () => {
  const pending = run({
    character: "drawdown",
    dataLength: 10_241,
    samples: 4,
    sourceHash: "over-cap",
  });
  let rejected = "";
  pending.catch((error: unknown) => {
    rejected = error instanceof Error ? error.message : "not an error";
  });

  await settle(take());
  expect(rejected).toBe("Too many samples needed. Maximum allowed: 10240");
  expect(posts.length).toBe(0);

  const again = await finish(
    run({
      character: "drawdown",
      dataLength: 2,
      samples: 4,
      sourceHash: "over-cap-again",
    }),
  );
  expect(again.length).toBe(9);
});
