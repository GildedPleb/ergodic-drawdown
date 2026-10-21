import type GrowableSharedArray from "../../classes/growable-shared-array";
import { coveredEpochs } from "../../horizon";
import { createTaskQueue } from "../../helpers";
import { type Full } from "../../types";
import { type WorkerContextType } from "../workers/types";
import { type RunSimulationEvent, type SupplementedTask } from "../workers/types";

export const handleSimulation = async (
  signal: AbortSignal,
  _hash: string,
  currentPrice: number,
  minArray: Float64Array[],
  maxArray: Float64Array[],
  epochCount: number,
  simulationData: GrowableSharedArray,
  walkState: GrowableSharedArray,
  samples: number,
  worker: WorkerContextType,
  weeksSince: number,
  dataLength: number,
  full: Full,
  fullHash: string,
): Promise<string> => {
  const returnHash = fullHash + epochCount + samples + dataLength;
  // The leading NaN prefix is weeksSince long. The model hash does not cover it.
  const gridHash = `${fullHash}:${weeksSince}`;
  const [priceWidth, priceHeight] = simulationData.getValidity(gridHash);
  const [stateWidth, stateHeight] = walkState.getValidity(gridHash);
  let validWidth = priceWidth;
  let validHeight = priceHeight;
  if (priceWidth !== stateWidth || priceHeight !== stateHeight) {
    validWidth = 0;
    validHeight = 0;
  }
  simulationData.resize(epochCount, samples);
  walkState.resize(epochCount, samples);
  if (validHeight === 0) {
    simulationData.clear();
    walkState.clear();
  } else if (validWidth < epochCount) {
    // A longer year reaches weeks that were stored as NaN in the last column.
    for (let epoch = validWidth; epoch < epochCount; epoch += 1) {
      simulationData.clearEpoch(epoch);
      walkState.clearEpoch(epoch);
    }
  }
  const needTasksForWidth = validWidth === 0 || validWidth < epochCount;
  const liveSamples = Math.min(validHeight, samples);

  const taskQueueEpochs: SupplementedTask[] = needTasksForWidth
    ? createTaskQueue(liveSamples, worker.count, samples, 0).map((task) => ({
        ...task,
        startEpoch: validWidth,
      }))
    : [];

  const taskQueueSamples = createTaskQueue(samples, worker.count, samples, validHeight);

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
        stateBuffer: walkState.exportState(),
        task,
        weeksSince,
      },
      type: "RUN_PRICE_SIMULATION",
    } satisfies RunSimulationEvent;
  });

  const results = await worker.addTasks(processedTasks, signal);
  if (results.some((result) => result.status !== "completed")) {
    return "failed:" + returnHash;
  }

  const covered = coveredEpochs(weeksSince, dataLength);
  simulationData.setValidity(gridHash, covered);
  walkState.setValidity(gridHash, covered);
  return "success:" + returnHash;
};
