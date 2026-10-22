import memoize from "memoizee";

import { MS_PER_WEEK, MS_PER_YEAR } from "../../constants";
import { defineModel } from "./define";

const calculateCAGRPrice = memoize(
  (startPrice: number, timeInMs: number, variable: number): number => {
    const years = timeInMs / MS_PER_YEAR;
    return startPrice * (1 + variable / 100) ** years;
  },
);

const cagrModel = defineModel({
  description:
    "R (%) is the annual rate, default 20, allowed from 0 through 1000. The ceiling starts at today's price times +/−, and the floor starts at today's price divided by +/−. +/− defaults to 3 and will not go below 1.01. Both bounds then grow at R for the years in the week.",
  maxPrice: ({ currentPrice, settings, week }): number => {
    const startPrice = currentPrice * settings.minMaxMultiple;
    const targetDate = week * MS_PER_WEEK;
    return calculateCAGRPrice(startPrice, targetDate, settings.variable);
  },
  minPrice: ({ currentPrice, settings, week }): number => {
    const startPrice = currentPrice / settings.minMaxMultiple;
    const targetDate = week * MS_PER_WEEK;
    return calculateCAGRPrice(startPrice, targetDate, settings.variable);
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
  ],
  summary:
    "Price grows from today's price at an annual percent, and +/− sets the ceiling by multiplying today's price and the floor by dividing it.",
});

export default cagrModel;
