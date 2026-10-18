import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { cancelBoard } from "../src/engine/pool/cancel";
import { createScheduler } from "../src/engine/pool/scheduler";
import { type TaskResult, type WorkerEvent, type WorkerTasks } from "../src/contexts/workers/types";

const emptyGrid = (): WorkerTasks => {
  const grid = new GrowableSharedArray(1, 1, 1, new SharedArrayBuffer(8));
  return {
    payload: {
      buffer: grid.exportState(),
      dataLength: 1,
      getZero: false,
      groupedDataBuffer: new SharedArrayBuffer(8),
      samples: 1,
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      weeksSince: 0,
    },
    type: "RUN_DISTRIBUTION_GROUP",
  };
};

test("a thrown kernel posts an aborted result and settles the note", async () => {
  const kernel = new Worker(new URL("../src/contexts/workers/worker.ts", import.meta.url), {
    type: "module",
  });
  const inbox: WorkerEvent[] = [];
  const worker = {
    inbox,
    postMessage(message: WorkerEvent) {
      inbox.push(message);
    },
    workerId: 0,
  };
  const scheduler = createScheduler([worker], cancelBoard(1));
  let settled = 0;
  const pending = scheduler.addTasks([emptyGrid()], new AbortController().signal, () => {
    settled += 1;
  });
  const posted = inbox[0];
  if (posted === undefined) throw new Error("kernel was not posted");

  const reply = new Promise<TaskResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("kernel posted nothing"));
    }, 1000);
    kernel.addEventListener("message", (event: MessageEvent<TaskResult>) => {
      clearTimeout(timer);
      resolve(event.data);
    });
    kernel.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("kernel reported the throw instead of a result"));
    });
  });

  try {
    kernel.postMessage(posted);
    const result = await reply;
    expect(result.id).toBe(posted.id);
    expect(result.status).toBe("aborted");
    scheduler.handleMessage(worker, result);
    expect(settled).toBe(1);
    expect((await pending)[0]?.status).toBe("aborted");
  } finally {
    kernel.terminate();
  }
});
