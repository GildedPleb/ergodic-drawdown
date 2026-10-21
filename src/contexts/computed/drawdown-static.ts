import hashSum from "hash-sum";

import { MS_PER_WEEK, WEEKS_PER_YEAR } from "../../constants";
import { type CashflowSlot } from "../../engine/memory";
import { allocatedEpochs, chartWeeksCovered } from "../../horizon";
import { type OneOffItem, type ReoccurringItem } from "../../types";

export interface DrawdownStaticReturn {
  seriesHash: string;
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
  weeksSince: number,
  slot: CashflowSlot,
  onExtend?: (previousHash: string, nextHash: string) => void,
): DrawdownStaticReturn => {
  const key = hashSum({ now, oneOffItems, reoccurringItems, weeklyInflationRate });
  const needed = chartWeeksCovered(weeksSince, allocatedEpochs(weeksSince, dataLength));
  if (slot.key === key && slot.weeks >= needed) {
    return {
      seriesHash: slot.seriesHash,
      totalWeeklyBitcoinItems: slot.bitcoin,
      totalWeeklyFiatItems: slot.fiat,
    };
  }

  const dateToWeek = (date: Date): number => Math.floor((date.getTime() - now) / MS_PER_WEEK) + 1;
  // A new day rebuilds the amounts. The balance walk still reads this tail.
  const span = Math.max(needed, slot.weeks);
  const oldWeeks = slot.key === key ? slot.weeks : 0;
  const totalWeeklyFiatItems = new Float64Array(span);
  const totalWeeklyBitcoinItems = new Float64Array(span);
  if (oldWeeks > 0) {
    totalWeeklyFiatItems.set(slot.fiat.subarray(0, oldWeeks));
    totalWeeklyBitcoinItems.set(slot.bitcoin.subarray(0, oldWeeks));
  }

  for (const item of reoccurringItems) {
    if (!item.active) continue;
    const { isFiat } = item;
    const { annualAmount, annualPercentChange, effective, end, expense } = item;
    const startWeek = dateToWeek(effective);
    const endWeek = end === undefined ? span : dateToWeek(end);
    const weeklyChangeRate = (1 + annualPercentChange / 100) ** (1 / WEEKS_PER_YEAR) - 1;
    let weeklyCost = annualAmount / WEEKS_PER_YEAR;
    if (isFiat && startWeek > 0) weeklyCost *= inflationFactors[startWeek] ?? Number.NaN;
    for (let week = startWeek; week < endWeek; week++) {
      if (week !== startWeek) {
        weeklyCost *= 1 + (isFiat ? weeklyInflationRate : 0) + weeklyChangeRate;
      }
      if (week < oldWeeks) continue;
      const final = expense ? -weeklyCost : weeklyCost;
      const target = isFiat ? totalWeeklyFiatItems : totalWeeklyBitcoinItems;
      const current = target[week];
      if (current !== undefined) target[week] = current + final;
    }
  }

  for (const oneOffItem of oneOffItems) {
    if (!oneOffItem.active) continue;
    const { amountToday, effective, expense, isFiat } = oneOffItem;
    const week = dateToWeek(effective);
    if (week < oldWeeks) continue;
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

  // The balance grid keeps this. A new day that leaves the weeks alone does not change it.
  const previousHash = slot.seriesHash;
  const seriesHash = hashSum([
    Array.from(totalWeeklyBitcoinItems),
    Array.from(totalWeeklyFiatItems),
  ]);
  slot.bitcoin = totalWeeklyBitcoinItems;
  slot.fiat = totalWeeklyFiatItems;
  slot.key = key;
  slot.seriesHash = seriesHash;
  slot.weeks = span;
  // The copied weeks are the amounts already walked. The longer id is only the new tail.
  if (
    oldWeeks > 0 &&
    previousHash !== "" &&
    seriesHash !== previousHash &&
    hashSum([
      Array.from(totalWeeklyBitcoinItems.subarray(0, oldWeeks)),
      Array.from(totalWeeklyFiatItems.subarray(0, oldWeeks)),
    ]) === previousHash
  ) {
    onExtend?.(previousHash, seriesHash);
  }
  return { seriesHash, totalWeeklyBitcoinItems, totalWeeklyFiatItems };
};
