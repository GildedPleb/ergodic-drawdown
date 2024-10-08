/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable security/detect-object-injection */

import GrowableSharedArray from "../../classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../../constants";
import { walks } from "../../data/walks";
import { type RunSimulationEvent, type SignalState } from "./types";

const base = 10;

export const handleSimulation = (
  {
    bufferState,
    currentPrice,
    epochCount,
    full: { clampBottom, clampTop, volatility, walk },
    maxArray: [maxArray, logMaxArray],
    minArray: [minArray, logMinArray],
    task: { endIndex, startEpoch, startIndex },
    weeksSince,
  }: RunSimulationEvent["payload"],
  signalState: SignalState,
): void => {
  if (signalState.aborted) {
    return;
  }
  const walking = walks[walk];
  const data = GrowableSharedArray.fromExportedState(bufferState);
  // console.log("called with random id:", { epochCount, id, task });
  for (let sample = startIndex; sample < endIndex; sample++) {
    const adjustedEpoch = (startEpoch ?? 1) - 1;
    let sampleLength = adjustedEpoch * WEEKS_PER_EPOCH;
    let lastPrice = currentPrice;

    for (let epoch = adjustedEpoch; epoch < epochCount; epoch++) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (signalState.aborted) {
        return;
      }
      // this can be done without the indirection simply by getting the last cached item,
      // which we now have the location of (bufferState.cacheWidth)
      const segment = data.get(epoch, sample);
      if (segment !== undefined) {
        sampleLength += segment.length;
        // eslint-disable-next-line unicorn/prefer-at
        lastPrice = segment[segment.length - 1];
        continue;
      }
      const currentLength = sampleLength - weeksSince;
      const starting = sampleLength === 0;
      const currentStart = starting ? 0 : currentLength;

      let innerStartingPrice;
      const startingMin = minArray[currentStart];
      const startingMax = maxArray[currentStart];
      const logStartingMin = logMinArray[currentStart];
      const logStartingMax = logMaxArray[currentStart];
      const logLastPrice = Math.log10(lastPrice);

      if (lastPrice <= startingMin) {
        innerStartingPrice = logLastPrice - logStartingMin;
      } else if (lastPrice < startingMax) {
        innerStartingPrice =
          (logLastPrice - logStartingMin) / (logStartingMax - logStartingMin);
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
        const normalizedPrice = rawWalk[week];
        const indexOffset = week + currentLength;
        const min = minArray[indexOffset];
        const max = maxArray[indexOffset];

        if (normalizedPrice <= 0) {
          rawWalk[week] = min * base ** normalizedPrice;
        } else if (normalizedPrice < 1) {
          const logMin = Math.log10(min);
          rawWalk[week] =
            base ** (normalizedPrice * (Math.log10(max) - logMin) + logMin);
        } else {
          rawWalk[week] = max * base ** (normalizedPrice - 1);
        }
        if (rawWalk[week] < 0.01) rawWalk[week] = 0.01;
      }

      data.set(epoch, sample, rawWalk);
      // eslint-disable-next-line unicorn/prefer-at
      lastPrice = rawWalk[rawWalk.length - 1];
      sampleLength += rawWalk.length;
    }
  }
};
