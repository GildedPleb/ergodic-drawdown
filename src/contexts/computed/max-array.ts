import { LRUCache } from "lru-cache";

import { modelMap } from "../../data/models";

const lruCache = new LRUCache<string, Float64Array[]>({ max: 5 });

export const handleMaxArray = (
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

  const maxPoints = new Float64Array(dataLength);
  const logMaxArray = new Float64Array(dataLength);
  for (let index = 0; index < dataLength; index++) {
    maxPoints[index] = modelMap[model].maxPrice({
      currentBlock,
      currentPrice,
      minMaxMultiple,
      now,
      variable,
      week: index,
    });
    logMaxArray[index] = Math.log10(maxPoints[index]);
  }
  lruCache.set(hash, [maxPoints, logMaxArray]);
  return [maxPoints, logMaxArray];
};
