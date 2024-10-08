// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";

import { MS_PER_WEEK, WEEKS_PER_YEAR } from "../../constants";
import { type OneOffItem, type ReoccurringItem } from "../../types";

const reoccurringItemCache = new LRUCache<string, Float64Array>({ max: 1000 });

export interface DrawdownStaticReturn {
  totalWeeklyBitcoinItems: Float64Array;
  totalWeeklyFiatItems: Float64Array;
}

export const handleDrawdownStatic = (
  _signal: AbortSignal,
  hash: string,
  dataLength: number,
  now: number,
  oneOffItems: OneOffItem[],
  reoccurringItems: ReoccurringItem[],
  inflationFactors: Float64Array,
  weeklyInflationRate: number,
): DrawdownStaticReturn => {
  const dateToWeek = (date: Date): number =>
    Math.floor((date.getTime() - now) / MS_PER_WEEK);

  // Calculate Weekly reoccurringItems
  const totalWeeklyFiatItems = new Float64Array(dataLength);
  const totalWeeklyBitcoinItems = new Float64Array(dataLength);

  for (const item of reoccurringItems) {
    if (!item.active) continue;
    const cacheKey = hashSum(item) + hash + String(weeklyInflationRate);
    const cachedResult = reoccurringItemCache.get(cacheKey);

    if (cachedResult === undefined) {
      const toBeCached = new Float64Array(dataLength);
      const { effective, end, expense, isFiat } = item;
      const startWeek = dateToWeek(effective);
      const endWeek = end === undefined ? dataLength : dateToWeek(end);
      const weeklyChangeRate =
        (1 + item.annualPercentChange / 100) ** (1 / WEEKS_PER_YEAR) - 1;
      let weeklyCost = item.annualAmount / WEEKS_PER_YEAR;
      if (isFiat && startWeek > 0) weeklyCost *= inflationFactors[startWeek];
      for (let week = startWeek; week < endWeek; week++) {
        if (week !== startWeek) {
          weeklyCost *=
            1 + (isFiat ? weeklyInflationRate : 0) + weeklyChangeRate;
        }
        const final = expense ? -weeklyCost : weeklyCost;
        if (isFiat) totalWeeklyFiatItems[week] += final;
        else totalWeeklyBitcoinItems[week] += final;
        toBeCached[week] = final;
      }
      reoccurringItemCache.set(cacheKey, toBeCached);
    } else {
      const targetArray = item.isFiat
        ? totalWeeklyFiatItems
        : totalWeeklyBitcoinItems;
      for (let week = 0; week < dataLength; week++) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (cachedResult[week] !== undefined)
          targetArray[week] += cachedResult[week];
      }
    }
  }

  // Calculate Weekly oneOffItems
  for (const oneOffItem of oneOffItems) {
    if (!oneOffItem.active) continue;
    const { amountToday, effective, expense, isFiat } = oneOffItem;
    const week = dateToWeek(effective);
    const amount =
      isFiat && week > 0 ? amountToday * inflationFactors[week] : amountToday;
    const final = expense ? -amount : amount;
    if (isFiat) totalWeeklyFiatItems[week] += final;
    else totalWeeklyBitcoinItems[week] += final;
  }

  return { totalWeeklyBitcoinItems, totalWeeklyFiatItems };
};
