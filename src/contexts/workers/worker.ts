/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable functional/functional-parameters */

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

const processTask = ({ data, id /* workerId */ }: WorkerEvent): void => {
  // const taskId = hashSum(Math.random());
  // const fullId = ` Worker ${workerId} on ${id} @ ${Date.now()}`;

  // if (workerId === 0)
  // console.time(data.type + fullId);

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
  // if (workerId === 0)
  // console.timeEnd(data.type + fullId);
};

const processQueue = (): void => {
  if (taskQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const task = taskQueue.shift()!;

  try {
    processTask(task);
  } catch (error) {
    console.error("Error processing task:", error);
  }

  processQueue();
};

// eslint-disable-next-line unicorn/prefer-add-event-listener
self.onmessage = (event: MessageEvent<WorkerEvent>) => {
  if (event.data.data.type === "ABORT") {
    signalState.aborted = true;
  }
  taskQueue.push(event.data);
  if (!isProcessing) {
    processQueue();
  }
};
