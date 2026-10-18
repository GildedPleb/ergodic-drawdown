import {
  type QueueTask,
  type TaskResult,
  type WorkerEvent,
  type WorkerTasks,
} from "../../contexts/workers/types";

interface PoolWorker {
  postMessage(message: WorkerEvent): void;
  readonly workerId: number;
}

export interface Scheduler {
  addTasks(
    tasks: WorkerTasks[],
    signal: AbortSignal,
    onKernelSettled?: () => void,
  ): Promise<TaskResult[]>;
  dispose(): void;
  handleMessage(worker: PoolWorker, message: TaskResult): void;
}

const abortedResult = (id: string): TaskResult => ({
  id,
  result: { type: "ABORTED" },
  status: "aborted",
});

export const createScheduler = (workers: readonly PoolWorker[], board: Uint32Array): Scheduler => {
  const sharedBoard = board.buffer;
  if (!(sharedBoard instanceof SharedArrayBuffer)) {
    throw new Error("cancel board is not shared");
  }

  const active = new Map<PoolWorker, QueueTask>();
  const callbacks = new Map<string, (result: TaskResult) => void>();
  const kernelNote = new Map<string, () => void>();
  const taskQueue: QueueTask[] = [];
  let closed = false;
  let serial = 0;
  let ticket = 0;

  const publish = (slot: number): number => {
    ticket += 1;
    Atomics.store(board, slot, ticket);
    return ticket;
  };

  const runTask = (worker: PoolWorker, task: QueueTask): void => {
    const generation = publish(worker.workerId);
    active.set(worker, task);
    // The board stays on the main thread. Transferring it would detach the cancel flag.
    worker.postMessage({
      ...task,
      board: sharedBoard,
      generation,
      workerId: worker.workerId,
    });
  };

  const settleAborted = (id: string): void => {
    const handler = callbacks.get(id);
    if (handler === undefined) return;
    handler(abortedResult(id));
  };

  // Abort resolves the caller while the kernel is still writing. This fires once
  // every task has replied, or was dropped before postMessage.
  const noteKernel = (id: string): void => {
    const note = kernelNote.get(id);
    if (note === undefined) return;
    kernelNote.delete(id);
    note();
  };

  const watchKernels = (ids: readonly string[], onKernelSettled?: () => void): void => {
    if (onKernelSettled === undefined) return;
    if (ids.length === 0) {
      onKernelSettled();
      return;
    }
    let remaining = ids.length;
    for (const id of ids) {
      kernelNote.set(id, () => {
        remaining -= 1;
        if (remaining === 0) onKernelSettled();
      });
    }
  };

  const dispatch = (): void => {
    if (closed) return;
    while (active.size < workers.length && taskQueue.length > 0) {
      const worker = workers.find((candidate) => !active.has(candidate));
      if (worker === undefined) return;
      const task = taskQueue.shift();
      if (task === undefined) return;
      runTask(worker, task);
    }
  };

  const handleMessage = (worker: PoolWorker, message: TaskResult): void => {
    if (closed) return;
    const current = active.get(worker);
    if (current === undefined || current.id !== message.id) return;

    active.delete(worker);
    const callback = callbacks.get(message.id);
    if (callback !== undefined) {
      callbacks.delete(message.id);
      callback(message);
    }
    noteKernel(message.id);

    const next = taskQueue.shift();
    if (next !== undefined) runTask(worker, next);
  };

  const addTasks = (
    tasksData: WorkerTasks[],
    signal: AbortSignal,
    onKernelSettled?: () => void,
  ): Promise<TaskResult[]> => {
    if (closed) {
      console.warn("Aborting tasks for this specific call to addTasks", tasksData);
      onKernelSettled?.();
      return Promise.resolve(
        tasksData.map(() => {
          const id = `${Date.now().toString(36)}-${serial.toString(36)}`;
          serial += 1;
          return abortedResult(id);
        }),
      );
    }

    return new Promise((resolve) => {
      const taskIds = new Set<string>();
      const tasks = tasksData.map((data) => {
        const id = `${Date.now().toString(36)}-${serial.toString(36)}`;
        serial += 1;
        taskIds.add(id);
        return {
          data,
          id,
          status: "pending",
        } satisfies QueueTask;
      });
      const results: TaskResult[] = [];
      let completedCount = 0;

      const handleTaskCompletion = (result: TaskResult): void => {
        results.push(result);
        completedCount += 1;
        taskIds.delete(result.id);
        callbacks.delete(result.id);
        if (completedCount === tasks.length) {
          signal.removeEventListener("abort", abortTasks);
          resolve(results);
        }
      };

      const abortTasks = (): void => {
        if (closed) return;
        console.warn("Aborting tasks for this specific call to addTasks", tasksData);

        taskQueue.splice(
          0,
          taskQueue.length,
          ...taskQueue.filter((task) => {
            if (!taskIds.has(task.id)) return true;
            task.status = "aborted";
            settleAborted(task.id);
            noteKernel(task.id);
            return false;
          }),
        );

        for (const [worker, task] of active) {
          if (!taskIds.has(task.id)) continue;
          task.status = "aborted";
          // The kernel is still running. The worker stays busy until its reply matches this id.
          publish(worker.workerId);
          settleAborted(task.id);
        }

        for (const id of taskIds) settleAborted(id);
        resolve(results);
      };

      if (signal.aborted) {
        console.warn("Aborting tasks for this specific call to addTasks", tasksData);
        onKernelSettled?.();
        resolve(tasks.map((task) => abortedResult(task.id)));
        return;
      }

      watchKernels(
        tasks.map((task) => task.id),
        onKernelSettled,
      );
      for (const task of tasks) callbacks.set(task.id, handleTaskCompletion);
      signal.addEventListener("abort", abortTasks, { once: true });
      taskQueue.push(...tasks);
      dispatch();
    });
  };

  const dispose = (): void => {
    if (closed) return;
    closed = true;

    const queued = taskQueue.splice(0);
    for (const task of queued) {
      task.status = "aborted";
      settleAborted(task.id);
      noteKernel(task.id);
    }

    for (const [worker, task] of active) {
      task.status = "aborted";
      publish(worker.workerId);
      settleAborted(task.id);
      // handleMessage ignores replies once closed, so the kernel will not get another note.
      noteKernel(task.id);
    }
    active.clear();
  };

  return { addTasks, dispose, handleMessage };
};
