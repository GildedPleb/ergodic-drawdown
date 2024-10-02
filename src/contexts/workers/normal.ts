import { type DistributionNormalEvent, type SignalState } from "./types";

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
    const standardDeviation = Math.sqrt(variance);

    for (let quantile = 0; quantile < cutoffs.length; quantile++) {
      quantiles[week * cutoffs.length + quantile] = Math.max(
        Math.exp(mean + cutoffs[quantile] * standardDeviation),
        0.01,
      );
    }
  }
};
