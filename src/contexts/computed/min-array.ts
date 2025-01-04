// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { LRUCache } from "lru-cache";

import { modelMap } from "../../data/models";
import { type ModelNames } from "../../types";

const lruCache = new LRUCache<string, Float64Array[]>({ max: 5 });

export const handleMinArray = (
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

  const logMinArray = new Float64Array(dataLength);
  const minPoints = new Float64Array(dataLength);
  for (let week = 0; week < dataLength; week++) {
    minPoints[week] = modelMap[model].minPrice({
      currentBlock,
      currentPrice,
      minMaxMultiple,
      now,
      variable,
      week,
    });
    logMinArray[week] = Math.log10(minPoints[week]);
  }
  lruCache.set(hash, [minPoints, logMinArray]);
  return [minPoints, logMinArray];
};
