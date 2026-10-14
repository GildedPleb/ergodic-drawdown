import { handleDrawdownVariable } from "./drawdown-variable";
import { handleGroup } from "./group";
import { handleNormal } from "./normal";
import { handleQuantile } from "./quantile";
import { handleSimulation } from "./simulation";
import { type TaskResult, type WorkerEvent } from "./types";
import { handleVolumeCalculation } from "./volume";

const taskQueue: WorkerEvent[] = [];
let isProcessing = false;
const signalState = { aborted: false };

const processTask = ({ data, id }: WorkerEvent): void => {
  if (data.type === "RUN_PRICE_SIMULATION") {
    handleSimulation(data.payload, signalState);
    self.postMessage({
      id,
      status: "completed",
    } satisfies TaskResult);
  }
  if (data.type === "RUN_DRAWDOWN_VARIABLE") {
    handleDrawdownVariable(data.payload, signalState);
    self.postMessage({
      id,
      status: "completed",
    } satisfies TaskResult);
  }
  if (data.type === "RUN_VOLUME") {
    handleVolumeCalculation(data.payload, signalState);
    self.postMessage({
      id,
      status: "completed",
    } satisfies TaskResult);
  }
  if (data.type === "RUN_DISTRIBUTION_GROUP") {
    handleGroup(data.payload, signalState);
    self.postMessage({
      id,
      status: "completed",
    } satisfies TaskResult);
  }
  if (data.type === "RUN_DISTRIBUTION_QUANTILE") {
    handleQuantile(data.payload, signalState);
    self.postMessage({
      id,
      status: "completed",
    } satisfies TaskResult);
  }
  if (data.type === "RUN_DISTRIBUTION_NORMAL") {
    handleNormal(data.payload, signalState);
    self.postMessage({
      id,
      status: "completed",
    } satisfies TaskResult);
  }
  if (data.type === "ABORT") {
    isProcessing = false;
    signalState.aborted = false;
    self.postMessage({
      id,
      status: "aborted",
    } satisfies TaskResult);
  }
};

const processQueue = (): void => {
  if (taskQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const task = taskQueue.shift()!;

  try {
    processTask(task);
  } catch (error) {
    console.error("Error processing task:", error);
  }

  processQueue();
};

self.addEventListener("message", (event: MessageEvent<WorkerEvent>) => {
  if (event.data.data.type === "ABORT") {
    signalState.aborted = true;
  }
  taskQueue.push(event.data);
  if (!isProcessing) {
    processQueue();
  }
});
