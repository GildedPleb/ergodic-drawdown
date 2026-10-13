import type GrowableSharedArray from "../../classes/growable-shared-array";
import { MS_PER_WEEK } from "../../constants";
import { createDataSet, createTaskQueue } from "../../helpers";
import { numberAt } from "../../number-at";
import { type DatasetList, type DistributionType } from "../../types";
import { type WorkerContextType } from "../workers";
import { type DistributionGroupEvent } from "../workers/types";

export const handleDistribution = async (
  signal: AbortSignal,
  _hash: string,
  buffer: GrowableSharedArray,
  now: number,
  worker: WorkerContextType,
  samples: number,
  dataLength: number,
  weeksSince: number,
  renderDistribution: DistributionType,
  character: "drawdown" | "price",
  showModel: boolean,
): Promise<DatasetList> => {
  // console.log({
  //   buffer,
  //   character,
  //   dataLength,
  //   epochCount,
  //   now,
  //   renderDistribution,
  //   samples,
  //   weeksSince,
  //   worker,
  // });
  if (renderDistribution === "None" || showModel) return [];
  // Step 1: Data Preparation
  let groupedDataBuffer: SharedArrayBuffer = new SharedArrayBuffer(
    Float64Array.BYTES_PER_ELEMENT * dataLength * samples,
  );
  const taskQueueSamples = createTaskQueue(samples, worker.count, samples, 0);

  // Step 2: Grouping Data (workers)
  const groupStageResults = await worker.addTasks(
    taskQueueSamples.map((task) => {
      return {
        payload: {
          buffer: buffer.exportState(),
          dataLength,
          getZero: character === "drawdown",
          groupedDataBuffer,
          samples,
          task,
          weeksSince,
        },
        type: "RUN_DISTRIBUTION_GROUP",
      } satisfies DistributionGroupEvent;
    }),
    signal,
  );

  if (!groupStageResults.every((result) => result.status === "completed") || signal.aborted) {
    return [];
  }

  const dates = Array.from({ length: dataLength }, (_, index) => now + index * MS_PER_WEEK);
  const config =
    character === "price"
      ? renderDistribution === "Quantile"
        ? {
            color: { blue: 50, green: 145, red: 246 },
            cutoffs: [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1],
            midLabel: "Bitcoin Price",
            type: "quantile" as const,
            workerEventType: "RUN_DISTRIBUTION_QUANTILE" as const,
            yAxisID: "y" as const,
          }
        : {
            color: { blue: 0, green: 255, red: 255 },
            cutoffs: [-3, -2, -1, 0, 1, 2, 3],
            midLabel: "Bitcoin Price",
            type: "sd" as const,
            workerEventType: "RUN_DISTRIBUTION_NORMAL" as const,
            yAxisID: "y" as const,
          }
      : renderDistribution === "Quantile"
        ? {
            color: { blue: 0, green: 255, red: 0 },
            cutoffs: [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1],
            midLabel: "Bitcoin Remaining",
            type: "quantile" as const,
            workerEventType: "RUN_DISTRIBUTION_QUANTILE" as const,
            yAxisID: "y1" as const,
          }
        : {
            color: { blue: 255, green: 0, red: 0 },
            cutoffs: [-3, -2, -1, 0, 1, 2, 3],
            midLabel: "Bitcoin Remaining",
            type: "sd" as const,
            workerEventType: "RUN_DISTRIBUTION_NORMAL" as const,
            yAxisID: "y1" as const,
          };

  const { color, cutoffs, midLabel, type, workerEventType, yAxisID } = config;

  // if (renderPriceDistribution === "Quantile") {
  // Step 3: Data Preparation 2
  cutoffs.sort((first, second) => first - second);
  if (cutoffs.length % 2 !== 1) throw new Error("cutoffs must be odd");
  let quantilesBuffer: SharedArrayBuffer = new SharedArrayBuffer(
    Float64Array.BYTES_PER_ELEMENT * dataLength * cutoffs.length,
  );

  const taskQueueWeeks = createTaskQueue(dataLength, worker.count, dataLength, 0);

  // Step 4: Quantile Calculation (workers)
  const quantileStageResults = await worker.addTasks(
    taskQueueWeeks.map((task) => ({
      payload: {
        cutoffs,
        groupedDataBuffer,
        quantilesBuffer,
        samples,
        task,
      },
      type: workerEventType,
    })),
    signal,
  );

  if (!quantileStageResults.every((result) => result.status === "completed") || signal.aborted) {
    return [];
  }

  // Step 5: Final Data Creation
  const quantilesData = new Float64Array(quantilesBuffer);
  const quantiles = cutoffs.map(() => Array.from({ length: dataLength }, () => ({ x: 0, y: 0 })));

  // console.log({ quantilesData });
  for (let week = 0; week < dataLength; week++) {
    const x = dates[week];
    if (x === undefined) throw new Error(`missing date at week ${week}`);
    for (let index = 0; index < cutoffs.length; index++) {
      const series = quantiles[index];
      if (series === undefined) throw new Error(`missing quantile series ${index}`);
      series[week] = {
        x,
        y: numberAt(quantilesData, week * cutoffs.length + index),
      };
    }
  }

  return createDataSet({
    color,
    cutoffs,
    midLabel,
    quantiles,
    type,
    yAxisID,
  });
};
