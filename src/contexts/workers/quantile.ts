import quickselect from "quickselect";

import { numberAt } from "../../number-at";
import { type DistributionQuantileEvent, type SignalState } from "./types";

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

  for (let week = task.startIndex; week < task.endIndex; week++) {
    if (signalState.aborted) {
      return;
    }
    const weekData = groupedData.subarray(week * samples, (week + 1) * samples);
    // One list for the week. The nine slices share it. quickselect does not accept the typed array.
    const values = Array.from(weekData);
    let left = 0;
    const right = samples - 1;

    for (let quantile = 0; quantile < cutoffs.length; quantile++) {
      const innerIndex = Math.floor(right * numberAt(cutoffs, quantile));
      quickselect(values, innerIndex, left);
      quantiles[week * cutoffs.length + quantile] = numberAt(values, innerIndex);
      left = innerIndex + 1;
    }
  }
};
