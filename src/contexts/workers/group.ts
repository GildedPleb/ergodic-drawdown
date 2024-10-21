import GrowableSharedArray from "../../classes/growable-shared-array";
import { type DistributionGroupEvent, type SignalState } from "./types";

export const handleGroup = (
  {
    buffer,
    dataLength,
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
  const data = GrowableSharedArray.fromExportedState(buffer);
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
      groupedData[week * samples + sample] =
        value <= 0.01 && !getZero ? 0.01 : value;
    }
  }
};
