import memoize from "memoizee";

import { MS_PER_DAY, MS_PER_WEEK } from "../../constants";
import { defineModel } from "./define";

const log10PriceModel = memoize(
  (unixTimeMs: number, coefficient: number, exponent: number): number => {
    const unixStartTime = 1_230_940_800_000;
    const daysSinceStart = (unixTimeMs - unixStartTime) / MS_PER_DAY;
    return 10 ** (coefficient + exponent * Math.log10(daysSinceStart));
  },
);

const log10PriceModelConfig = defineModel({
  description:
    "The lower line is 10^(-17.928912 + 5.977458 × log10(days since 2009-01-03)), and the upper line is 10^(-12.36333 + 4.699254 × log10(days)). They cross about 62 years after genesis, around 2071, and from there the ceiling is set equal to the floor. This model has no setting.",
  maxPrice: ({ now, week }): number => {
    const currentDate = new Date(now + week * MS_PER_WEEK);
    const min = log10PriceModel(currentDate.getTime(), -17.928_912, 5.977_458);
    const max = log10PriceModel(currentDate.getTime(), -12.363_33, 4.699_254);
    return max < min ? min : max;
  },
  minPrice: ({ now, week }): number => {
    const currentDate = new Date(now + week * MS_PER_WEEK);
    return log10PriceModel(currentDate.getTime(), -17.928_912, 5.977_458);
  },
  name: "Power Law Support Line" as const,
  params: [],
  summary:
    "The floor and the ceiling are two fixed log-price lines, and once the upper line falls through the lower line they are drawn as one line.",
});

export default log10PriceModelConfig;
