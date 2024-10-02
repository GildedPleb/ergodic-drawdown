/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/prefer-add-event-listener */
/* eslint-disable security/detect-object-injection */

import type SharedArrayPool from "../../classes/shared-stack-cache-pool";
import { createTaskQueue } from "../../helpers";
import { type Full } from "../../types";
import { type WorkerContextType } from "../workers";
import { type RunSimulationEvent } from "../workers/types";

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
  const [validWidth, validHeight] = priceDataPool.getValidity(fullHash);
  priceDataPool.resizeHeight(samples);
  priceDataPool.resizeWidth(epochCount);
  if (validHeight === 0) priceDataPool.clear();
  const needTasksForWidth = validWidth === 0 || validWidth < epochCount;

  const taskQueueEpochs = needTasksForWidth
    ? createTaskQueue(validHeight, worker.count, 1000, 0)
    : [];
  const taskQueueSamples = createTaskQueue(
    samples,
    worker.count,
    1000,
    validHeight,
  );

  // eslint-disable-next-line unicorn/prefer-spread
  const taskQueue = taskQueueEpochs.concat(taskQueueSamples);
  const taskCount = taskQueue.length;
  // console.log({
  //   needTasksForWidth,
  //   taskQueue,
  //   taskQueueEpochs,
  //   taskQueueSamples,
  //   validHeight,
  //   validWidth,
  // });
  if (taskCount === 0) {
    // console.log("simulation no tasks");
    return priceDataPool.coalesce(weeksSince);
  } else {
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
    if (results.every((result) => result.status === "completed")) {
      const newData = priceDataPool.coalesce(weeksSince);
      if (newData.length === 0) {
        // console.log("simulation yielded no data");
      } else {
        // console.log("simulation success", newData);
        priceDataPool.setValidity(fullHash);

        return newData;
      }
    } else {
      // console.log("WHHATATAT?!?!?");
    }
  }

  return [];
};
