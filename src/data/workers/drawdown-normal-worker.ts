/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/no-for-loop */
/* eslint-disable unicorn/no-new-array */
/* eslint-disable security/detect-object-injection */
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";

import { MS_PER_WEEK } from "../../constants";
import { distroColor } from "../../content";
import { getOrdinalSuffix, timeout } from "../../helpers";
import { type DatasetList, type Point, type VolumeData } from "../../types";

const signalState = { aborted: false };

const NAME = "volume normal";

const getLabel = (cutoff: number, total: number, index: number): string => {
  if (index === Math.floor(total / 2)) return "Mean";
  const amount = Math.abs(cutoff);
  const suffix = getOrdinalSuffix(amount);
  return `${amount}${suffix} Standard Deviation`;
};

const createDataSet = (
  cutoffs: number[],
  quantiles: Point[][],
): DatasetList => {
  const length = cutoffs.length;
  const midIndex = Math.floor(length / 2);

  return cutoffs.map((cutoff, index) => {
    const isMean = index === midIndex;
    return {
      backgroundColor: isMean ? undefined : distroColor,
      borderColor: isMean ? "blue" : undefined,
      borderDash: isMean ? [15, 5] : undefined,
      borderWidth: isMean ? 2 : 0,
      data: quantiles[index],
      fill: isMean
        ? false
        : index < midIndex
          ? `+${midIndex - index}`
          : `-${index - midIndex}`,
      label: `${getLabel(cutoff, length, index)} Drawdown`,
      pointRadius: 0,
      tension: 0,
      yAxisID: "y1",
    };
  });
};

const lruCache = new LRUCache<string, DatasetList>({ max: 2 });

const drawdownNormalDistributionWorker = async (
  volumeDataset: VolumeData,
  drawdownDate: number,
  signal: AbortSignal,
  cacheId: string,
): Promise<[string, DatasetList | undefined]> => {
  const id = hashSum(Math.random());
  console.time(NAME + id);
  if (lruCache.has(cacheId)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const finalData = lruCache.get(cacheId)!;
    console.timeEnd(NAME + id);
    return [id, finalData];
  }
  signalState.aborted = false;

  // eslint-disable-next-line functional/functional-parameters
  const AbortAction = (): void => {
    signal.removeEventListener("abort", AbortAction);
    console.warn("Aborted", id);
    signalState.aborted = true;
  };

  signal.addEventListener("abort", AbortAction);

  const numberWeeks = volumeDataset[0].length;
  const groupedData = new Array(numberWeeks) as Float64Array[];
  for (let index = 0; index < groupedData.length; index++) {
    groupedData[index] = new Float64Array(volumeDataset.length);
  }
  for (let index = 0; index < volumeDataset.length; index++) {
    const element = volumeDataset[index];
    if (index % 50 === 0) await timeout();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      console.timeEnd(NAME + id);
      return [id, undefined];
    } else {
      // console.log("loop price quantile 1");
    }
    for (let week = 0; week < element.length; week++) {
      const value = element[week];
      groupedData[week][index] = value <= 0.01 ? 0.01 : value;
    }
  }

  const cutOffs = [-1, 0, 1].sort((first, second) => first - second);
  if (cutOffs.length % 2 !== 1) throw new Error("Cutoffs must be odd");
  const quantiles = cutOffs.map(() => new Array(cutOffs.length) as Point[]);

  const dates = new Array(groupedData.length) as number[];
  for (let index = 0; index < groupedData.length; index++) {
    dates[index] = drawdownDate + index * MS_PER_WEEK;
  }

  for (let week = 0; week < groupedData.length; week++) {
    if (week % 50 === 0) await timeout();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      console.timeEnd(NAME + id);
      return [id, undefined];
    } else {
      // console.log("loop normal");
    }

    const values = groupedData[week];
    let sum = 0;
    let sumOfSquares = 0;
    const count = values.length;

    for (const value of values) {
      sum += value;
      sumOfSquares += value * value;
    }

    const mean = sum / count;
    const variance = sumOfSquares / count - mean * mean;
    const standardDeviation = Math.sqrt(variance);
    const x = dates[week];

    for (let index = 0; index < quantiles.length; index++) {
      quantiles[index][week] = {
        x,
        y: mean + cutOffs[index] * standardDeviation,
      };
    }
  }

  const finalData = createDataSet(cutOffs, quantiles);
  lruCache.set(cacheId, finalData);
  signal.removeEventListener("abort", AbortAction);
  console.timeEnd(NAME + id);
  return [id, finalData];
};

export default drawdownNormalDistributionWorker;
