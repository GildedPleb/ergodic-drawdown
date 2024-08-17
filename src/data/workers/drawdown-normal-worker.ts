/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/no-for-loop */
/* eslint-disable unicorn/no-new-array */
/* eslint-disable security/detect-object-injection */
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";

import { MS_PER_WEEK } from "../../constants";
import { createDataSet, timeout } from "../../helpers";
import { type DatasetList, type Point, type VolumeData } from "../../types";

const signalState = { aborted: false };

const NAME = "volume normal";

const lruCache = new LRUCache<string, DatasetList>({ max: 2 });

export const drawdownNormalDistributionWorker = async (
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

  const cutoffs = [-1, 0, 1].sort((first, second) => first - second);
  if (cutoffs.length % 2 !== 1) throw new Error("cutoffs must be odd");
  const quantiles = cutoffs.map(() => new Array(cutoffs.length) as Point[]);

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
        y: mean + cutoffs[index] * standardDeviation,
      };
    }
  }

  const finalData = createDataSet({
    color: { blue: 255, green: 0, red: 0 },
    cutoffs,
    midLabel: "Drawdown",
    quantiles,
    type: "sd",
    yAxisID: "y1",
  });
  lruCache.set(cacheId, finalData);
  signal.removeEventListener("abort", AbortAction);
  console.timeEnd(NAME + id);
  return [id, finalData];
};
