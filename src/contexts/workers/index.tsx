import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";

import { type ProviderProperties } from "../../types";
import { cancelBoard } from "./cancel";
import { createScheduler, type Scheduler } from "./scheduler";
import { type TaskResult, type WorkerTasks } from "./types";

const WORKER_COUNT = navigator.hardwareConcurrency === 0 ? 4 : navigator.hardwareConcurrency;

export interface WorkerContextType {
  addTasks: (
    tasks: WorkerTasks[],
    signal: AbortSignal,
    onKernelSettled?: () => void,
  ) => Promise<TaskResult[]>;
  count: number;
}

interface WorkerWithId extends Worker {
  workerId: number;
}

const WorkerContext = createContext<WorkerContextType | null>(null);

const createWorkerPool = (): WorkerWithId[] => {
  return Array.from({ length: WORKER_COUNT }, (_, index) =>
    Object.assign(new Worker(new URL("worker.ts", import.meta.url), { type: "module" }), {
      workerId: index,
    }),
  );
};

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

export const WorkerProvider: React.FC<ProviderProperties> = ({ children }) => {
  const schedulerReference = useRef<Scheduler | null>(null);
  const heldReference = useRef<HeldTasks[]>([]);

  const addTasks = useCallback(
    (tasks: WorkerTasks[], signal: AbortSignal, onKernelSettled?: () => void) => {
      const scheduler = schedulerReference.current;
      if (scheduler !== null) return scheduler.addTasks(tasks, signal, onKernelSettled);

      return new Promise<TaskResult[]>((resolve) => {
        if (signal.aborted) {
          console.warn("Aborting tasks for this specific call to addTasks", tasks);
          onKernelSettled?.();
          resolve(abortedNow(tasks));
          return;
        }

        const held: HeldTasks = {
          onAbort: () => undefined,
          resolve,
          signal,
          tasks,
        };
        if (onKernelSettled !== undefined) held.onKernelSettled = onKernelSettled;
        held.onAbort = () => {
          const pending = heldReference.current;
          const index = pending.indexOf(held);
          if (index < 0) return;
          pending.splice(index, 1);
          console.warn("Aborting tasks for this specific call to addTasks", tasks);
          held.onKernelSettled?.();
          resolve(abortedNow(tasks));
        };
        signal.addEventListener("abort", held.onAbort, { once: true });
        heldReference.current.push(held);
      });
    },
    [],
  );

  useEffect(() => {
    const workers = createWorkerPool();
    const scheduler = createScheduler(workers, cancelBoard(workers.length));
    schedulerReference.current = scheduler;

    const waiting = heldReference.current.splice(0);
    for (const held of waiting) {
      held.signal.removeEventListener("abort", held.onAbort);
      if (held.signal.aborted) {
        held.onKernelSettled?.();
        held.resolve(abortedNow(held.tasks));
        continue;
      }
      void scheduler.addTasks(held.tasks, held.signal, held.onKernelSettled).then(held.resolve);
    }

    const bindings = workers.map((worker) => {
      const listener = (event: MessageEvent<TaskResult>): void => {
        scheduler.handleMessage(worker, event.data);
      };
      worker.addEventListener("message", listener);
      return { listener, worker };
    });

    return () => {
      schedulerReference.current = null;
      const abandoned = heldReference.current.splice(0);
      for (const held of abandoned) {
        held.signal.removeEventListener("abort", held.onAbort);
        held.onKernelSettled?.();
        held.resolve(abortedNow(held.tasks));
      }
      scheduler.dispose();
      for (const { listener, worker } of bindings) {
        worker.removeEventListener("message", listener);
      }
      for (const worker of workers) worker.terminate();
    };
  }, []);

  const contextValue = useRef({
    addTasks,
    count: WORKER_COUNT,
  } satisfies WorkerContextType).current;

  return <WorkerContext.Provider value={contextValue}>{children}</WorkerContext.Provider>;
};

export const useWorker = (): WorkerContextType => {
  const context = useContext(WorkerContext);
  if (context === null) {
    throw new Error("useWorker must be used within a WorkerProvider");
  }
  return context;
};
