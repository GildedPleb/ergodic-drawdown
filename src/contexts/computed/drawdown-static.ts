import { MS_PER_WEEK, WEEKS_PER_YEAR } from "../../constants";
import { type OneOffItem, type ReoccurringItem } from "../../types";

export interface DrawdownStaticReturn {
  totalWeeklyBitcoinItems: Float64Array;
  totalWeeklyFiatItems: Float64Array;
}

export const handleDrawdownStatic = (
  _signal: AbortSignal,
  _hash: string,
  dataLength: number,
  now: number,
  oneOffItems: OneOffItem[],
  reoccurringItems: ReoccurringItem[],
  inflationFactors: Float64Array,
  weeklyInflationRate: number,
): DrawdownStaticReturn => {
  const dateToWeek = (date: Date): number => Math.floor((date.getTime() - now) / MS_PER_WEEK) + 1;

  // Calculate Weekly reoccurringItems
  const totalWeeklyFiatItems = new Float64Array(dataLength);
  const totalWeeklyBitcoinItems = new Float64Array(dataLength);

  for (const item of reoccurringItems) {
    if (!item.active) continue;
    const { isFiat } = item;
    const { annualAmount, annualPercentChange, effective, end, expense } = item;
    const startWeek = dateToWeek(effective);
    const endWeek = end === undefined ? dataLength : dateToWeek(end);
    const weeklyChangeRate = (1 + annualPercentChange / 100) ** (1 / WEEKS_PER_YEAR) - 1;
    let weeklyCost = annualAmount / WEEKS_PER_YEAR;
    if (isFiat && startWeek > 0) weeklyCost *= inflationFactors[startWeek] ?? Number.NaN;
    for (let week = startWeek; week < endWeek; week++) {
      if (week !== startWeek) {
        weeklyCost *= 1 + (isFiat ? weeklyInflationRate : 0) + weeklyChangeRate;
      }
      const final = expense ? -weeklyCost : weeklyCost;
      const target = isFiat ? totalWeeklyFiatItems : totalWeeklyBitcoinItems;
      const current = target[week];
      if (current !== undefined) target[week] = current + final;
    }
  }

  // Calculate Weekly oneOffItems
  for (const oneOffItem of oneOffItems) {
    if (!oneOffItem.active) continue;
    const { amountToday, effective, expense, isFiat } = oneOffItem;
    const week = dateToWeek(effective);
    const factor = inflationFactors[week];
    const amount = isFiat && week > 0 ? amountToday * (factor ?? Number.NaN) : amountToday;
    const final = expense ? -amount : amount;
    const fiat = totalWeeklyFiatItems[week];
    const coin = totalWeeklyBitcoinItems[week];
    if (isFiat) {
      if (fiat !== undefined) totalWeeklyFiatItems[week] = fiat + final;
    } else if (coin !== undefined) {
      totalWeeklyBitcoinItems[week] = coin + final;
    }
  }

  return { totalWeeklyBitcoinItems, totalWeeklyFiatItems };
};
