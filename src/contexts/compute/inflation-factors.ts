import { LRUCache } from "lru-cache";

import { MAX_WEEKS } from "../../constants";
const lruCache = new LRUCache<string, Float64Array>({ max: 10 });

export const useInflationFactors = (
  _signal: AbortSignal,
  hash: string,
  weeklyInflationRate: number,
): Float64Array => {
  const previous = lruCache.get(hash);
  if (previous !== undefined) {
    return previous;
  }
  const inflations = new Float64Array(MAX_WEEKS);
  for (let index = 0; index < inflations.length; index++) {
    inflations[index] = (1 + weeklyInflationRate) ** index;
  }
  lruCache.set(hash, inflations);
  return inflations;
};
