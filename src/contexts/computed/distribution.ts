import type GrowableSharedArray from "../../classes/growable-shared-array";
import { MS_PER_WEEK } from "../../constants";
import { createDataSet, createTaskQueue } from "../../helpers";
import { numberAt } from "../../number-at";
import { type DatasetList, type DistributionType } from "../../types";
import { acquire, acquireWhenFree, bufferSlots, ySlots } from "../../engine/memory";
import { type WorkerContextType } from "../workers/types";
import { type DistributionGroupEvent, type TaskResult, type WorkerTasks } from "../workers/types";

type Character = "drawdown" | "price";
type BandKind = "quantile" | "sd";

interface BandConfig {
  color: { blue: number; green: number; red: number };
  cutoffs: number[];
  midLabel: string;
  type: BandKind;
  workerEventType: "RUN_DISTRIBUTION_NORMAL" | "RUN_DISTRIBUTION_QUANTILE";
  yAxisID: "y" | "y1";
}

const bandConfig = (character: Character, kind: BandKind): BandConfig => {
  if (character === "price") {
    return kind === "quantile"
      ? {
          color: { blue: 50, green: 145, red: 246 },
          cutoffs: [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1],
          midLabel: "Bitcoin Price",
          type: "quantile",
          workerEventType: "RUN_DISTRIBUTION_QUANTILE",
          yAxisID: "y",
        }
      : {
          color: { blue: 0, green: 255, red: 255 },
          cutoffs: [-3, -2, -1, 0, 1, 2, 3],
          midLabel: "Bitcoin Price",
          type: "sd",
          workerEventType: "RUN_DISTRIBUTION_NORMAL",
          yAxisID: "y",
        };
  }
  return kind === "quantile"
    ? {
        color: { blue: 0, green: 255, red: 0 },
        cutoffs: [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1],
        midLabel: "Bitcoin Remaining",
        type: "quantile",
        workerEventType: "RUN_DISTRIBUTION_QUANTILE",
        yAxisID: "y1",
      }
    : {
        color: { blue: 255, green: 0, red: 0 },
        cutoffs: [-3, -2, -1, 0, 1, 2, 3],
        midLabel: "Bitcoin Remaining",
        type: "sd",
        workerEventType: "RUN_DISTRIBUTION_NORMAL",
        yAxisID: "y1",
      };
};

const pointsFrom = (
  config: BandConfig,
  values: Float64Array,
  now: number,
  dataLength: number,
): DatasetList => {
  const { color, cutoffs, midLabel, type, yAxisID } = config;
  const quantiles = cutoffs.map(() => Array.from({ length: dataLength }, () => ({ x: 0, y: 0 })));

  for (let week = 0; week < dataLength; week++) {
    const x = now + week * MS_PER_WEEK;
    for (let index = 0; index < cutoffs.length; index++) {
      const series = quantiles[index];
      if (series === undefined) throw new Error(`missing quantile series ${index}`);
      series[week] = {
        x,
        y: numberAt(values, week * cutoffs.length + index),
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

const stageFinished = (results: readonly TaskResult[], signal: AbortSignal): boolean =>
  results.every((result) => result.status === "completed") && !signal.aborted;

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
  character: Character,
  showModel: boolean,
  sourceHash: string,
): Promise<DatasetList> => {
  if (renderDistribution === "None" || showModel) return [];

  const kind: BandKind = renderDistribution === "Quantile" ? "quantile" : "sd";
  const config = bandConfig(character, kind);
  const { cutoffs, workerEventType } = config;
  cutoffs.sort((first, second) => first - second);
  if (cutoffs.length % 2 !== 1) throw new Error("cutoffs must be odd");

  // Dates come from `now`. The percentile values do not, so a new day must not rerun workers.
  // The year length is not in the key. A shorter year reads the stored front.
  const cacheKey = `${sourceHash}:${weeksSince}:${samples}:${kind}`;
  const slot = ySlots[character][kind];
  const stored = slot.values;
  if (stored !== null && slot.key === cacheKey && dataLength <= slot.weeks) {
    return pointsFrom(config, stored, now, dataLength);
  }

  const origin = stored !== null && slot.key === cacheKey ? slot.weeks : 0;
  const added = dataLength - origin;
  const slots = bufferSlots[character];
  let grouped = acquire(slots.grouped, Float64Array.BYTES_PER_ELEMENT * added * samples);
  if (grouped === null) {
    grouped = await acquireWhenFree(
      slots.grouped,
      Float64Array.BYTES_PER_ELEMENT * added * samples,
      signal,
    );
    if (grouped === null) return [];
  }
  let values = acquire(slots.values, Float64Array.BYTES_PER_ELEMENT * added * cutoffs.length);
  if (values === null) {
    values = await acquireWhenFree(
      slots.values,
      Float64Array.BYTES_PER_ELEMENT * added * cutoffs.length,
      signal,
    );
    if (values === null) {
      grouped.release();
      return [];
    }
  }
  let abandoned = false;
  let groupedDone = false;
  let valuesDone = false;

  const releaseAbandoned = (): void => {
    if (!abandoned) return;
    // The stat kernel still reads the grouped buffer. Hold that loan until it replies.
    if (groupedDone && valuesDone) grouped.release();
    if (valuesDone) values.release();
  };

  const exported = buffer.exportState();
  const groupTasks: WorkerTasks[] = createTaskQueue(samples, worker.count, samples, 0).map(
    (task) => {
      return {
        payload: {
          buffer: exported,
          dataLength: added,
          getZero: character === "drawdown",
          groupedDataBuffer: grouped.buffer,
          samples,
          task,
          weeksSince: weeksSince + origin,
        },
        type: "RUN_DISTRIBUTION_GROUP",
      } satisfies DistributionGroupEvent;
    },
  );

  const groupResults = await worker.addTasks(groupTasks, signal, () => {
    groupedDone = true;
    releaseAbandoned();
  });
  if (!stageFinished(groupResults, signal)) {
    abandoned = true;
    valuesDone = true;
    releaseAbandoned();
    return [];
  }

  let statTasks: WorkerTasks[];
  try {
    statTasks = createTaskQueue(added, worker.count, added, 0).map((task) => ({
      payload: {
        cutoffs,
        groupedDataBuffer: grouped.buffer,
        quantilesBuffer: values.buffer,
        samples,
        task,
      },
      type: workerEventType,
    }));
  } catch (error) {
    // Group kernels have replied. These stat tasks were never posted.
    abandoned = true;
    valuesDone = true;
    releaseAbandoned();
    throw error;
  }

  const statResults = await worker.addTasks(statTasks, signal, () => {
    valuesDone = true;
    releaseAbandoned();
  });
  if (!stageFinished(statResults, signal)) {
    abandoned = true;
    releaseAbandoned();
    return [];
  }

  const liveCount = added * cutoffs.length;
  const copy = new Float64Array((origin + added) * cutoffs.length);
  if (origin > 0 && stored !== null) copy.set(stored.subarray(0, origin * cutoffs.length));
  copy.set(new Float64Array(values.buffer).subarray(0, liveCount), origin * cutoffs.length);
  slot.key = cacheKey;
  slot.values = copy;
  slot.weeks = origin + added;
  grouped.release();
  values.release();
  return pointsFrom(config, copy, now, dataLength);
};
