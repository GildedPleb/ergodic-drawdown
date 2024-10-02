import quickselect from "quickselect";

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
    let left = 0;
    const right = samples - 1;

    for (let quantile = 0; quantile < cutoffs.length; quantile++) {
      const innerIndex = Math.floor(right * cutoffs[quantile]);
      // @ts-expect-error dumb
      quickselect(weekData, innerIndex, left);
      quantiles[week * cutoffs.length + quantile] = weekData[innerIndex];
      left = innerIndex + 1;
    }
  }
};
