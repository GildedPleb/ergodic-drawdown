import memoize from "memoizee";

import { MS_PER_DAY, MS_PER_WEEK, MS_PER_YEAR } from "../../constants";
import { defineModel } from "./define";

const powerLaw = memoize((unixTimeMs: number, offsetYears: number): number => {
  const scaleFactor = 10 ** -17.3;
  const unixStartTime = 1_230_940_800_000 - offsetYears * MS_PER_YEAR;
  const daysSinceStart = (unixTimeMs - unixStartTime) / MS_PER_DAY;
  return scaleFactor * daysSinceStart ** 5.83;
});

const powerLawModel = defineModel({
  description:
    "The scale 10^-17.3 and the exponent 5.83 are fixed. The ceiling uses the same curve with the 2009-01-03 start moved back six years. This model has no setting.",
  maxPrice: ({ now, week }): number => {
    const currentDate = now + week * MS_PER_WEEK;
    return powerLaw(currentDate, 6);
  },
  minPrice: ({ now, week }): number => {
    const currentDate = now + week * MS_PER_WEEK;
    return powerLaw(currentDate, 0);
  },
  name: "Power Law Regression Median" as const,
  params: [],
  summary:
    "The floor is 10^-17.3 times days^5.83 from 2009-01-03, and the ceiling is that same curve with the clock moved back six years.",
});
export default powerLawModel;
