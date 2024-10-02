import SharedStackCache from "../../classes/shared-stack-cache";
import { WEEKS_PER_EPOCH } from "../../constants";
import { type DistributionGroupEvent, type SignalState } from "./types";

export const handleGroup = (
  {
    buffer,
    dataLength,
    epochCount,
    getZero,
    groupedDataBuffer,
    samples,
    task,
    weeksSince,
  }: DistributionGroupEvent["payload"],
  signalState: SignalState,
): void => {
  if (signalState.aborted) {
    return;
  }
  const data = new SharedStackCache(buffer, epochCount, WEEKS_PER_EPOCH);
  const groupedData = new Float64Array(groupedDataBuffer);
  for (let sample = task.startIndex; sample < task.endIndex; sample++) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      return;
    }
    const row = data.getRow(sample, getZero);
    if (row === undefined) throw new Error("no data");
    for (let week = 0; week < dataLength; week++) {
      const value = row[week + weeksSince];
      groupedData[week * samples + (sample + 1000 * task.arrayIndex)] =
        value <= 0.01 ? 0.01 : value;
    }
  }
};
