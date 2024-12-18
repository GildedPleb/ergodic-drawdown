// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import memoize from "memoizee";

import { MS_PER_WEEK, WEEKS_PER_EPOCH } from "../../constants";
import {
  calculateHalvings,
  loadHalvings,
  weeksSinceLastHalving,
} from "../../helpers";
import { type MinMaxOptions, type PriceModel } from "../../types";
import marketData from "../datasets/bitcoin_weekly_prices_transformed_2.json";

// Helper to get price at a specific halving
const getPriceAtHalving = memoize((blockHeight: number): number => {
  const halvingDates = loadHalvings();
  const halvingTimestamp = halvingDates[blockHeight.toString()] * 1000;
  const pricePoint = marketData.find(
    (point) => Math.abs(point.x - halvingTimestamp) < MS_PER_WEEK,
  );
  return pricePoint?.y ?? 0;
});

// Calculate percentage changes for all historical cycles at a specific week within a cycle
const getWeeklyPercentageChanges = memoize(
  (weekInCycle: number, previousHalvings: number): number[] => {
    const halvingDates = loadHalvings();
    const changes: number[] = [];

    // Sort halvings by timestamp to get them in chronological order
    const sortedHalvings = Object.entries(halvingDates).sort(
      (first, second) => Number(second[1]) - Number(first[1]),
    );

    // Take the specified number of most recent halvings (adding 1 to include the current halving)
    const relevantHalvings = sortedHalvings.slice(0, previousHalvings + 1);

    for (const [block, timestamp] of relevantHalvings) {
      const halvingTimestamp = timestamp * 1000;
      const targetTimestamp = halvingTimestamp + weekInCycle * MS_PER_WEEK;
      const halvingPrice = getPriceAtHalving(Number(block));

      if (halvingPrice === 0) continue;

      const pricePoint = marketData.find(
        (point) => Math.abs(point.x - targetTimestamp) < MS_PER_WEEK,
      );

      if (pricePoint !== undefined) {
        const percentageChange = (pricePoint.y / halvingPrice - 1) * 100;
        changes.push(percentageChange);
      }
    }

    return changes;
  },
);

// Get the historical min/max percentage changes for an entire cycle
const getCyclePercentageRanges = memoize((previousHalvings: number) => {
  const ranges: Array<{ max: number; min: number }> = [];

  for (let week = 0; week < WEEKS_PER_EPOCH; week++) {
    const changes = getWeeklyPercentageChanges(week, previousHalvings);
    if (changes.length > 0) {
      ranges[week] = {
        max: Math.max(...changes),
        min: Math.min(...changes),
      };
    }
  }

  return ranges;
});

// Shared price calculation logic
const calculatePrice = (options: MinMaxOptions, useMax: boolean): number => {
  const halvings = calculateHalvings(options.currentBlock);
  const lastHalving = halvings.at(-1) ?? 0;
  const priceAtLastHalving = getPriceAtHalving(lastHalving);

  if (priceAtLastHalving === 0) return 0;

  const weeksSinceHalving = weeksSinceLastHalving(loadHalvings());
  const targetWeek = weeksSinceHalving + options.week;
  const cycleRanges = getCyclePercentageRanges(options.variable);

  // Calculate which cycle and week within cycle we're targeting
  const cycleIndex = Math.floor(targetWeek / WEEKS_PER_EPOCH);
  const weekInCycle = targetWeek % WEEKS_PER_EPOCH;

  // If we don't have data for this week in the cycle, return last known price
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!cycleRanges[weekInCycle]) return priceAtLastHalving;

  // Apply compounded percentage changes across cycles
  let price = priceAtLastHalving;
  for (let index = 0; index <= cycleIndex; index++) {
    const weekToUse = index === cycleIndex ? weekInCycle : WEEKS_PER_EPOCH - 1;
    price *=
      1 +
      (useMax ? cycleRanges[weekToUse].max : cycleRanges[weekToUse].min) / 100;
  }

  return price;
};

const historic = {
  default: 2,
  maxPrice: (options: MinMaxOptions): number => calculatePrice(options, true),
  minPrice: (options: MinMaxOptions): number => calculatePrice(options, false),
  modelType: "Historic" as const,
  rangeMax: 3,
  rangeMin: 2,
  varInput: "Previous Halvings",
  varRange: false,
} satisfies PriceModel;

export default historic;
