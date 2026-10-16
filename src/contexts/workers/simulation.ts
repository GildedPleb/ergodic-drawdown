import GrowableSharedArray from "../../classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../../constants";
import { walks } from "../../data/walks";
import { epochSeed, nextMulberry, WALK_STATE_LENGTH, walkKey } from "../../data/walks/prng";
import { lastFinite, numberAt } from "../../number-at";
import { type RunSimulationEvent, type SignalState } from "./types";

const base = 10;

export const handleSimulation = (
  {
    bufferState,
    currentPrice,
    epochCount,
    full: { clampBottom, clampTop, seed, volatility, walk },
    maxArray,
    minArray,
    stateBuffer,
    task: { endIndex, startEpoch, startIndex },
    weeksSince,
  }: RunSimulationEvent["payload"],
  signalState: SignalState,
): void => {
  if (signalState.aborted) {
    return;
  }
  const walking = walks[walk];
  const key = walkKey(walk);
  const rngState = new Uint32Array(1);
  const random = (): number => nextMulberry(rngState);
  const state = new Float64Array(WALK_STATE_LENGTH);
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
  const walkState = GrowableSharedArray.fromExportedState(stateBuffer);
  for (let sample = startIndex; sample < endIndex; sample++) {
    // startEpoch 0 means nothing is cached yet. Subtracting 1 would read epoch -1.
    const adjustedEpoch = Math.max((startEpoch ?? 1) - 1, 0);
    let sampleLength = adjustedEpoch * WEEKS_PER_EPOCH;
    let lastPrice = currentPrice;
    state.fill(0);

    for (let epoch = adjustedEpoch; epoch < epochCount; epoch++) {
      if (signalState.aborted) {
        return;
      }
      const segment = data.get(epoch, sample);
      if (segment !== undefined) {
        sampleLength += segment.length;
        const carried = lastFinite(segment);
        if (carried !== undefined) lastPrice = carried;
        const saved = walkState.get(epoch, sample);
        if (saved === undefined) {
          // A blank epoch never ran the walk. A priced epoch without a cycle is a broken cache.
          if (carried !== undefined) throw new Error("missing walk state");
          state.fill(0);
        } else {
          state[0] = numberAt(saved, 0);
          state[1] = numberAt(saved, 1);
          state[2] = numberAt(saved, 2);
        }
        continue;
      }
      // Local week 0 of this epoch is `epochStart` weeks into the bound series.
      const epochStart = sampleLength - weeksSince;
      const firstPresent = epochStart < 0 ? -epochStart : 0;
      if (firstPresent >= WEEKS_PER_EPOCH) {
        // The epoch ends before the price series. Its tail is NaN, not a price.
        const blank = new Float64Array(WEEKS_PER_EPOCH);
        blank.fill(Number.NaN);
        data.set(epoch, sample, blank);
        sampleLength += WEEKS_PER_EPOCH;
        continue;
      }

      const currentStart = epochStart < 0 ? 0 : epochStart;
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

      rngState[0] = epochSeed(seed, key, sample, epoch);
      const rawWalk = walking({
        clampBottom,
        clampTop,
        random,
        start: innerStartingPrice,
        startWeek: firstPresent,
        state,
        volatility,
      });

      // Weeks before the bound series have no price. They stay NaN.
      if (firstPresent > 0) rawWalk.fill(Number.NaN, 0, firstPresent);
      for (let week = firstPresent; week < rawWalk.length; week++) {
        const normalizedPrice = numberAt(rawWalk, week);
        const indexOffset = week + epochStart;
        // A week past the end of the bound series has no price.
        const min = minSeries[indexOffset];
        const max = maxSeries[indexOffset];
        const logMin = logMinSeries[indexOffset];
        const logMax = logMaxSeries[indexOffset];
        if (
          min === undefined ||
          max === undefined ||
          logMin === undefined ||
          logMax === undefined
        ) {
          rawWalk[week] = Number.NaN;
          continue;
        }

        let price: number;
        if (normalizedPrice <= 0) {
          price = min * base ** normalizedPrice;
        } else if (normalizedPrice < 1) {
          price = base ** (normalizedPrice * (logMax - logMin) + logMin);
        } else {
          price = max * base ** (normalizedPrice - 1);
        }
        if (price < 0.01) price = 0.01;
        rawWalk[week] = price;
      }

      data.set(epoch, sample, rawWalk);
      state[2] = 1;
      walkState.set(epoch, sample, state);
      const carried = lastFinite(rawWalk);
      if (carried !== undefined) lastPrice = carried;
      sampleLength += rawWalk.length;
    }
  }
};
