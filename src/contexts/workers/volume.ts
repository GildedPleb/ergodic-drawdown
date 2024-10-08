import GrowableSharedArray from "../../classes/growable-shared-array";
import { VariableDrawdownFinal } from "../../classes/variable-drawdown-final";
import { type RunVolumeEvent, type SignalState } from "./types";

export const handleVolumeCalculation = (
  {
    bitcoin,
    drawdownExport,
    epochCount,
    exportedVariableCache,
    simulationExport,
    task: { endIndex, startIndex },
    totalWeeklyBitcoinItems,
    totalWeeklyFiatItems,
    weeksSince,
  }: RunVolumeEvent["payload"],
  signalState: SignalState,
): void => {
  if (signalState.aborted) {
    return;
  }
  const priceData = GrowableSharedArray.fromExportedState(simulationExport);
  const volumeData = GrowableSharedArray.fromExportedState(drawdownExport);
  // console.log("VOLUME WORKER", {
  //   bitcoin,
  //   epochCount,
  //   exportedVariableCache,
  //   priceData,
  //   task: { endIndex, startIndex },
  //   totalWeeklyBitcoinItems,
  //   totalWeeklyFiatItems,
  //   volumeData,
  //   // weeksSince,
  // });

  const variableCache = VariableDrawdownFinal.fromExportedState(
    exportedVariableCache,
  );
  for (let sample = startIndex; sample < endIndex; sample++) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      return;
    }

    let sampleLength = -weeksSince;
    let previous = bitcoin;

    for (let epoch = 0; epoch < epochCount; epoch++) {
      const volumeSegment = volumeData.get(epoch, sample);
      if (volumeSegment !== undefined) {
        sampleLength += volumeSegment.length;
        // eslint-disable-next-line unicorn/prefer-at
        previous = volumeSegment[volumeSegment.length - 1];
        continue;
      }

      const priceSegment = priceData.get(epoch, sample);
      if (priceSegment === undefined) {
        throw new Error("Undefined price segment");
      }

      const segmentLength = priceSegment.length;
      const dataArray = new Float64Array(segmentLength);
      // const currentLength = sampleLength - weeksSince;

      for (let week = 0; week < segmentLength; week++) {
        const price = priceSegment[week];

        if (Number.isNaN(price)) {
          dataArray[week] = Number.NaN;
        } else {
          const absoluteWeek = sampleLength + week;
          const item = variableCache.get(sample, absoluteWeek);
          const y =
            previous +
            (totalWeeklyFiatItems[absoluteWeek] - (item ?? 0)) / price +
            totalWeeklyBitcoinItems[absoluteWeek];

          dataArray[week] = y < 0 ? 0 : y;
          previous = dataArray[week];
        }
      }
      volumeData.set(epoch, sample, dataArray);
      sampleLength += segmentLength;
    }
  }
};
