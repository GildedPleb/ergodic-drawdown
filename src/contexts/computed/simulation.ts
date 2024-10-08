/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/prefer-add-event-listener */
/* eslint-disable security/detect-object-injection */

import type GrowableSharedArray from "../../classes/growable-shared-array";
import { createTaskQueue } from "../../helpers";
import { type Full } from "../../types";
import { type WorkerContextType } from "../workers";
import {
  type RunSimulationEvent,
  type SupplementedTask,
} from "../workers/types";

export const handleSimulation = async (
  signal: AbortSignal,
  _hash: string,
  currentPrice: number,
  minArray: Float64Array[],
  maxArray: Float64Array[],
  epochCount: number,
  simulationData: GrowableSharedArray,
  samples: number,
  worker: WorkerContextType,
  weeksSince: number,
  full: Full,
  fullHash: string,
  // eslint-disable-next-line max-params
): Promise<string> => {
  const returnHash = fullHash + epochCount + samples;
  const [validWidth, validHeight] = simulationData.getValidity(fullHash);
  simulationData.resize(epochCount, samples);
  if (validHeight === 0) simulationData.clear();
  const needTasksForWidth = validWidth === 0 || validWidth < epochCount;

  const taskQueueEpochs: SupplementedTask[] = needTasksForWidth
    ? createTaskQueue(validHeight, worker.count, samples, 0).map((task) => ({
        ...task,
        startEpoch: validWidth,
      }))
    : [];

  const taskQueueSamples = createTaskQueue(
    samples,
    worker.count,
    samples,
    validHeight,
  );

  // eslint-disable-next-line unicorn/prefer-spread
  const taskQueue = taskQueueEpochs.concat(taskQueueSamples);
  if (taskQueue.length === 0) {
    return "no tasks:" + returnHash;
  }

  const bufferState = simulationData.exportState();
  const processedTasks = taskQueue.map((task) => {
    return {
      payload: {
        bufferState,
        currentPrice,
        epochCount,
        full,
        maxArray,
        minArray,
        samples,
        task,
        weeksSince,
      },
      type: "RUN_PRICE_SIMULATION",
    } satisfies RunSimulationEvent;
  });

  const results = await worker.addTasks(processedTasks, signal);
  if (results.some((result) => result.status !== "completed")) {
    // console.log("Results failed");
    return "failed:" + returnHash;
  }

  console.log("simulation success");
  simulationData.setValidity(fullHash);
  return "success:" + returnHash;
};
