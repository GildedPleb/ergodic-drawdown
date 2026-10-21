import hashSum from "hash-sum";

import { modelMap } from "../../data/models";
import { type BoundSlot } from "../../engine/memory";
import { allocatedEpochs, chartWeeksCovered } from "../../horizon";
import { type ModelNames } from "../../types";

export const handleMinArray = (
  _signal: AbortSignal,
  _hash: string,
  currentBlock: number,
  minMaxMultiple: number,
  model: ModelNames,
  variable: number,
  currentPrice: number,
  now: number,
  dataLength: number,
  weeksSince: number,
  slot: BoundSlot,
  onExtend?: (previousHash: string, nextHash: string) => void,
): Float64Array[] => {
  const key = hashSum({
    block: currentBlock,
    model,
    multiple: minMaxMultiple,
    now,
    price: currentPrice,
    variable,
  });
  const needed = chartWeeksCovered(weeksSince, allocatedEpochs(weeksSince, dataLength));
  if (slot.key === key && slot.weeks >= needed) return [slot.points, slot.logs];

  // A new day, spot, or block rebuilds the numbers. The walked columns still read this tail.
  const span = Math.max(needed, slot.weeks);
  const filled = slot.key === key ? slot.weeks : 0;
  const minPoints = new Float64Array(span);
  const logMinArray = new Float64Array(span);
  if (filled > 0) {
    minPoints.set(slot.points.subarray(0, filled));
    logMinArray.set(slot.logs.subarray(0, filled));
  }
  for (let week = filled; week < span; week++) {
    const price = modelMap[model].minPrice({
      currentBlock,
      currentPrice,
      minMaxMultiple,
      now,
      variable,
      week,
    });
    minPoints[week] = price;
    logMinArray[week] = Math.log10(price);
  }
  const previousHash = slot.seriesHash;
  const nextHash = hashSum(Array.from(minPoints));
  slot.key = key;
  slot.logs = logMinArray;
  slot.points = minPoints;
  slot.seriesHash = nextHash;
  slot.weeks = span;
  // The copied weeks are the series already walked. The longer id is only the new tail.
  if (
    filled > 0 &&
    previousHash !== "" &&
    nextHash !== previousHash &&
    hashSum(Array.from(minPoints.subarray(0, filled))) === previousHash
  ) {
    onExtend?.(previousHash, nextHash);
  }
  return [minPoints, logMinArray];
};
