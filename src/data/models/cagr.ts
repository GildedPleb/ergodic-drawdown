import memoize from "memoizee";

import { MS_PER_WEEK, MS_PER_YEAR } from "../../constants";
import { type PriceModel } from "../../types";

const calculateCAGRPrice = memoize(
  (startPrice: number, timeInMs: number, variable: number): number => {
    const years = timeInMs / MS_PER_YEAR;
    return startPrice * (1 + variable / 100) ** years;
  },
);

const cagrModel = {
  default: 50,
  maxPrice: ({ currentPrice, minMaxMultiple, variable, week }): number => {
    const startPrice = currentPrice * minMaxMultiple;
    const targetDate = week * MS_PER_WEEK;
    return calculateCAGRPrice(startPrice, targetDate, variable);
  },
  minPrice: ({ currentPrice, minMaxMultiple, variable, week }): number => {
    const startPrice = currentPrice / minMaxMultiple;
    const targetDate = week * MS_PER_WEEK;
    return calculateCAGRPrice(startPrice, targetDate, variable);
  },
  modelType: "CAGR" as const,
  varInput: "R (%)",
} satisfies PriceModel;

export default cagrModel;
