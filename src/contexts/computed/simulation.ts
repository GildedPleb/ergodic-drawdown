import type GrowableSharedArray from "../../classes/growable-shared-array";
import { walkedPriceIdentity } from "../../engine/keys";
import { chartWeeksCovered, columnOfChartWeek, epochsForNewSamples } from "../../horizon";
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
  minSeriesHash: string,
  maxSeriesHash: string,
): Promise<string> => {
  const returnHash = fullHash + epochCount + samples + dataLength;
  // The spot and the bound series name the walk. weeksSince is only the NaN prefix.
  const gridHash = `${walkedPriceIdentity(fullHash, currentPrice, minSeriesHash, maxSeriesHash)}:${weeksSince}`;
  const [priceWidth, priceHeight] = simulationData.getValidity(gridHash);
  const [stateWidth, stateHeight] = walkState.getValidity(gridHash);
  const priceCovered = simulationData.getCoveredWeeks(gridHash);
  const stateCovered = walkState.getCoveredWeeks(gridHash);
  let validHeight = priceHeight;
  let coveredWeeks = priceCovered;
  if (priceWidth !== stateWidth || priceHeight !== stateHeight || priceCovered !== stateCovered) {
    validHeight = 0;
    coveredWeeks = 0;
  }
  const walkEpochs = epochsForNewSamples(
    weeksSince,
    coveredWeeks,
    epochCount,
    samples,
    validHeight,
  );
  const catchingUp = walkEpochs > epochCount;
  simulationData.resize(epochCount, samples);
  walkState.resize(epochCount, samples);
  // A shorter year is already in the walked columns. setValidity would lower the sample count.
  // New rows are the exception: they have not reached the columns that year is hiding.
  if (!catchingUp && validHeight !== 0 && dataLength <= coveredWeeks && samples <= validHeight) {
    return "no tasks:" + returnHash;
  }
  const restoreWidth = (): void => {
    simulationData.resize(epochCount, samples);
    walkState.resize(epochCount, samples);
  };
  if (catchingUp) {
    simulationData.resize(walkEpochs, samples);
    walkState.resize(walkEpochs, samples);
  }
  const extending = validHeight !== 0 && dataLength > coveredWeeks;
  const resume = extending ? columnOfChartWeek(weeksSince, coveredWeeks) : 0;
  if (validHeight === 0) {
    simulationData.clear();
    walkState.clear();
  } else if (extending) {
    for (let epoch = resume; epoch < epochCount; epoch += 1) {
      simulationData.clearEpoch(epoch);
      walkState.clearEpoch(epoch);
    }
  }
  const liveSamples = Math.min(validHeight, samples);

  const taskQueueEpochs: SupplementedTask[] = extending
    ? createTaskQueue(liveSamples, worker.count, samples, 0).map((task) => ({
        ...task,
        startEpoch: resume,
      }))
    : [];

  const taskQueueSamples = createTaskQueue(samples, worker.count, samples, validHeight);

  const taskQueue = taskQueueEpochs.concat(taskQueueSamples);
  if (taskQueue.length === 0) {
    if (catchingUp) restoreWidth();
    return "no tasks:" + returnHash;
  }

  const bufferState = simulationData.exportState();
  const processedTasks = taskQueue.map((task) => {
    return {
      payload: {
        bufferState,
        currentPrice,
        epochCount: walkEpochs,
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
    if (catchingUp) restoreWidth();
    return "failed:" + returnHash;
  }

  if (catchingUp) restoreWidth();
  simulationData.setValidity(gridHash);
  walkState.setValidity(gridHash);
  const covered = chartWeeksCovered(weeksSince, walkEpochs);
  simulationData.setCoveredWeeks(gridHash, covered);
  walkState.setCoveredWeeks(gridHash, covered);
  return "success:" + returnHash;
};
