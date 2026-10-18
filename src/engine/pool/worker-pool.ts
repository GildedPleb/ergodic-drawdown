import { cancelBoard } from "./cancel";
import { createScheduler, type Scheduler } from "./scheduler";
import {
  type TaskResult,
  type WorkerContextType,
  type WorkerTasks,
} from "../../contexts/workers/types";

export interface TaskNote {
  endIndex: number;
  startIndex: number;
  type: string;
}

interface WorkerWithId extends Worker {
  workerId: number;
}

interface HeldTasks {
  onAbort: () => void;
  onKernelSettled?: () => void;
  resolve: (results: TaskResult[]) => void;
  signal: AbortSignal;
  tasks: WorkerTasks[];
}

const abortedNow = (tasks: readonly WorkerTasks[]): TaskResult[] =>
  tasks.map((_, index) => ({
    id: `unready-${index.toString(36)}`,
    result: { type: "ABORTED" },
    status: "aborted",
  }));

export const resolvePoolCount = (requested: number | undefined): number => {
  if (requested === 0) return 4;
  if (requested !== undefined) return requested;
  const hardware = navigator.hardwareConcurrency;
  return hardware === 0 ? 4 : hardware;
};

export interface WorkerPool {
  readonly count: number;
  readonly worker: WorkerContextType;
  dispose(): void;
}

export const createWorkerPool = (count: number): WorkerPool => {
  const workers: WorkerWithId[] = Array.from({ length: count }, (_, index) =>
    Object.assign(
      new Worker(new URL("../../contexts/workers/worker.ts", import.meta.url), { type: "module" }),
      { workerId: index },
    ),
  );
  const scheduler: Scheduler = createScheduler(workers, cancelBoard(workers.length));
  const held: HeldTasks[] = [];
  let open = false;

  const addTasks: WorkerContextType["addTasks"] = (tasks, signal, onKernelSettled) => {
    if (open) return scheduler.addTasks(tasks, signal, onKernelSettled);

    return new Promise<TaskResult[]>((resolve) => {
      if (signal.aborted) {
        console.warn("Aborting tasks for this specific call to addTasks", tasks);
        onKernelSettled?.();
        resolve(abortedNow(tasks));
        return;
      }

      const pending: HeldTasks = {
        onAbort: () => undefined,
        resolve,
        signal,
        tasks,
      };
      if (onKernelSettled !== undefined) pending.onKernelSettled = onKernelSettled;
      pending.onAbort = () => {
        const index = held.indexOf(pending);
        if (index < 0) return;
        held.splice(index, 1);
        console.warn("Aborting tasks for this specific call to addTasks", tasks);
        pending.onKernelSettled?.();
        resolve(abortedNow(tasks));
      };
      signal.addEventListener("abort", pending.onAbort, { once: true });
      held.push(pending);
    });
  };

  const bindings = workers.map((worker) => {
    const listener = (event: MessageEvent<TaskResult>): void => {
      scheduler.handleMessage(worker, event.data);
    };
    worker.addEventListener("message", listener);
    return { listener, worker };
  });

  const waiting = held.splice(0);
  open = true;
  for (const pending of waiting) {
    pending.signal.removeEventListener("abort", pending.onAbort);
    if (pending.signal.aborted) {
      pending.onKernelSettled?.();
      pending.resolve(abortedNow(pending.tasks));
      continue;
    }
    void scheduler
      .addTasks(pending.tasks, pending.signal, pending.onKernelSettled)
      .then(pending.resolve);
  }

  return {
    count,
    dispose: () => {
      open = false;
      const abandoned = held.splice(0);
      for (const pending of abandoned) {
        pending.signal.removeEventListener("abort", pending.onAbort);
        pending.onKernelSettled?.();
        pending.resolve(abortedNow(pending.tasks));
      }
      scheduler.dispose();
      for (const { listener, worker } of bindings) {
        worker.removeEventListener("message", listener);
      }
      for (const worker of workers) worker.terminate();
    },
    worker: { addTasks, count },
  };
};

export const attachNotes = (worker: WorkerContextType, notes: TaskNote[]): WorkerContextType => ({
  addTasks: (tasks, signal, onKernelSettled) => {
    for (const task of tasks) {
      notes.push({
        endIndex: task.payload.task.endIndex,
        startIndex: task.payload.task.startIndex,
        type: task.type,
      });
    }
    return worker.addTasks(tasks, signal, onKernelSettled);
  },
  count: worker.count,
});
