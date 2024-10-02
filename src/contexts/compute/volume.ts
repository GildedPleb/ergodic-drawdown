import { type LRUCache } from "lru-cache";

import type SharedArrayPool from "../../classes/shared-stack-cache-pool";
import { type VariableDrawdownFinal } from "../../classes/variable-drawdown-final";
import { createTaskQueue } from "../../helpers";
import { type WorkerContextType } from "../workers";
import { type RunVolumeEvent } from "../workers/types";
import { type DrawdownStaticReturn } from "./drawdown-static";

const NO_CACHE_ERROR = "No cache for variable drawdown";

export const useVolume = async (
  signal: AbortSignal,
  _hash: string,
  bitcoin: number,
  { totalWeeklyBitcoinItems, totalWeeklyFiatItems }: DrawdownStaticReturn,
  variableDrawdownCache: LRUCache<string, VariableDrawdownFinal>,
  samples: number,
  epochCount: number,
  priceBuffer: SharedArrayPool,
  volumeBuffer: SharedArrayPool,
  volumeCacheHash: string,
  variableCacheHash: string,
  weeksSince: number,
  worker: WorkerContextType,
  showModel: boolean,
  // eslint-disable-next-line max-params
): Promise<Float64Array[]> => {
  if (showModel) return [];
  const variableCache = variableDrawdownCache.get(variableCacheHash);
  if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
  const exportedVariableCache = variableCache.exportState();

  const [validWidth, validHeight] = volumeBuffer.getValidity(volumeCacheHash);
  if (validHeight === 0) volumeBuffer.clear();
  volumeBuffer.resizeHeight(samples);
  volumeBuffer.resizeWidth(epochCount);
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
  if (taskQueue.length === 0) {
    // console.log("NO TASKS");
    return volumeBuffer.coalesce(weeksSince, true);
  } else {
    const sharedVolumeBuffers = volumeBuffer
      .getArrays()
      .map((array) => array.getSharedBuffer());
    const sharedPriceBuffers = priceBuffer
      .getArrays()
      .map((array) => array.getSharedBuffer());

    const processedTasks = taskQueue.map((task) => {
      return {
        payload: {
          bitcoin,
          epochCount,
          exportedVariableCache,
          priceBuffer: sharedPriceBuffers[task.arrayIndex],
          task,
          totalWeeklyBitcoinItems,
          totalWeeklyFiatItems,
          volumeBuffer: sharedVolumeBuffers[task.arrayIndex],
          weeksSince,
        },
        type: "RUN_VOLUME",
      } satisfies RunVolumeEvent;
    });
    const results = await worker.addTasks(processedTasks, signal);
    if (results.every((result) => result.status === "completed")) {
      const newData = volumeBuffer.coalesce(weeksSince, true);
      // console.log({ newData });
      if (newData.length === 0) {
        // console.log("volume calculation yielded no data");
      } else {
        volumeBuffer.setValidity(volumeCacheHash);
        return newData;
      }
    }
  }
  return [];
};
