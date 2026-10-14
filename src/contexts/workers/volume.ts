import GrowableSharedArray from "../../classes/growable-shared-array";
import { lastFinite, numberAt } from "../../number-at";
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

  const variableCache = VariableDrawdownFinal.fromExportedState(exportedVariableCache);
  for (let sample = startIndex; sample < endIndex; sample++) {
    if (signalState.aborted) {
      return;
    }

    let sampleLength = -weeksSince;
    let previous = bitcoin;

    for (let epoch = 0; epoch < epochCount; epoch++) {
      const volumeSegment = volumeData.get(epoch, sample);
      if (volumeSegment !== undefined) {
        sampleLength += volumeSegment.length;
        // A cached epoch can end in NaN. That tail is not the running balance.
        const carried = lastFinite(volumeSegment);
        if (carried !== undefined) previous = carried;
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
        const price = numberAt(priceSegment, week);

        if (Number.isNaN(price)) {
          dataArray[week] = Number.NaN;
        } else {
          const absoluteWeek = sampleLength + week;
          const item = variableCache.get(sample, absoluteWeek);
          const fiat = totalWeeklyFiatItems[absoluteWeek];
          const coin = totalWeeklyBitcoinItems[absoluteWeek];
          const y =
            fiat === undefined || coin === undefined
              ? Number.NaN
              : previous + (fiat - (item ?? 0)) / price + coin;

          const next = y < 0 ? 0 : y;
          dataArray[week] = next;
          // A missing cashflow week is not a balance. Keep the last real one.
          if (!Number.isNaN(next)) previous = next;
        }
      }
      volumeData.set(epoch, sample, dataArray);
      sampleLength += segmentLength;
    }
  }
};
