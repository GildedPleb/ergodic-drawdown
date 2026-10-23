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
    "The scale 10^-17.3 and the exponent 5.83 are fixed. Shift (years) moves the 2009-01-03 start backward for the ceiling only. It defaults to 6, steps by 0.1, and runs from 0 through 30. At 0 the floor and the ceiling are the same line.",
  maxPrice: ({ now, settings, week }): number => {
    const currentDate = now + week * MS_PER_WEEK;
    return powerLaw(currentDate, settings.yearOffset);
  },
  minPrice: ({ now, week }): number => {
    const currentDate = now + week * MS_PER_WEEK;
    return powerLaw(currentDate, 0);
  },
  name: "Power Law" as const,
  params: [
    {
      default: 6,
      key: "yearOffset",
      kind: "number",
      label: "Shift (years)",
      max: 30,
      min: 0,
      step: 0.1,
    },
  ],
  summary:
    "The floor is 10^-17.3 times days^5.83 from 2009-01-03, and the ceiling is that same curve moved back by Shift (years), which defaults to 6.",
});
export default powerLawModel;
