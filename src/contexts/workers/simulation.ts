import GrowableSharedArray from "../../classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../../constants";
import { walks } from "../../data/walks";
import { numberAt } from "../../number-at";
import { type RunSimulationEvent, type SignalState } from "./types";

const base = 10;

export const handleSimulation = (
  {
    bufferState,
    currentPrice,
    epochCount,
    full: { clampBottom, clampTop, volatility, walk },
    maxArray,
    minArray,
    task: { endIndex, startEpoch, startIndex },
    weeksSince,
  }: RunSimulationEvent["payload"],
  signalState: SignalState,
): void => {
  if (signalState.aborted) {
    return;
  }
  const walking = walks[walk];
  const maxSeries = maxArray[0];
  const logMaxSeries = maxArray[1];
  const minSeries = minArray[0];
  const logMinSeries = minArray[1];
  if (
    maxSeries === undefined ||
    logMaxSeries === undefined ||
    minSeries === undefined ||
    logMinSeries === undefined
  ) {
    throw new Error("missing price bounds");
  }
  const data = GrowableSharedArray.fromExportedState(bufferState);
  // console.log("called with random id:", { epochCount, id, task });
  for (let sample = startIndex; sample < endIndex; sample++) {
    const adjustedEpoch = (startEpoch ?? 1) - 1;
    let sampleLength = adjustedEpoch * WEEKS_PER_EPOCH;
    let lastPrice = currentPrice;

    for (let epoch = adjustedEpoch; epoch < epochCount; epoch++) {
      if (signalState.aborted) {
        return;
      }
      // this can be done without the indirection simply by getting the last cached item,
      // which we now have the location of (bufferState.cacheWidth)
      const segment = data.get(epoch, sample);
      if (segment !== undefined) {
        sampleLength += segment.length;
        lastPrice = numberAt(segment, segment.length - 1);
        continue;
      }
      const currentLength = sampleLength - weeksSince;
      const starting = sampleLength === 0;
      const currentStart = starting ? 0 : currentLength;

      let innerStartingPrice;
      const startingMin = numberAt(minSeries, currentStart);
      const startingMax = numberAt(maxSeries, currentStart);
      const logStartingMin = numberAt(logMinSeries, currentStart);
      const logStartingMax = numberAt(logMaxSeries, currentStart);
      const logLastPrice = Math.log10(lastPrice);

      if (lastPrice <= startingMin) {
        innerStartingPrice = logLastPrice - logStartingMin;
      } else if (lastPrice < startingMax) {
        innerStartingPrice = (logLastPrice - logStartingMin) / (logStartingMax - logStartingMin);
      } else {
        innerStartingPrice = logLastPrice - logStartingMax + 1;
      }

      const rawWalk = walking({
        clampBottom,
        clampTop,
        start: innerStartingPrice,
        startWeek: starting ? weeksSince : 0,
        volatility,
      });

      for (let week = 0; week < rawWalk.length; week++) {
        const normalizedPrice = numberAt(rawWalk, week);
        const indexOffset = week + currentLength;
        // The first epoch begins weeksSince before the bound series. Those weeks are before now.
        const min = minSeries[indexOffset];
        const max = maxSeries[indexOffset];
        if (min === undefined || max === undefined) {
          rawWalk[week] = Number.NaN;
          continue;
        }

        let price: number;
        if (normalizedPrice <= 0) {
          price = min * base ** normalizedPrice;
        } else if (normalizedPrice < 1) {
          const logMin = Math.log10(min);
          price = base ** (normalizedPrice * (Math.log10(max) - logMin) + logMin);
        } else {
          price = max * base ** (normalizedPrice - 1);
        }
        if (price < 0.01) price = 0.01;
        rawWalk[week] = price;
      }

      data.set(epoch, sample, rawWalk);
      lastPrice = numberAt(rawWalk, rawWalk.length - 1);
      sampleLength += rawWalk.length;
    }
  }
};
