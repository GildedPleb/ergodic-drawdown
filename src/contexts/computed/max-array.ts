// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { LRUCache } from "lru-cache";

import { modelMap } from "../../data/models";
import { type ModelNames } from "../../types";

const lruCache = new LRUCache<string, Float64Array[]>({ max: 5 });

export const handleMaxArray = (
  _signal: AbortSignal,
  hash: string,
  currentBlock: number,
  minMaxMultiple: number,
  model: ModelNames,
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
  for (let week = 0; week < dataLength; week++) {
    maxPoints[week] = modelMap[model].maxPrice({
      currentBlock,
      currentPrice,
      minMaxMultiple,
      now,
      variable,
      week,
    });
    logMaxArray[week] = Math.log10(maxPoints[week]);
  }
  lruCache.set(hash, [maxPoints, logMaxArray]);
  return [maxPoints, logMaxArray];
};
