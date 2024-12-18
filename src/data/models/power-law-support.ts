import memoize from "memoizee";

import { MS_PER_DAY, MS_PER_WEEK } from "../../constants";
import { type PriceModel } from "../../types";

const log10PriceModel = memoize(
  (unixTimeMs: number, coefficient: number, exponent: number): number => {
    const unixStartTime = 1_230_940_800_000;
    const daysSinceStart = (unixTimeMs - unixStartTime) / MS_PER_DAY;
    return 10 ** (coefficient + exponent * Math.log10(daysSinceStart));
  },
);

const log10PriceModelConfig = {
  default: 0,
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
  modelType: "Power Law Support Line" as const,
  rangeMax: Infinity,
  rangeMin: 0,
  varInput: "",
  varRange: false,
} satisfies PriceModel;

export default log10PriceModelConfig;
