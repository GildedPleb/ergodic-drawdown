/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/prefer-add-event-listener */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import { type ProviderProperties } from "../types";
import {
  type QueueTask,
  type TaskResult,
  type TaskStatus,
  type WorkerEvent,
  type WorkerTasks,
} from "./workers/types";

const WORKER_COUNT =
  navigator.hardwareConcurrency === 0 ? 4 : navigator.hardwareConcurrency;

// eslint-disable-next-line functional/no-mixed-types
export interface WorkerContextType {
  addTasks: (
    tasks: WorkerTasks[],
    signal: AbortSignal,
  ) => Promise<TaskResult[]>;
  count: number;
}

interface WorkerWithId extends Worker {
  workerId: number;
}

// eslint-disable-next-line unicorn/no-null
const WorkerContext = createContext<WorkerContextType | null>(null);

const createWorkerPool = (): WorkerWithId[] => {
  return Array.from({ length: WORKER_COUNT }, (_, index): WorkerWithId => {
    const worker = new Worker(new URL("workers/index.ts", import.meta.url), {
      type: "module",
    }) as WorkerWithId;
    worker.workerId = index;
    return worker;
  });
};

export const WorkerProvider: React.FC<ProviderProperties> = ({ children }) => {
  const workersReference = useRef<WorkerWithId[]>([]);
  const taskQueueReference = useRef<QueueTask[]>([]);
  const activeWorkersReference = useRef<Map<WorkerWithId, QueueTask>>(
    new Map(),
  );
  const callbackMapReference = useRef<
    Map<string, (result: TaskResult) => void>
  >(new Map());

  useEffect(() => {
    workersReference.current = createWorkerPool();

    return () => {
      for (const worker of workersReference.current) worker.terminate();
    };
  }, []);

  const runTask = useCallback((worker: WorkerWithId, task: QueueTask) => {
    activeWorkersReference.current.set(worker, task);
    worker.postMessage({
      ...task,
      workerId: worker.workerId,
    });
  }, []);

  const handleWorkerMessage = useCallback(
    (worker: WorkerWithId, event: MessageEvent<TaskResult>) => {
      const { id, result, status } = event.data;
      activeWorkersReference.current.delete(worker);

      const completeTask = callbackMapReference.current.get(id);
      if (completeTask !== undefined) {
        completeTask({ id, result, status });
        callbackMapReference.current.delete(id);
      }

      if (taskQueueReference.current.length > 0) {
        const nextTask = taskQueueReference.current.shift();
        if (nextTask !== undefined) runTask(worker, nextTask);
      }
    },
    [runTask],
  );

  useEffect(() => {
    for (const worker of workersReference.current) {
      worker.onmessage = (event: MessageEvent<TaskResult>) => {
        handleWorkerMessage(worker, event);
      };
    }
  }, [handleWorkerMessage]);

  const addTasks = useCallback(
    async (tasksData: WorkerTasks[], signal: AbortSignal) => {
      return new Promise<TaskResult[]>((resolve) => {
        const taskIds = new Set<string>();
        const tasks = tasksData.map((data) => {
          const id = Date.now() + Math.random().toString(36).slice(2, 9);
          taskIds.add(id);
          return {
            data,
            id,
            status: "pending" as TaskStatus,
          };
        });

        const results: TaskResult[] = [];
        let completedCount = 0;

        const handleTaskCompletion = (result: TaskResult): void => {
          results.push(result);
          completedCount++;
          taskIds.delete(result.id);
          if (completedCount === tasks.length) {
            resolve(results);
          }
        };

        const abortTasks = (): void => {
          console.warn(
            "Aborting tasks for this specific call to addTasks",
            tasksData,
          );

          // Abort active tasks for this specific call
          for (const [
            worker,
            task,
          ] of activeWorkersReference.current.entries()) {
            if (taskIds.has(task.id)) {
              worker.postMessage({
                data: { type: "ABORT" },
                id: task.id,
                status: "pending",
                workerId: worker.workerId,
              } satisfies WorkerEvent);
              task.status = "aborted";
              activeWorkersReference.current.delete(worker);
            }
          }

          // Mark queued tasks for this call as aborted and remove them
          taskQueueReference.current = taskQueueReference.current.filter(
            (task) => {
              if (taskIds.has(task.id)) {
                task.status = "aborted";
                const handler = callbackMapReference.current.get(task.id);
                if (handler !== undefined) {
                  handler({
                    id: task.id,
                    result: { type: "ABORTED" },
                    status: "aborted",
                  });
                  callbackMapReference.current.delete(task.id);
                }
                return false;
              }
              return true;
            },
          );

          // Resolve remaining tasks as aborted
          for (const id of taskIds) {
            const handler = callbackMapReference.current.get(id);
            if (handler !== undefined) {
              handler({
                id,
                result: { type: "ABORTED" },
                status: "aborted",
              });
              callbackMapReference.current.delete(id);
            }
          }
          resolve(results);
        };

        if (signal.aborted) {
          abortTasks();
          return;
        }

        signal.addEventListener("abort", abortTasks);

        for (const task of tasks) {
          callbackMapReference.current.set(task.id, handleTaskCompletion);
        }

        taskQueueReference.current.push(...tasks);

        while (
          activeWorkersReference.current.size <
            workersReference.current.length &&
          taskQueueReference.current.length > 0
        ) {
          const availableWorker = workersReference.current.find(
            (worker) => !activeWorkersReference.current.has(worker),
          );
          if (availableWorker !== undefined) {
            const task = taskQueueReference.current.shift();
            if (task !== undefined) runTask(availableWorker, task);
          }
        }
      });
    },
    [runTask],
  );

  const contextValue = useRef({
    addTasks,
    count: WORKER_COUNT,
  } satisfies WorkerContextType).current;

  return (
    <WorkerContext.Provider value={contextValue}>
      {children}
    </WorkerContext.Provider>
  );
};

export const useWorker = (): WorkerContextType => {
  const context = useContext(WorkerContext);
  if (context === null) {
    throw new Error("useWorker must be used within a WorkerProvider");
  }
  return context;
};
