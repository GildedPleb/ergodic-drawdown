import type GrowableSharedArray from "../../classes/growable-shared-array";
import { MS_PER_WEEK } from "../../constants";
import { createDataSet, createTaskQueue } from "../../helpers";
import { numberAt } from "../../number-at";
import { type DatasetList, type DistributionType } from "../../types";
import { type WorkerContextType } from "../workers";
import { type DistributionGroupEvent, type TaskResult, type WorkerTasks } from "../workers/types";

type Character = "drawdown" | "price";
type BandKind = "quantile" | "sd";

interface BufferSlot {
  checkedOut: SharedArrayBuffer | null;
  held: SharedArrayBuffer | null;
}

interface Loan {
  buffer: SharedArrayBuffer;
  release: () => void;
}

interface YSlot {
  key: string;
  values: Float64Array | null;
}

interface BandConfig {
  color: { blue: number; green: number; red: number };
  cutoffs: number[];
  midLabel: string;
  type: BandKind;
  workerEventType: "RUN_DISTRIBUTION_NORMAL" | "RUN_DISTRIBUTION_QUANTILE";
  yAxisID: "y" | "y1";
}

const emptySlot = (): BufferSlot => ({ checkedOut: null, held: null });

const emptyY = (): YSlot => ({ key: "", values: null });

// One high-water buffer per chart per role. A wave that is still being written
// keeps it checked out so the next wave allocates a spare instead of sharing it.
const bufferSlots: Record<Character, { grouped: BufferSlot; values: BufferSlot }> = {
  drawdown: { grouped: emptySlot(), values: emptySlot() },
  price: { grouped: emptySlot(), values: emptySlot() },
};

// Last y-values only. Quantile and normal each keep a slot, so toggling back
// does not rerun workers. A new source hash overwrites that slot.
const ySlots: Record<Character, Record<BandKind, YSlot>> = {
  drawdown: { quantile: emptyY(), sd: emptyY() },
  price: { quantile: emptyY(), sd: emptyY() },
};

const acquire = (slot: BufferSlot, bytes: number): Loan => {
  if (slot.checkedOut === null && slot.held !== null && slot.held.byteLength >= bytes) {
    const buffer = slot.held;
    slot.checkedOut = buffer;
    let released = false;
    return {
      buffer,
      release: () => {
        if (released) return;
        released = true;
        if (slot.checkedOut === buffer) slot.checkedOut = null;
      },
    };
  }

  const buffer = new SharedArrayBuffer(bytes);
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    if (slot.checkedOut === buffer) slot.checkedOut = null;
    if (slot.held === null || buffer.byteLength > slot.held.byteLength) slot.held = buffer;
  };

  if (slot.checkedOut === null) {
    slot.held = buffer;
    slot.checkedOut = buffer;
  }
  return { buffer, release };
};

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
  // Drawdown passes the volume hash: a balance change is not a price-band hit.
  const cacheKey = `${sourceHash}:${samples}:${dataLength}:${weeksSince}:${kind}`;
  const slot = ySlots[character][kind];
  if (slot.values !== null && slot.key === cacheKey) {
    return pointsFrom(config, slot.values, now, dataLength);
  }

  const slots = bufferSlots[character];
  const grouped = acquire(slots.grouped, Float64Array.BYTES_PER_ELEMENT * dataLength * samples);
  const values = acquire(
    slots.values,
    Float64Array.BYTES_PER_ELEMENT * dataLength * cutoffs.length,
  );
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
          dataLength,
          getZero: character === "drawdown",
          groupedDataBuffer: grouped.buffer,
          samples,
          task,
          weeksSince,
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
    statTasks = createTaskQueue(dataLength, worker.count, dataLength, 0).map((task) => ({
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

  const liveCount = dataLength * cutoffs.length;
  const copy = new Float64Array(liveCount);
  copy.set(new Float64Array(values.buffer).subarray(0, liveCount));
  slot.key = cacheKey;
  slot.values = copy;
  grouped.release();
  values.release();
  return pointsFrom(config, copy, now, dataLength);
};
