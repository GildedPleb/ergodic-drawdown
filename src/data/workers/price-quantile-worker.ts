/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/no-new-array */
/* eslint-disable unicorn/no-for-loop */
/* eslint-disable security/detect-object-injection */
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";
import quickselect from "quickselect";

import { MS_PER_WEEK } from "../../constants";
import { createDataSet, timeout } from "../../helpers";
import { type DatasetList, type Point, type PriceData } from "../../types";

const signalState = { aborted: false };

const NAME = "price quantile";

const lruCache = new LRUCache<string, DatasetList>({ max: 5 });

export const priceQuantileWorker = async (
  priceDataset: PriceData,
  now: number,
  signal: AbortSignal,
  priceCacheHash: string,
): Promise<[string, DatasetList | undefined]> => {
  const id = hashSum(Math.random());
  console.time(NAME + id);
  if (lruCache.has(priceCacheHash)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const finalData = lruCache.get(priceCacheHash)!;
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
    if (index % 50 === 0) await timeout();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      console.timeEnd(NAME + id);
      return [id, undefined];
    } else {
      // console.log("loop price quantile 1");
    }
    for (let week = 0; week < priceDataset[index].length; week++) {
      const value = priceDataset[index][week];
      groupedData[week][index] = value <= 0.01 ? 0.01 : value;
    }
  }

  const dates = new Array(groupedData.length) as number[];
  for (let index = 0; index < groupedData.length; index++) {
    dates[index] = now + index * MS_PER_WEEK;
  }

  const cutoffs = [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1].sort(
    (first, second) => first - second,
  );
  if (cutoffs.length % 2 !== 1) throw new Error("cutoffs must be odd");
  const quantiles = cutoffs.map(() => new Array(cutoffs.length) as Point[]);

  for (let week = 0; week < groupedData.length; week++) {
    if (week % 50 === 0) await timeout();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      console.timeEnd(NAME + id);
      return [id, undefined];
    } else {
      // console.log("loop price quantile 2");
    }
    let left = 0;
    const right = groupedData[week].length - 1;
    const x = dates[week];
    for (let index = 0; index < quantiles.length; index++) {
      const innerIndex = Math.floor(right * cutoffs[index]);
      // @ts-expect-error dumb
      quickselect(groupedData[week], innerIndex, left);
      quantiles[index][week] = { x, y: groupedData[week][innerIndex] };
      left = innerIndex + 1;
    }
  }

  const finalData = createDataSet({
    color: { blue: 50, green: 145, red: 246 },
    cutoffs,
    midLabel: "Bitcoin Price",
    quantiles,
    type: "quantile",
    yAxisID: "y",
  });

  signal.removeEventListener("abort", AbortAction);
  lruCache.set(priceCacheHash, finalData);
  console.timeEnd(NAME + id);
  return [id, finalData];
};
