import memoize from "memoizee";

import { MS_PER_WEEK } from "../../constants";
import { defineModel } from "./define";

const basePriceModel = memoize((currentDate: Date): number => {
  const coefficientA = 18;
  const coefficientB = -495;
  const lnMilliseconds = Math.log(currentDate.getTime());
  return Math.exp(coefficientA * lnMilliseconds + coefficientB);
});

const rainbowChartModel = defineModel({
  description:
    "The ceiling is exp(18 × ln(unix milliseconds) − 495), using the week's unix time. The floor is one tenth of that ceiling. The coefficients and the one-tenth width are fixed, and this model has no setting.",
  maxPrice: ({ now, week }): number => {
    const currentDate = new Date(now + week * MS_PER_WEEK);
    return basePriceModel(currentDate);
  },
  minPrice: ({ now, week }): number => {
    const currentDate = new Date(now + week * MS_PER_WEEK);
    return basePriceModel(currentDate) * 0.1;
  },
  name: "Rainbow Chart" as const,
  params: [],
  summary:
    "The ceiling is exp(18 × ln(unix milliseconds) − 495), and the floor is one tenth of that ceiling.",
});

export default rainbowChartModel;
