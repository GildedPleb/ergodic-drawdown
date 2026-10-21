import { numberAt } from "../../number-at";
import { type DistributionQuantileEvent, type SignalState } from "./types";

// One list for this sample count. selectK mutates it. The published types
// reject a Float64Array, and a cast is banned. NaN compares equal: a < b ? -1 : a > b ? 1 : 0.
let scratch: number[] = [];

const compareNumber = (left: number, right: number): number =>
  left < right ? -1 : left > right ? 1 : 0;

const swap = (items: number[], i: number, j: number): void => {
  const left = numberAt(items, i);
  const right = numberAt(items, j);
  items[i] = right;
  items[j] = left;
};

// Floyd-Rivest selection. The 600 cutoff is the published quickselect split.
const selectK = (items: number[], k: number, left: number, right: number): void => {
  while (right > left) {
    if (right - left > 600) {
      const count = right - left + 1;
      const rank = k - left + 1;
      const logCount = Math.log(count);
      const sample = 0.5 * Math.exp((2 * logCount) / 3);
      const sd =
        0.5 *
        Math.sqrt((logCount * sample * (count - sample)) / count) *
        (rank - count / 2 < 0 ? -1 : 1);
      selectK(
        items,
        k,
        Math.max(left, Math.floor(k - (rank * sample) / count + sd)),
        Math.min(right, Math.floor(k + ((count - rank) * sample) / count + sd)),
      );
    }

    const pivot = numberAt(items, k);
    let i = left;
    let j = right;
    swap(items, left, k);
    if (compareNumber(numberAt(items, right), pivot) > 0) swap(items, left, right);

    while (i < j) {
      swap(items, i, j);
      i += 1;
      j -= 1;
      while (compareNumber(numberAt(items, i), pivot) < 0) i += 1;
      while (compareNumber(numberAt(items, j), pivot) > 0) j -= 1;
    }

    if (compareNumber(numberAt(items, left), pivot) === 0) swap(items, left, j);
    else {
      j += 1;
      swap(items, j, right);
    }

    if (j <= k) left = j + 1;
    if (k <= j) right = j - 1;
  }
};

export const handleQuantile = (
  {
    cutoffs,
    groupedDataBuffer,
    quantilesBuffer,
    samples,
    task,
  }: DistributionQuantileEvent["payload"],
  signalState: SignalState,
): void => {
  const groupedData = new Float64Array(groupedDataBuffer);
  const quantiles = new Float64Array(quantilesBuffer);
  if (scratch.length !== samples) scratch.length = samples;

  for (let week = task.startIndex; week < task.endIndex; week++) {
    if (signalState.aborted) {
      return;
    }
    const weekData = groupedData.subarray(week * samples, (week + 1) * samples);
    for (let index = 0; index < samples; index++) {
      const value = weekData[index];
      scratch[index] = value === undefined ? Number.NaN : value;
    }
    let left = 0;
    const right = samples - 1;

    for (let quantile = 0; quantile < cutoffs.length; quantile++) {
      const innerIndex = Math.floor(right * numberAt(cutoffs, quantile));
      // Cutoffs that floor to the same index (0% and 1% below 101 samples) select it once.
      if (innerIndex >= left) selectK(scratch, innerIndex, left, right);
      quantiles[week * cutoffs.length + quantile] = numberAt(scratch, innerIndex);
      left = Math.max(left, innerIndex + 1);
    }
  }
};
