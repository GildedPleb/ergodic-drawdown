import type GrowableSharedArray from "../../classes/growable-shared-array";
import { createTaskQueue } from "../../helpers";
import { type Full } from "../../types";
import { type WorkerContextType } from "../workers";
import { type RunSimulationEvent, type SupplementedTask } from "../workers/types";

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
): Promise<string> => {
  const returnHash = fullHash + epochCount + samples;
  // The leading NaN prefix is weeksSince long. The model hash does not cover it.
  const gridHash = `${fullHash}:${weeksSince}`;
  const [validWidth, validHeight] = simulationData.getValidity(gridHash);
  simulationData.resize(epochCount, samples);
  if (validHeight === 0) simulationData.clear();
  const needTasksForWidth = validWidth === 0 || validWidth < epochCount;

  const taskQueueEpochs: SupplementedTask[] = needTasksForWidth
    ? createTaskQueue(validHeight, worker.count, samples, 0).map((task) => ({
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
  simulationData.setValidity(gridHash);
  return "success:" + returnHash;
};
