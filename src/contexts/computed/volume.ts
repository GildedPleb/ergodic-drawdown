import type GrowableSharedArray from "../../classes/growable-shared-array";
import { type VariableDrawdownFinal } from "../../classes/variable-drawdown-final";
import { createTaskQueue } from "../../helpers";
import { type WorkerContextType } from "../workers/types";
import { type RunVolumeEvent } from "../workers/types";
import { type DrawdownStaticReturn } from "./drawdown-static";

const NO_CACHE_ERROR = "No cache for variable drawdown";

export const handleVolume = async (
  signal: AbortSignal,
  _hash: string,
  bitcoin: number,
  { totalWeeklyBitcoinItems, totalWeeklyFiatItems }: DrawdownStaticReturn,
  variableDrawdownCache: Map<string, VariableDrawdownFinal>,
  samples: number,
  epochCount: number,
  simulationData: GrowableSharedArray,
  drawdownData: GrowableSharedArray,
  volumeCacheHash: string,
  variableCacheHash: string,
  weeksSince: number,
  dataLength: number,
  worker: WorkerContextType,
  showModel: boolean,
): Promise<string> => {
  const returnHash = volumeCacheHash + samples + epochCount + dataLength + variableCacheHash;
  if (showModel) return "not shown:" + returnHash;

  const variableCache = variableDrawdownCache.get(variableCacheHash);
  if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
  const exportedVariableCache = variableCache.exportState();

  // A new variable result moves spend weeks inside epochs that were already walked.
  const gridHash = `${volumeCacheHash}:${variableCacheHash}:${weeksSince}:${dataLength}`;
  const [validWidth, validHeight] = drawdownData.getValidity(gridHash);
  if (validHeight === 0) drawdownData.clear();
  drawdownData.resize(epochCount, samples);
  const needTasksForWidth = validWidth === 0 || validWidth < epochCount;

  const taskQueueEpochs = needTasksForWidth
    ? createTaskQueue(validHeight, worker.count, samples, 0)
    : [];

  const taskQueueSamples = createTaskQueue(samples, worker.count, samples, validHeight);

  const taskQueue = taskQueueEpochs.concat(taskQueueSamples);
  if (taskQueue.length === 0) return "no tasks:" + returnHash;
  const drawdownExport = drawdownData.exportState();
  const simulationExport = simulationData.exportState();

  const processedTasks = taskQueue.map((task) => {
    return {
      payload: {
        bitcoin,
        drawdownExport,
        epochCount,
        exportedVariableCache,
        simulationExport,
        task,
        totalWeeklyBitcoinItems,
        totalWeeklyFiatItems,
        weeksSince,
      },
      type: "RUN_VOLUME",
    } satisfies RunVolumeEvent;
  });

  const results = await worker.addTasks(processedTasks, signal);

  if (results.some((result) => result.status === "aborted")) {
    console.log("VOLUME TASKS ABORTED");
    return "failed:" + returnHash;
  }
  drawdownData.setValidity(gridHash);
  return "success:" + returnHash;
};
