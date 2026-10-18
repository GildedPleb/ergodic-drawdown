import type { WorkerContextType } from "../../src/contexts/workers/types";
import { handleDrawdownVariable } from "../../src/contexts/workers/drawdown-variable";
import { handleGroup } from "../../src/contexts/workers/group";
import { handleNormal } from "../../src/contexts/workers/normal";
import { handleQuantile } from "../../src/contexts/workers/quantile";
import { handleSimulation } from "../../src/contexts/workers/simulation";
import { type TaskResult, type WorkerTasks } from "../../src/contexts/workers/types";
import { handleVolumeCalculation } from "../../src/contexts/workers/volume";

const runTask = (task: WorkerTasks): void => {
  const signal = { aborted: false };
  switch (task.type) {
    case "RUN_PRICE_SIMULATION":
      handleSimulation(task.payload, signal);
      return;
    case "RUN_DRAWDOWN_VARIABLE":
      handleDrawdownVariable(task.payload, signal);
      return;
    case "RUN_VOLUME":
      handleVolumeCalculation(task.payload, signal);
      return;
    case "RUN_DISTRIBUTION_GROUP":
      handleGroup(task.payload, signal);
      return;
    case "RUN_DISTRIBUTION_QUANTILE":
      handleQuantile(task.payload, signal);
      return;
    case "RUN_DISTRIBUTION_NORMAL":
      handleNormal(task.payload, signal);
      return;
    default: {
      const unexpected: never = task;
      throw new Error(`unknown task ${JSON.stringify(unexpected)}`);
    }
  }
};

export const inProcessWorker = (count = 1): WorkerContextType => ({
  addTasks: (tasks, signal, onKernelSettled) => {
    if (signal.aborted) {
      onKernelSettled?.();
      const aborted: TaskResult[] = tasks.map((_, index) => ({
        id: `aborted-${index.toString(36)}`,
        status: "aborted",
      }));
      return Promise.resolve(aborted);
    }

    const results: TaskResult[] = [];
    try {
      for (const [index, task] of tasks.entries()) {
        runTask(task);
        results.push({ id: `task-${index.toString(36)}`, status: "completed" });
      }
    } catch (error) {
      onKernelSettled?.();
      throw error;
    }
    onKernelSettled?.();
    return Promise.resolve(results);
  },
  count,
});
