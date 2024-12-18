import memoize from "memoizee";

import { MS_PER_DAY, MS_PER_WEEK, MS_PER_YEAR } from "../../constants";
import { type PriceModel } from "../../types";

const powerLaw = memoize((unixTimeMs: number, offsetYears: number): number => {
  const scaleFactor = 10 ** -17.3;
  const unixStartTime = 1_230_940_800_000 - offsetYears * MS_PER_YEAR;
  const daysSinceStart = (unixTimeMs - unixStartTime) / MS_PER_DAY;
  return scaleFactor * daysSinceStart ** 5.83;
});

const powerLawModel = {
  default: 0,
  maxPrice: ({ now, week }): number => {
    const currentDate = now + week * MS_PER_WEEK;
    return powerLaw(currentDate, 6);
  },
  minPrice: ({ now, week }): number => {
    const currentDate = now + week * MS_PER_WEEK;
    return powerLaw(currentDate, 0);
  },
  modelType: "Power Law Regression Median" as const,
  rangeMax: Infinity,
  rangeMin: 0,
  varInput: "",
  varRange: false,
} satisfies PriceModel;
export default powerLawModel;
