import type GrowableSharedArray from "../../classes/growable-shared-array";
import { quantile } from "../../helpers";
import { numberAt } from "../../number-at";

export const handleSimulationStats = (
  _signal: AbortSignal,
  _hash: string,
  simulationData: GrowableSharedArray,
): { average: number; median: number } => {
  const finalBalance = simulationData.getLastArray();

  let sum = 0;
  const length = finalBalance.length;

  // Calculate sum
  for (let index = 0; index < length; index++) {
    sum += numberAt(finalBalance, index);
  }
  const average = sum / length;

  // Sort finalBalance in-place
  finalBalance.sort((first, second) => first - second);

  const median = quantile(finalBalance, 0.5);

  return { average, median };
};
