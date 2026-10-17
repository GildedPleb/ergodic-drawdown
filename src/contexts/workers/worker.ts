import { cancelSignal } from "./cancel";
import { handleDrawdownVariable } from "./drawdown-variable";
import { handleGroup } from "./group";
import { handleNormal } from "./normal";
import { handleQuantile } from "./quantile";
import { handleSimulation } from "./simulation";
import { type SignalState, type TaskResult, type WorkerEvent } from "./types";
import { handleVolumeCalculation } from "./volume";

const taskQueue: WorkerEvent[] = [];
let isProcessing = false;

const processTask = ({ board, data, generation, id, workerId }: WorkerEvent): void => {
  const signalState: SignalState = cancelSignal(new Uint32Array(board), workerId, generation);

  switch (data.type) {
    case "RUN_PRICE_SIMULATION":
      handleSimulation(data.payload, signalState);
      break;
    case "RUN_DRAWDOWN_VARIABLE":
      handleDrawdownVariable(data.payload, signalState);
      break;
    case "RUN_VOLUME":
      handleVolumeCalculation(data.payload, signalState);
      break;
    case "RUN_DISTRIBUTION_GROUP":
      handleGroup(data.payload, signalState);
      break;
    case "RUN_DISTRIBUTION_QUANTILE":
      handleQuantile(data.payload, signalState);
      break;
    case "RUN_DISTRIBUTION_NORMAL":
      handleNormal(data.payload, signalState);
      break;
    default: {
      const unexpected: never = data;
      throw new Error(`unknown task ${JSON.stringify(unexpected)}`);
    }
  }

  self.postMessage({
    id,
    status: signalState.aborted ? "aborted" : "completed",
  } satisfies TaskResult);
};

const processQueue = (): void => {
  if (taskQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const task = taskQueue.shift();
  if (task === undefined) {
    isProcessing = false;
    return;
  }

  try {
    processTask(task);
  } catch (error) {
    console.error("Error processing task:", error);
    self.postMessage({
      id: task.id,
      status: "aborted",
    } satisfies TaskResult);
  }

  processQueue();
};

self.addEventListener("message", (event: MessageEvent<WorkerEvent>) => {
  taskQueue.push(event.data);
  if (!isProcessing) processQueue();
});
