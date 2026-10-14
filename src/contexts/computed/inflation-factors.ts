import { MAX_WEEKS } from "../../constants";

export const handleInflationFactors = (
  _signal: AbortSignal,
  _hash: string,
  weeklyInflationRate: number,
): Float64Array => {
  const inflations = new Float64Array(MAX_WEEKS);
  for (let index = 0; index < inflations.length; index++) {
    inflations[index] = (1 + weeklyInflationRate) ** index;
  }
  return inflations;
};
