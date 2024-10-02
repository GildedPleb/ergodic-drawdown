/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable security/detect-object-injection */

import SharedStackCache from "../../classes/shared-stack-cache";
import { WEEKS_PER_EPOCH } from "../../constants";
import { walks } from "../../data/walks";
import { type RunSimulationEvent, type SignalState } from "./types";

const base = 10;

export const handleSimulation = (
  {
    currentPrice,
    epochCount,
    full: { clampBottom, clampTop, volatility, walk },
    logMaxArray,
    logMinArray,
    maxArray,
    minArray,
    sharedBuffer,
    task: { endIndex, startEpoch, startIndex },
    weeksSince,
  }: RunSimulationEvent["payload"],
  signalState: SignalState,
): void => {
  if (signalState.aborted) {
    return;
  }
  const walking = walks[walk];
  const data = new SharedStackCache(sharedBuffer, epochCount, WEEKS_PER_EPOCH);
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
      // if (sample % 100 === 0)
      //   console.log({
      //     currentLength,
      //     currentStart,
      //     logLastPrice,
      //     logStartingMax,
      //     logStartingMin,
      //     starting,
      //     startingMax,
      //     startingMin,
      //   });
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
