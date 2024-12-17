import memoize from "memoizee";

import { MS_PER_WEEK } from "../../constants";
import { type PriceModel } from "../../types";

const basePriceModel = memoize((currentDate: Date): number => {
  const coefficientA = 18;
  const coefficientB = -495;
  const lnMilliseconds = Math.log(currentDate.getTime());
  return Math.exp(coefficientA * lnMilliseconds + coefficientB);
});

const rainbowChartModel = {
  default: 0,
  maxPrice: ({ now, week }): number => {
    const currentDate = new Date(now + week * MS_PER_WEEK);
    return basePriceModel(currentDate);
  },
  minPrice: ({ now, week }): number => {
    const currentDate = new Date(now + week * MS_PER_WEEK);
    return basePriceModel(currentDate) * 0.1;
  },
  modelType: "Rainbow Chart" as const,
  varInput: "",
} satisfies PriceModel;

export default rainbowChartModel;
