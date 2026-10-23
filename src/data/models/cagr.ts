import memoize from "memoizee";

import { MS_PER_WEEK, MS_PER_YEAR } from "../../constants";
import { defineModel } from "./define";

const defaultOffset = 0.5;

const calculateCAGRPrice = memoize(
  (startPrice: number, timeInMs: number, variable: number): number => {
    const years = timeInMs / MS_PER_YEAR;
    return startPrice * (1 + variable / 100) ** years;
  },
);

// A bag that never named an offset is the old band, with today in the middle.
const openingPrice = (
  price: number,
  multiple: number,
  offset: number,
  ceiling: boolean,
): number => {
  const value: unknown = offset;
  const placed = typeof value === "number" ? value : defaultOffset;
  return ceiling ? price * multiple ** (2 * (1 - placed)) : price / multiple ** (2 * placed);
};

const cagrModel = defineModel({
  description:
    "R (%) is the annual rate, default 20, allowed from 0 through 1000. +/− defaults to 3 and will not go below 1.01. The ceiling stays 2 × log10(+/−) above the floor. Offset defaults to 0.5, steps by 0.1, and runs from 0 through 1. 0 puts today's price on the floor, 1 puts it on the ceiling, and 0.5 leaves it in the middle. Both bounds then grow at R for the years in the week.",
  maxPrice: ({ currentPrice, settings, week }): number => {
    const startPrice = openingPrice(currentPrice, settings.minMaxMultiple, settings.offset, true);
    return calculateCAGRPrice(startPrice, week * MS_PER_WEEK, settings.variable);
  },
  minPrice: ({ currentPrice, settings, week }): number => {
    const startPrice = openingPrice(currentPrice, settings.minMaxMultiple, settings.offset, false);
    return calculateCAGRPrice(startPrice, week * MS_PER_WEEK, settings.variable);
  },
  name: "CAGR" as const,
  params: [
    {
      default: 20,
      key: "variable",
      kind: "number",
      label: "R (%)",
      max: 1000,
      min: 0,
      step: 1,
    },
    {
      default: 3,
      key: "minMaxMultiple",
      kind: "number",
      label: "+/-",
      max: Infinity,
      min: 1.01,
      step: 0.1,
    },
    {
      default: defaultOffset,
      key: "offset",
      kind: "number",
      label: "Offset",
      max: 1,
      min: 0,
      step: 0.1,
    },
  ],
  summary:
    "Price grows at an annual percent. +/− sets the log width, and Offset places today's price from the floor at 0 to the ceiling at 1, with 0.5 in the middle.",
});

export default cagrModel;
