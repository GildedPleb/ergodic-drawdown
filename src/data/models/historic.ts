import memoize from "memoizee";

import { MS_PER_WEEK, WEEKS_PER_EPOCH } from "../../constants";
import { calculateHalvings, loadHalvings, weeksSinceLastHalving } from "../../halvings";
import { defineModel } from "./define";
import marketData from "../datasets/bitcoin_weekly_prices_transformed_2.json";

const getPriceAtHalving = memoize((blockHeight: number): number => {
  const halvingDates = loadHalvings();
  const timestamp = halvingDates[blockHeight.toString()];
  if (timestamp === undefined) return 0;
  const halvingTimestamp = timestamp * 1000;
  const pricePoint = marketData.find((point) => Math.abs(point.x - halvingTimestamp) < MS_PER_WEEK);
  return pricePoint?.y ?? 0;
});

const getWeeklyPercentageChanges = memoize(
  (weekInCycle: number, previousHalvings: number): number[] => {
    const halvingDates = loadHalvings();
    const changes: number[] = [];

    const sortedHalvings = Object.entries(halvingDates).toSorted(
      (first, second) => second[1] - first[1],
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

const calculatePrice = (
  currentBlock: number,
  week: number,
  previousHalvings: number,
  useMax: boolean,
): number => {
  const halvings = calculateHalvings(currentBlock);
  const lastHalving = halvings.at(-1) ?? 0;
  const priceAtLastHalving = getPriceAtHalving(lastHalving);

  if (priceAtLastHalving === 0) return 0;

  const weeksSinceHalving = weeksSinceLastHalving(loadHalvings());
  const targetWeek = weeksSinceHalving + week;
  const cycleRanges = getCyclePercentageRanges(previousHalvings);

  const cycleIndex = Math.floor(targetWeek / WEEKS_PER_EPOCH);
  const weekInCycle = targetWeek % WEEKS_PER_EPOCH;

  // If we don't have data for this week in the cycle, return last known price
  if (!cycleRanges[weekInCycle]) return priceAtLastHalving;

  // Apply compounded percentage changes across cycles
  let price = priceAtLastHalving;
  for (let index = 0; index <= cycleIndex; index++) {
    const weekToUse = index === cycleIndex ? weekInCycle : WEEKS_PER_EPOCH - 1;
    const range = cycleRanges[weekToUse];
    if (range === undefined) throw new Error(`missing historic range for week ${weekToUse}`);
    price *= 1 + (useMax ? range.max : range.min) / 100;
  }

  return price;
};

const historic = defineModel({
  description:
    "Previous Halvings chooses 2 or 3 and defaults to 2. Each week of a cycle takes the min and max percent change across those cycles and compounds them forward from the last halving's price. The early cycles contain very large yearly multiples, and those weeks set the band.",
  maxPrice: ({ currentBlock, settings, week }): number =>
    calculatePrice(currentBlock, week, settings.variable, true),
  minPrice: ({ currentBlock, settings, week }): number =>
    calculatePrice(currentBlock, week, settings.variable, false),
  name: "Historic" as const,
  params: [
    {
      default: 2,
      key: "variable",
      kind: "number",
      label: "Previous Halvings",
      max: 3,
      min: 2,
      step: 1,
    },
  ],
  summary:
    "The floor and the ceiling compound the smallest and largest weekly percent changes from the last 2 or 3 halvings, starting at the last halving's price.",
});

export default historic;
