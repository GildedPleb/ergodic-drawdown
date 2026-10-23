import hashSum from "hash-sum";

import { modelMap } from "../../data/models";
import { type BoundSlot } from "../../engine/memory";
import { allocatedEpochs, chartWeeksCovered } from "../../horizon";
import { type ModelNames, type ModelSettings } from "../../types";

export const handleMinArray = (
  _signal: AbortSignal,
  _hash: string,
  currentBlock: number,
  settings: ModelSettings,
  model: ModelNames,
  currentPrice: number,
  now: number,
  dataLength: number,
  weeksSince: number,
  slot: BoundSlot,
  onExtend?: (previousHash: string, nextHash: string) => void,
): Float64Array[] => {
  const priceModel = modelMap[model];
  const key = hashSum({
    block: currentBlock,
    model,
    now,
    price: currentPrice,
    settings,
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
    const price = priceModel.minPrice({
      currentBlock,
      currentPrice,
      now,
      settings,
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
