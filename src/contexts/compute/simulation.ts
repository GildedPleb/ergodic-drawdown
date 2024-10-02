/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/prefer-add-event-listener */
/* eslint-disable security/detect-object-injection */

import type SharedArrayPool from "../../classes/shared-stack-cache-pool";
import { createTaskQueue } from "../../helpers";
import { type Full } from "../../types";
import { type WorkerContextType } from "../workers";
import {
  type RunSimulationEvent,
  type SupplementedTask,
} from "../workers/types";

export const useSimulation = async (
  signal: AbortSignal,
  _hash: string,
  currentPrice: number,
  [minArray, logMinArray]: Float64Array[],
  [maxArray, logMaxArray]: Float64Array[],
  epochCount: number,
  priceDataPool: SharedArrayPool,
  samples: number,
  worker: WorkerContextType,
  weeksSince: number,
  full: Full,
  fullHash: string,
  // eslint-disable-next-line max-params
): Promise<Float64Array[]> => {
  console.time("PERFORMANCE TEST");

  const [validWidth, validHeight] = priceDataPool.getValidity(fullHash);
  priceDataPool.resize(epochCount, samples);
  if (validHeight === 0) priceDataPool.clear();
  const needTasksForWidth = validWidth === 0 || validWidth < epochCount;

  const taskQueueEpochs: SupplementedTask[] = needTasksForWidth
    ? createTaskQueue(validHeight, worker.count, 1000, 0).map((task) => ({
        ...task,
        startEpoch: validWidth,
      }))
    : [];

  const taskQueueSamples = createTaskQueue(
    samples,
    worker.count,
    1000,
    validHeight,
  );

  // eslint-disable-next-line unicorn/prefer-spread
  const taskQueue = taskQueueEpochs.concat(taskQueueSamples);
  if (taskQueue.length === 0) {
    console.log("SIMULATION NO TASKS");
    console.timeEnd("PERFORMANCE TEST");
    return priceDataPool.coalesce(weeksSince);
  }

  const sharedPriceBuffers = priceDataPool
    .getArrays()
    .map((array) => array.getSharedBuffer());
  const processedTasks = taskQueue.map((task) => {
    return {
      payload: {
        currentPrice,
        epochCount,
        full,
        logMaxArray,
        logMinArray,
        maxArray,
        minArray,
        samples,
        sharedBuffer: sharedPriceBuffers[task.arrayIndex],
        task,
        weeksSince,
      },
      type: "RUN_PRICE_SIMULATION",
    } satisfies RunSimulationEvent;
  });

  const results = await worker.addTasks(processedTasks, signal);
  if (results.some((result) => result.status !== "completed")) {
    // console.log("Results failed");
    console.timeEnd("PERFORMANCE TEST");
    return [];
  }

  const newData = priceDataPool.coalesce(weeksSince);
  if (newData.length === 0) {
    // console.log("simulation yielded no data");
    console.timeEnd("PERFORMANCE TEST");
    return [];
  }
  // console.log("simulation success", newData);
  priceDataPool.setValidity(fullHash);
  console.timeEnd("PERFORMANCE TEST");
  return newData;
};
