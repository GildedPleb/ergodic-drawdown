import { type DistributionNormalEvent, type SignalState } from "./types";

// Small number to check for effectively zero variance
const EPSILON = 1e-10;

export const handleNormal = (
  {
    cutoffs,
    groupedDataBuffer,
    quantilesBuffer,
    samples,
    task,
  }: DistributionNormalEvent["payload"],
  signalState: SignalState,
): void => {
  const groupedData = new Float64Array(groupedDataBuffer);
  const quantiles = new Float64Array(quantilesBuffer);

  for (let week = task.startIndex; week < task.endIndex; week++) {
    if (signalState.aborted) {
      return;
    }
    const weekData = groupedData.subarray(week * samples, (week + 1) * samples);
    let sum = 0;
    let sumOfSquares = 0;
    const count = weekData.length;

    for (const value of weekData) {
      const logValue = Math.log(value);
      sum += logValue;
      sumOfSquares += logValue * logValue;
    }

    const mean = sum / count;
    const variance = sumOfSquares / count - mean * mean;

    if (variance < EPSILON) {
      // If variance is effectively zero, all values must be the same
      const value = Math.exp(mean);
      for (let quantile = 0; quantile < cutoffs.length; quantile++) {
        quantiles[week * cutoffs.length + quantile] = value;
      }
      continue;
    }

    const standardDeviation = Math.sqrt(variance);

    for (let quantile = 0; quantile < cutoffs.length; quantile++) {
      quantiles[week * cutoffs.length + quantile] = Math.max(
        Math.exp(mean + cutoffs[quantile] * standardDeviation),
        0.01,
      );
    }
  }
};
