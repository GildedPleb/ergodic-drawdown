import { LRUCache } from "lru-cache";

import { modelMap } from "../../data/models";

const lruCache = new LRUCache<string, Float64Array[]>({ max: 5 });

export const useMinArray = (
  _signal: AbortSignal,
  hash: string,
  currentBlock: number,
  minMaxMultiple: number,
  model: string,
  variable: number,
  currentPrice: number,
  now: number,
  dataLength: number,
): Float64Array[] => {
  const previous = lruCache.get(hash);
  if (previous !== undefined) {
    return previous;
  }

  const logMinArray = new Float64Array(dataLength);
  const minPoints = new Float64Array(dataLength);
  for (let index = 0; index < dataLength; index++) {
    minPoints[index] = modelMap[model].minPrice({
      currentBlock,
      currentPrice,
      minMaxMultiple,
      now,
      variable,
      week: index,
    });
    logMinArray[index] = Math.log10(minPoints[index]);
  }
  lruCache.set(hash, [minPoints, logMinArray]);
  return [minPoints, logMinArray];
};
