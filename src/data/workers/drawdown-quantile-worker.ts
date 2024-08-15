/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/no-for-loop */
/* eslint-disable unicorn/no-new-array */
/* eslint-disable security/detect-object-injection */
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";
import quickselect from "quickselect";

import { MS_PER_WEEK } from "../../constants";
import { quantileColor } from "../../content";
import { getOrdinalSuffix, timeout } from "../../helpers";
import { type DatasetList, type Point, type VolumeData } from "../../types";

const signalState = { aborted: false };

const NAME = "volume quantile";

const getQuantileLabel = (
  cutoff: number,
  total: number,
  index: number,
): string => {
  if (index === 0) return "Lowest Sampled";
  if (index === Math.floor(total / 2)) return "Median";
  if (index === total - 1) return "Highest Sampled";
  const amount = Math.round(cutoff * 100);
  const suffix = getOrdinalSuffix(amount);
  return `${amount}${suffix} Percentile`;
};

const createDataSet = (
  cutoffs: number[],
  quantiles: Point[][],
): DatasetList => {
  const length = cutoffs.length;
  const midIndex = Math.floor(length / 2);

  return cutoffs.map((cutoff, index) => {
    const isMedian = index === midIndex;
    return {
      backgroundColor: isMedian ? undefined : quantileColor,
      borderColor: isMedian ? "green" : undefined,
      borderDash: isMedian ? [15, 5] : undefined,
      borderWidth: isMedian ? 2 : 0,
      data: quantiles[index],
      fill: isMedian
        ? false
        : index < midIndex
          ? `+${midIndex - index}`
          : `-${index - midIndex}`,
      label: `${getQuantileLabel(cutoff, length, index)} Bitcoin Remaining`,
      pointRadius: 0,
      tension: 0,
      yAxisID: "y1",
    };
  });
};

const lruCache = new LRUCache<string, DatasetList>({ max: 2 });

const quantileWorker = async (
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

  const dates = new Array(groupedData.length) as number[];
  for (let index = 0; index < groupedData.length; index++) {
    dates[index] = drawdownDate + index * MS_PER_WEEK;
  }

  const cutOffs = [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1].sort(
    (first, second) => first - second,
  );
  if (cutOffs.length % 2 !== 1) throw new Error("Cutoffs must be odd");
  const quantiles = cutOffs.map(() => new Array(cutOffs.length) as Point[]);

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
      const innerIndex = Math.floor(right * cutOffs[index]);
      // @ts-expect-error dumb
      quickselect(groupedData[week], innerIndex, left);
      quantiles[index][week] = { x, y: groupedData[week][innerIndex] };
      left = innerIndex + 1;
    }
  }

  const finalData = createDataSet(cutOffs, quantiles);
  lruCache.set(cacheId, finalData);
  signal.removeEventListener("abort", AbortAction);
  console.timeEnd(NAME + id);
  return [id, finalData];
};

export default quantileWorker;
