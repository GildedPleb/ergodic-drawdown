import quickselect from "quickselect";

import { numberAt } from "../../number-at";
import { type DistributionQuantileEvent, type SignalState } from "./types";

// One list for this sample count. quickselect mutates it. The published types
// reject a Float64Array, and a cast is banned. NaN compares equal: a < b ? -1 : a > b ? 1 : 0.
let scratch: number[] = [];

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
      if (innerIndex >= left) quickselect(scratch, innerIndex, left, right);
      quantiles[week * cutoffs.length + quantile] = numberAt(scratch, innerIndex);
      left = Math.max(left, innerIndex + 1);
    }
  }
};
