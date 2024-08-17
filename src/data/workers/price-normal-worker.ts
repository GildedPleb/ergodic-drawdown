/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/no-for-loop */
/* eslint-disable unicorn/no-new-array */
/* eslint-disable security/detect-object-injection */
import { type Point } from "chart.js";
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";

import { MS_PER_WEEK } from "../../constants";
import { createDataSet, timeout } from "../../helpers";
import { type DatasetList, type PriceData } from "../../types";

const signalState = { aborted: false };

const NAME = "price normal";

const lruCache = new LRUCache<string, DatasetList>({ max: 2 });

export const priceNormalDistributionWorker = async (
  priceDataset: PriceData,
  now: number,
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

  const numberWeeks = priceDataset[0].length;
  const groupedData = new Array(numberWeeks) as Float64Array[];
  for (let index = 0; index < groupedData.length; index++) {
    groupedData[index] = new Float64Array(priceDataset.length);
  }
  for (let index = 0; index < priceDataset.length; index++) {
    const element = priceDataset[index];
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

  const cutoffs = [-3, -2, -1, 0, 1, 2, 3].sort(
    (first, second) => first - second,
  );
  if (cutoffs.length % 2 !== 1) throw new Error("cutoffs must be odd");
  const quantiles = cutoffs.map(() => new Array(cutoffs.length) as Point[]);

  const dates = new Array(groupedData.length) as number[];
  for (let index = 0; index < groupedData.length; index++) {
    dates[index] = now + index * MS_PER_WEEK;
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
      const logValue = Math.log(value);
      sum += logValue;
      sumOfSquares += logValue * logValue;
    }

    const mean = sum / count;
    const variance = sumOfSquares / count - mean * mean;
    const standardDeviation = Math.sqrt(variance);
    const x = dates[week];

    for (let index = 0; index < quantiles.length; index++) {
      quantiles[index][week] = {
        x,
        y: Math.max(Math.exp(mean + cutoffs[index] * standardDeviation), 0.01),
      };
    }
  }

  const finalData = createDataSet({
    color: { blue: 0, green: 255, red: 255 },
    cutoffs,
    midLabel: "Bitcoin Price",
    quantiles,
    type: "sd",
    yAxisID: "y",
  });

  lruCache.set(cacheId, finalData);
  signal.removeEventListener("abort", AbortAction);
  console.timeEnd(NAME + id);
  return [id, finalData];
};
